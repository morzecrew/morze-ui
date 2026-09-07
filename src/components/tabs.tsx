'use client'

import * as React from 'react'
import { Tabs as TabsPrimitive } from 'radix-ui'

import { cn, type Tone } from '../lib/utils'
import { ChevronDownIcon, EllipsisIcon } from '../lib/icons'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './dropdown-menu'

function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root data-slot="tabs" className={cn('mz-tabs', className)} {...props} />
}

type TabsListProps = React.ComponentProps<typeof TabsPrimitive.List> & {
  variant?: 'default' | 'line'
  tone?: Tone
  /**
   * What a row of tabs does when it runs out of room.
   *
   * `wrap` (default) lets it flow onto a second line, `scroll` keeps one line
   * and scrolls it, and `menu` keeps one line and collapses whatever does not
   * fit into a trailing "More" menu.
   */
  overflow?: 'wrap' | 'scroll' | 'menu'
  /** Label on the collapsed-tabs button. Only read when `overflow="menu"`. */
  overflowLabel?: string
}

function TabsList({ overflow = 'wrap', overflowLabel, ...props }: TabsListProps) {
  if (overflow === 'menu') {
    return <TabsListWithMenu overflowLabel={overflowLabel} {...props} />
  }
  return <PlainTabsList overflow={overflow} {...props} />
}

function PlainTabsList({
  className,
  variant = 'default',
  tone,
  overflow = 'wrap',
  ...props
}: Omit<TabsListProps, 'overflowLabel'>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      data-tone={tone}
      data-overflow={overflow}
      className={cn(
        'mz-tabs-list',
        variant === 'line' && 'mz-tabs-list--line',
        overflow === 'scroll' && 'mz-tabs-list--scroll',
        className
      )}
      {...props}
    />
  )
}

/**
 * The `overflow="menu"` list.
 *
 * Every trigger stays mounted inside the real `TabsList`: Radix wires them
 * into one roving-focus group, and a trigger rendered outside it throws. The
 * ones that do not fit are given `display: none`, which takes them out of the
 * tab order and the accessibility tree — a tab you cannot see should not be a
 * tab you can reach — and the menu activates them by dispatching the event
 * Radix actually listens for.
 *
 * Widths are measured off a mirror row of inert spans rather than the
 * triggers, because a hidden trigger measures zero and a second row of real
 * triggers would duplicate every `value` in the group.
 */
function TabsListWithMenu({
  className,
  variant = 'default',
  tone,
  overflowLabel = 'More',
  children,
  ...props
}: Omit<TabsListProps, 'overflow'>) {
  const items = React.useMemo(
    () => React.Children.toArray(children).filter(React.isValidElement),
    [children]
  )

  const containerRef = React.useRef<HTMLDivElement>(null)
  const triggerRefs = React.useRef<Array<HTMLElement | null>>([])
  const mirrorRefs = React.useRef<Array<HTMLElement | null>>([])

  const [containerWidth, setContainerWidth] = React.useState(0)
  const [widths, setWidths] = React.useState<number[]>([])

  React.useEffect(() => {
    const el = containerRef.current
    if (!el) return
    setContainerWidth(el.getBoundingClientRect().width)
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) setContainerWidth(entry.contentRect.width)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  React.useLayoutEffect(() => {
    // React nulls a removed child's ref slot but never shortens the array. Left
    // alone, a shrunken tab set keeps stale trailing entries, the measured
    // length stops matching the tab count, and the guard in `visibleCount`
    // switches the collapse off for good.
    mirrorRefs.current.length = items.length
    triggerRefs.current.length = items.length

    const measured = mirrorRefs.current.map((el) => (el ? Math.ceil(el.getBoundingClientRect().width) : 0))
    setWidths((prev) =>
      prev.length === measured.length && prev.every((w, i) => w === measured[i]) ? prev : measured
    )
  }, [items])

  const visibleCount = React.useMemo(() => {
    if (!containerWidth || widths.length !== items.length) return items.length
    const total = widths.reduce((sum, w) => sum + w, 0)
    if (total <= containerWidth) return items.length

    // Room for the menu button has to come out of the budget, or the last tab
    // to fit would push the button that reveals the rest off the edge.
    let used = 0
    let count = 0
    for (const width of widths) {
      if (used + width + OVERFLOW_BUTTON_WIDTH > containerWidth) break
      used += width
      count++
    }
    return count
  }, [containerWidth, widths, items.length])

  const hidden = items.slice(visibleCount)
  // Where the active tab ended up: if it is inside the menu, the button says so
  // rather than leaving the row looking as if nothing is selected.
  const activeIsHidden = hidden.some((_, i) =>
    triggerRefs.current[visibleCount + i]?.dataset.state === 'active'
  )

  return (
    <div ref={containerRef} className="mz-tabs-list-wrap">
      <div className="mz-tabs-list__mirror" aria-hidden="true">
        {items.map((item, i) => (
          <span
            key={i}
            className="mz-tabs-trigger"
            ref={(el) => {
              mirrorRefs.current[i] = el
            }}
          >
            {(item.props as { children?: React.ReactNode }).children}
          </span>
        ))}
      </div>

      <TabsPrimitive.List
        data-slot="tabs-list"
        data-variant={variant}
        data-tone={tone}
        data-overflow="menu"
        className={cn(
          'mz-tabs-list mz-tabs-list--menu',
          variant === 'line' && 'mz-tabs-list--line',
          className
        )}
        {...props}
      >
        {items.map((item, i) =>
          React.cloneElement(item as React.ReactElement<Record<string, unknown>>, {
            key: i,
            ref: (el: HTMLElement | null) => {
              triggerRefs.current[i] = el
            },
            style: {
              ...((item.props as { style?: React.CSSProperties }).style ?? {}),
              ...(i >= visibleCount ? { display: 'none' } : null),
            },
          })
        )}

        {hidden.length > 0 ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                data-slot="tabs-overflow-trigger"
                data-active={activeIsHidden || undefined}
                className="mz-tabs-trigger mz-tabs-overflow mz-focusable"
                aria-label={`${overflowLabel} (${hidden.length})`}
              >
                <EllipsisIcon className="mz-tabs-overflow__icon" />
                <span className="mz-tabs-overflow__label">
                  {overflowLabel} ({hidden.length})
                </span>
                <ChevronDownIcon className="mz-tabs-overflow__caret" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {hidden.map((item, i) => (
                <DropdownMenuItem
                  key={i}
                  onSelect={() => {
                    // Radix Tabs selects on mousedown, not click, so `.click()`
                    // does nothing here. The trigger is display:none but still
                    // in the DOM, and a dispatched event bubbles to React's
                    // root listener the same way a real one would.
                    triggerRefs.current[visibleCount + i]?.dispatchEvent(
                      new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0 })
                    )
                  }}
                >
                  {(item.props as { children?: React.ReactNode }).children}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </TabsPrimitive.List>
    </div>
  )
}

/** Width reserved for the "More (N)" button while deciding what fits. */
const OVERFLOW_BUTTON_WIDTH = 116

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn('mz-tabs-trigger mz-focusable', className)}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn('mz-tabs-content', className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
export type { TabsListProps }
