'use client'

import * as React from 'react'

import type { ColumnLayout, DataTableColumn } from './types'

const DEFAULT_WIDTH = 168
const DEFAULT_MIN = 72

function readStored(key: string | null): Partial<ColumnLayout> | null {
  if (!key || typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as Partial<ColumnLayout>) : null
  } catch {
    return null
  }
}

function writeStored(key: string | null, layout: ColumnLayout) {
  if (!key || typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, JSON.stringify(layout))
  } catch {
    /* blocked storage — the layout simply does not persist */
  }
}

export type UseColumnLayoutOptions<T> = {
  columns: DataTableColumn<T>[]
  /** localStorage key for widths, order, visibility and pinning. */
  persistKey?: string | null
  layout?: Partial<ColumnLayout>
  onLayoutChange?: (layout: ColumnLayout) => void
}

export function useColumnLayout<T>({
  columns,
  persistKey = null,
  layout: controlled,
  onLayoutChange,
}: UseColumnLayoutOptions<T>) {
  const baseline = React.useMemo<ColumnLayout>(
    () => ({
      order: columns.map((c) => c.id),
      hidden: [],
      widths: Object.fromEntries(
        columns.map((c) => [c.id, c.width ?? DEFAULT_WIDTH])
      ) as Record<string, number>,
      pinned: Object.fromEntries(columns.map((c) => [c.id, c.pinned])) as ColumnLayout['pinned'],
      sized: [],
    }),
    [columns]
  )

  const [internal, setInternal] = React.useState<ColumnLayout>(baseline)

  // Stored layout is applied after mount so the first client render matches SSR.
  React.useEffect(() => {
    const stored = readStored(persistKey)
    if (stored) setInternal((current) => merge(current, stored, baseline))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persistKey])

  // A column added or removed in code must not be stranded by a stale layout.
  React.useEffect(() => {
    setInternal((current) => merge(baseline, current, baseline))
  }, [baseline])

  const layout = React.useMemo(
    () => (controlled ? merge(baseline, controlled, baseline) : internal),
    [controlled, internal, baseline]
  )

  // Kept current after every commit, so `update` — and the `fitTo` the table
  // hands to a ResizeObserver as an effect dependency — keep a stable identity
  // even when the host passes a fresh callback on every render.
  const onLayoutChangeRef = React.useRef(onLayoutChange)
  React.useEffect(() => {
    onLayoutChangeRef.current = onLayoutChange
  })

  // Mirrors the committed layout so the next one can be derived outside the
  // state updater. Assigned eagerly in `update` too, so two calls in the same
  // tick still build on each other rather than on a stale snapshot.
  const internalRef = React.useRef(internal)
  React.useEffect(() => {
    internalRef.current = internal
  }, [internal])

  const update = React.useCallback(
    (patch: (current: ColumnLayout) => ColumnLayout, options?: { persist?: boolean }) => {
      const base = controlled ? merge(baseline, controlled, baseline) : internalRef.current
      const next = patch(base)
      if (next === base) return
      internalRef.current = next
      setInternal(next)
      // Storage and the host callback are effects of the change, not part of
      // computing it. React may run a state updater more than once for a single
      // commit — under StrictMode it always does — which wrote the layout twice
      // and reported one user action to the host twice.
      // Auto-fit is derived from the container, so it is never stored:
      // otherwise the saved widths would depend on the last viewport used.
      if (options?.persist !== false) {
        writeStored(persistKey, next)
        onLayoutChangeRef.current?.(next)
      }
    },
    [controlled, baseline, persistKey]
  )

  const byId = React.useMemo(
    () => new Map(columns.map((c) => [c.id, c])),
    [columns]
  )

  /** Visible columns in display order, pinned edges first and last. */
  const visible = React.useMemo(() => {
    const ordered = layout.order
      .map((id) => byId.get(id))
      .filter((c): c is DataTableColumn<T> => Boolean(c) && !layout.hidden.includes(c!.id))
    const side = (id: string) => layout.pinned[id]
    return [
      ...ordered.filter((c) => side(c.id) === 'left'),
      ...ordered.filter((c) => !side(c.id)),
      ...ordered.filter((c) => side(c.id) === 'right'),
    ]
  }, [layout, byId])

  const widthOf = React.useCallback(
    (id: string) => layout.widths[id] ?? byId.get(id)?.width ?? DEFAULT_WIDTH,
    [layout.widths, byId]
  )

  const minWidthOf = React.useCallback(
    (id: string) => byId.get(id)?.minWidth ?? DEFAULT_MIN,
    [byId]
  )

  /**
   * Stretches the flexible columns so the row fills `available` exactly — no
   * gap at the right edge on a wide screen. When even the minimum widths do
   * not fit, nothing is touched and the table scrolls sideways instead.
   * Memoised: the DataTable observes the container with it as an effect dep.
   */
  /**
   * Stretches the flexible columns so the row fills `available` exactly — no
   * dead space at the right edge on a wide screen. Widths are always derived
   * from the declared ones rather than the current ones, so the result depends
   * only on the container: growing and shrinking the window returns to the
   * same layout instead of drifting. When even the declared widths do not fit,
   * they are used as-is and the table scrolls sideways.
   * Memoised — the DataTable observes the container with it as an effect dep.
   */
  const fitTo = React.useCallback(
    (available: number) =>
      update(
        (current) => {
          const shown = current.order
            .map((id) => byId.get(id))
            .filter((c): c is DataTableColumn<T> => Boolean(c) && !current.hidden.includes(c!.id))
          if (!shown.length || available <= 0) return current

          const baseOf = (c: DataTableColumn<T>) => c.width ?? DEFAULT_WIDTH
          const isFlexible = (c: DataTableColumn<T>) =>
            c.flex !== false && !current.sized.includes(c.id)

          const flexible = shown.filter(isFlexible)
          if (!flexible.length) return current

          const fixedTotal = shown
            .filter((c) => !isFlexible(c))
            .reduce((sum, c) => sum + (current.widths[c.id] ?? baseOf(c)), 0)
          const flexBaseTotal = flexible.reduce((sum, c) => sum + baseOf(c), 0)
          const target = available - fixedTotal

          const next: Record<string, number> = { ...current.widths }

          // Not enough room even at the declared widths — fall back to them and
          // let the scroller do its job.
          if (target <= flexBaseTotal) {
            for (const column of flexible) {
              next[column.id] = Math.max(baseOf(column), column.minWidth ?? DEFAULT_MIN)
            }
          } else {
            let remaining = target
            let pool = flexBaseTotal
            const growing = [...flexible]

            // Columns pinned by min/max hand their surplus back, so the row
            // still adds up to `available` once the bounds are honoured.
            for (let pass = 0; pass < 3 && growing.length; pass += 1) {
              const scale = remaining / pool
              const clamped: DataTableColumn<T>[] = []
              for (const column of growing) {
                const min = column.minWidth ?? DEFAULT_MIN
                const max = column.maxWidth ?? Infinity
                const scaled = baseOf(column) * scale
                const bounded = Math.min(Math.max(scaled, min), max)
                if (bounded !== scaled) {
                  next[column.id] = Math.round(bounded)
                  remaining -= bounded
                  pool -= baseOf(column)
                  clamped.push(column)
                }
              }
              if (!clamped.length) break
              growing.splice(0, growing.length, ...growing.filter((c) => !clamped.includes(c)))
            }

            if (growing.length) {
              const scale = remaining / pool
              let used = 0
              growing.forEach((column, index) => {
                if (index === growing.length - 1) {
                  // Last column swallows the rounding error so the sum is exact.
                  next[column.id] = Math.round(remaining - used)
                } else {
                  const width = Math.round(baseOf(column) * scale)
                  next[column.id] = width
                  used += width
                }
              })
            }
          }

          const changed = shown.some(
            (c) => Math.abs((next[c.id] ?? 0) - (current.widths[c.id] ?? baseOf(c))) > 0.5
          )
          return changed ? { ...current, widths: next } : current
        },
        { persist: false }
      ),
    [update, byId]
  )

  return {
    layout,
    visible,
    widthOf,
    minWidthOf,
    setWidth: (id: string, width: number) =>
      update((c) => ({
        ...c,
        widths: { ...c.widths, [id]: width },
        sized: c.sized.includes(id) ? c.sized : [...c.sized, id],
      })),

    fitTo,

    toggleHidden: (id: string) =>
      update((c) => ({
        ...c,
        hidden: c.hidden.includes(id) ? c.hidden.filter((h) => h !== id) : [...c.hidden, id],
      })),
    setPinned: (id: string, side: 'left' | 'right' | undefined) =>
      update((c) => ({ ...c, pinned: { ...c.pinned, [id]: side } })),
    move: (id: string, delta: number) =>
      update((c) => {
        const order = [...c.order]
        const from = order.indexOf(id)
        const to = Math.min(Math.max(from + delta, 0), order.length - 1)
        if (from < 0 || from === to) return c
        order.splice(to, 0, ...order.splice(from, 1))
        return { ...c, order }
      }),
    moveTo: (id: string, targetId: string) =>
      update((c) => {
        const order = [...c.order]
        const from = order.indexOf(id)
        const to = order.indexOf(targetId)
        if (from < 0 || to < 0 || from === to) return c
        order.splice(to, 0, ...order.splice(from, 1))
        return { ...c, order }
      }),
    reset: () => update(() => baseline),
  }
}

function merge(base: ColumnLayout, patch: Partial<ColumnLayout>, fallback: ColumnLayout): ColumnLayout {
  const known = new Set(fallback.order)
  const order = [
    ...(patch.order ?? base.order).filter((id) => known.has(id)),
    ...fallback.order.filter((id) => !(patch.order ?? base.order).includes(id)),
  ]
  return {
    order,
    hidden: (patch.hidden ?? base.hidden).filter((id) => known.has(id)),
    widths: { ...fallback.widths, ...base.widths, ...patch.widths },
    pinned: { ...fallback.pinned, ...base.pinned, ...patch.pinned },
    sized: (patch.sized ?? base.sized ?? []).filter((id) => known.has(id)),
  }
}
