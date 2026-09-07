'use client'

import * as React from 'react'

import { cn } from '../lib/utils'

/**
 * Chart theming, without a charting dependency.
 *
 * The kit does not draw charts — recharts, visx, uPlot and friends already do,
 * and none of them should be baked into a component kit. What is missing from
 * all of them is the part a design system owns: one place that names the
 * series, gives each a colour that follows the theme, and dresses the tooltip
 * and legend so they read like the rest of the interface.
 *
 * `ChartContainer` publishes each series colour as a CSS custom property
 * scoped to itself, so any library that accepts a CSS colour can consume it:
 *
 *   const config = {
 *     shipped: { label: 'Shipped', color: 'var(--mz-primary)' },
 *     returned: { label: 'Returned', theme: { light: '#c2410c', dark: '#fb923c' } },
 *   } satisfies ChartConfig
 *
 *   <ChartContainer config={config} className="h-64">
 *     <ResponsiveContainer>
 *       <BarChart data={rows}>
 *         <Bar dataKey="shipped" fill="var(--color-shipped)" />
 *         <Tooltip content={<ChartTooltipContent />} />
 *       </BarChart>
 *     </ResponsiveContainer>
 *   </ChartContainer>
 *
 * The responsive wrapper stays the host's: sizing belongs to the charting
 * library, and a container that owned it would only work with one of them.
 */
export type ChartSeriesConfig = {
  label?: React.ReactNode
  icon?: React.ComponentType<{ className?: string }>
} & ({ color?: string; theme?: never } | { color?: never; theme: { light: string; dark: string } })

export type ChartConfig = Record<string, ChartSeriesConfig>

type ChartContextValue = { config: ChartConfig }

const ChartContext = React.createContext<ChartContextValue | null>(null)

function useChart() {
  const context = React.useContext(ChartContext)
  if (!context) throw new Error('useChart must be used inside a <ChartContainer>')
  return context
}

/**
 * The `<style>` element that binds the config to one container.
 *
 * The rules are keyed on the kit's theme selectors as well as `.dark`, so the
 * colours follow both a `MorzeThemeProvider` and a host that toggles a class
 * of its own. Values are filtered to plain CSS colours before they are
 * interpolated — a config is data, and data ends up coming from a server.
 */
function ChartStyle({ id, config }: { id: string; config: ChartConfig }) {
  const entries = Object.entries(config).filter(([, item]) => item.theme || item.color)
  if (entries.length === 0) return null

  const block = (theme: 'light' | 'dark') =>
    entries
      .map(([key, item]) => {
        const color = item.theme ? item.theme[theme] : item.color
        return color && isSafeColor(color) ? `  --color-${cssIdent(key)}: ${color};` : null
      })
      .filter(Boolean)
      .join('\n')

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: [
          `[data-chart='${id}'] {\n${block('light')}\n}`,
          `[data-mz-theme='dark'] [data-chart='${id}'],`,
          `.mz-theme-dark [data-chart='${id}'],`,
          `.dark [data-chart='${id}'] {\n${block('dark')}\n}`,
        ].join('\n'),
      }}
    />
  )
}

function ChartContainer({
  id,
  className,
  children,
  config,
  ...props
}: React.ComponentProps<'div'> & { config: ChartConfig }) {
  const uid = React.useId()
  const chartId = `mz-chart-${(id ?? uid).replace(/:/g, '')}`

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-slot="chart"
        data-chart={chartId}
        className={cn('mz-chart', className)}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        {children}
      </div>
    </ChartContext.Provider>
  )
}

/* --------------------------- tooltip and legend --------------------------- */

/**
 * One series at one point, in the shape charting libraries hand to a custom
 * tooltip. Typed structurally on purpose: it matches recharts without the kit
 * importing it, and anything with the same fields works too.
 */
export type ChartPayloadItem = {
  dataKey?: string | number
  name?: string | number
  value?: number | string
  color?: string
  fill?: string
  payload?: Record<string, unknown>
}

/**
 * Which entry of the config a payload item belongs to.
 *
 * The obvious answer is `dataKey`, and for a bar or a line it is right. A pie
 * or a donut is the exception: every slice comes from one series, and what
 * separates them is a field *inside* the datum — hence `nameKey`, which names
 * that field. The value found there is the config key, so the lookup falls
 * through the item and then the datum behind it.
 */
function configKeyOf(item: ChartPayloadItem, explicitKey: string | undefined, fallback: string) {
  if (!explicitKey) return fallback
  const fromItem = (item as Record<string, unknown>)[explicitKey]
  if (typeof fromItem === 'string') return fromItem
  const fromDatum = item.payload?.[explicitKey]
  if (typeof fromDatum === 'string') return fromDatum
  return explicitKey
}

export type ChartTooltipContentProps = {
  active?: boolean
  payload?: ChartPayloadItem[]
  label?: React.ReactNode
  /** Renders the group heading; receives the raw label and the payload. */
  labelFormatter?: (label: React.ReactNode, payload: ChartPayloadItem[]) => React.ReactNode
  formatter?: (
    value: ChartPayloadItem['value'],
    name: React.ReactNode,
    item: ChartPayloadItem
  ) => React.ReactNode
  hideLabel?: boolean
  hideIndicator?: boolean
  indicator?: 'dot' | 'line' | 'dashed'
  /** Field naming each item's series — for charts keyed inside the datum. */
  nameKey?: string
  /** Same, for the group heading. */
  labelKey?: string
  className?: string
}

function ChartTooltipContent({
  active,
  payload = [],
  label,
  labelFormatter,
  formatter,
  hideLabel = false,
  hideIndicator = false,
  indicator = 'dot',
  nameKey,
  labelKey,
  className,
}: ChartTooltipContentProps) {
  const { config } = useChart()

  if (!active || payload.length === 0) return null

  const first = payload[0]
  const labelled =
    labelKey && first ? config[configKeyOf(first, labelKey, labelKey)]?.label : undefined
  const rawLabel =
    labelled ?? (typeof label === 'string' ? (config[label]?.label ?? label) : label)
  const heading = labelFormatter ? labelFormatter(rawLabel, payload) : rawLabel

  return (
    <div data-slot="chart-tooltip" className={cn('mz-panel mz-chart__tooltip', className)}>
      {!hideLabel && heading != null ? (
        <div className="mz-chart__tooltip-label">{heading}</div>
      ) : null}
      <div className="mz-chart__tooltip-items">
        {payload.map((item, index) => {
          const key = configKeyOf(item, nameKey, String(item.dataKey ?? item.name ?? index))
          const series = config[key]
          const color = item.color ?? item.fill ?? `var(--color-${cssIdent(key)})`
          const name = series?.label ?? item.name ?? key

          return (
            <div key={key + index} className="mz-chart__tooltip-item">
              {!hideIndicator ? (
                series?.icon ? (
                  <series.icon className="mz-chart__tooltip-icon" />
                ) : (
                  <span
                    className={cn('mz-chart__swatch', `mz-chart__swatch--${indicator}`)}
                    style={{ '--mz-chart-color': color } as React.CSSProperties}
                  />
                )
              ) : null}
              <span className="mz-chart__tooltip-name">{name}</span>
              <span className="mz-chart__tooltip-value">
                {formatter ? formatter(item.value, name, item) : item.value}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export type ChartLegendContentProps = {
  payload?: ChartPayloadItem[]
  hideIcon?: boolean
  /** Field naming each item's series — see `ChartTooltipContentProps`. */
  nameKey?: string
  className?: string
}

function ChartLegendContent({
  payload = [],
  hideIcon = false,
  nameKey,
  className,
}: ChartLegendContentProps) {
  const { config } = useChart()
  if (payload.length === 0) return null

  return (
    <div data-slot="chart-legend" className={cn('mz-chart__legend', className)}>
      {payload.map((item, index) => {
        const key = configKeyOf(item, nameKey, String(item.dataKey ?? item.name ?? index))
        const series = config[key]
        const color = item.color ?? item.fill ?? `var(--color-${cssIdent(key)})`

        return (
          <div key={key + index} className="mz-chart__legend-item">
            {!hideIcon ? (
              series?.icon ? (
                <series.icon className="mz-chart__tooltip-icon" />
              ) : (
                <span
                  className="mz-chart__swatch mz-chart__swatch--dot"
                  style={{ '--mz-chart-color': color } as React.CSSProperties}
                />
              )
            ) : null}
            {series?.label ?? item.name ?? key}
          </div>
        )
      })}
    </div>
  )
}

/* --------------------------------------------------------------------------- */

/** Keys become custom property names, so anything but the safe set is dropped. */
function cssIdent(key: string): string {
  return key.replace(/[^a-zA-Z0-9_-]/g, '-')
}

/**
 * A config value is interpolated into a stylesheet, so it is checked rather
 * than trusted: hex, the CSS colour functions, a custom property reference, or
 * a bare keyword. Anything containing a brace, a semicolon or a `url(` — the
 * shapes that would end the declaration and start a rule of their own — is
 * refused.
 */
function isSafeColor(value: string): boolean {
  if (value.length > 128) return false
  if (/[;{}<>\\]/.test(value)) return false
  if (/url\s*\(|expression\s*\(|@import/i.test(value)) return false
  return /^(#[0-9a-f]{3,8}|(rgb|rgba|hsl|hsla|oklch|oklab|lab|lch|color|color-mix|var)\s*\(.*\)|[a-z-]+)$/i.test(
    value.trim()
  )
}

export { ChartContainer, ChartStyle, ChartTooltipContent, ChartLegendContent, useChart }
