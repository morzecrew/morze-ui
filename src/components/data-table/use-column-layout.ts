'use client'

import * as React from 'react'

import type { ColumnLayout, DataTableColumn } from './types'

const DEFAULT_WIDTH = 168
const DEFAULT_MIN = 72

// Separators no column id can contain, so two different column sets cannot
// flatten to the same signature.
const FIELD_SEPARATOR = String.fromCharCode(0)
const COLUMN_SEPARATOR = String.fromCharCode(1)

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
  // `columns` is almost always an array literal in the caller's render, so its
  // identity changes on every render even when nothing about the columns did.
  // Keying the baseline on that identity made the effect below commit a fresh
  // layout object every render; inside <DataTable> the prop held it still, but
  // a host calling this hook directly re-rendered itself in an unbroken loop.
  // The baseline is built from three fields, so those are what it is keyed on.
  const signature = columns
    .map((c) => [c.id, c.width ?? '', c.pinned ?? ''].join(FIELD_SEPARATOR))
    .join(COLUMN_SEPARATOR)

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [signature]
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

  // The layout as the host or storage holds it, before auto-fit has its say.
  const base = React.useMemo(
    () => (controlled ? merge(baseline, controlled, baseline) : internal),
    [controlled, internal, baseline]
  )

  // The widths auto-fit derived from the container, kept apart from the layout
  // on purpose. Fit is a function of the viewport: it is never stored, never
  // reported to the host, and so never has to be controlled. It used to be
  // written into `internal`, which the controlled branch above does not read —
  // a host that owned the layout got no auto-fit at all — and on the
  // uncontrolled branch the fitted widths rode into storage with the next
  // user action, so a saved layout depended on the last window it was fitted
  // in. The overlay covers flexible columns only; one the user sized by hand
  // keeps the width the layout holds.
  const [fitted, setFitted] = React.useState<Record<string, number>>({})
  // Bumped by `reset`: every column is flexible again and nothing about the
  // container or the column set has changed, so nothing else would trigger the
  // fit that has to follow.
  const [fitEpoch, setFitEpoch] = React.useState(0)

  const layout = React.useMemo(() => overlayFit(base, fitted), [base, fitted])

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

  // The base layout as of the last commit, for `fitTo`: it runs from a
  // ResizeObserver and may not close over one render's layout.
  const baseRef = React.useRef(base)
  React.useEffect(() => {
    baseRef.current = base
  }, [base])

  const update = React.useCallback(
    (patch: (current: ColumnLayout) => ColumnLayout, options?: { persist?: boolean }) => {
      const current = controlled ? merge(baseline, controlled, baseline) : internalRef.current
      const next = patch(current)
      if (next === current) return
      internalRef.current = next
      if (!controlled) baseRef.current = next
      setInternal(next)
      // Storage and the host callback are effects of the change, not part of
      // computing it. React may run a state updater more than once for a single
      // commit — under StrictMode it always does — which wrote the layout twice
      // and reported one user action to the host twice.
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
  // `columns` is nearly always a fresh array per render, so `byId` is too. The
  // fit reads it through a ref, which keeps `fitTo` stable: the table hands it
  // to a ResizeObserver as an effect dependency, and re-subscribing on every
  // render also threw away the fit-cycle history that effect keeps.
  const byIdRef = React.useRef(byId)
  React.useEffect(() => {
    byIdRef.current = byId
  })

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
   * dead space at the right edge on a wide screen. Widths are always derived
   * from the declared ones rather than the current ones, so the result depends
   * only on the container: growing and shrinking the window returns to the
   * same layout instead of drifting. When even the declared widths do not fit,
   * they are used as-is and the table scrolls sideways.
   *
   * The result lands in the fit overlay, not in the layout — see `fitted`.
   * Stable identity: the DataTable observes the container with it as an
   * effect dependency.
   */
  const fitTo = React.useCallback((available: number) => {
    const current = baseRef.current
    const columnsById = byIdRef.current
    const shown = current.order
      .map((id) => columnsById.get(id))
      .filter((c): c is DataTableColumn<T> => Boolean(c) && !current.hidden.includes(c!.id))
    if (!shown.length || available <= 0) return

    const baseOf = (c: DataTableColumn<T>) => c.width ?? DEFAULT_WIDTH
    const isFlexible = (c: DataTableColumn<T>) =>
      c.flex !== false && !current.sized.includes(c.id)

    const flexible = shown.filter(isFlexible)
    if (!flexible.length) return

    const fixedTotal = shown
      .filter((c) => !isFlexible(c))
      .reduce((sum, c) => sum + (current.widths[c.id] ?? baseOf(c)), 0)
    const flexBaseTotal = flexible.reduce((sum, c) => sum + baseOf(c), 0)
    const target = available - fixedTotal

    const next: Record<string, number> = {}

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

    // Identity-stable when nothing moved: the caller is an observer, and a
    // fresh object per tick is how an observer and React re-render each other.
    setFitted((previous) => (sameWidths(previous, next) ? previous : next))
  }, [])

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
    /** Changes whenever the fit has to run again for a reason the container cannot see. */
    fitEpoch,

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
    reset: () => {
      update(() => baseline)
      setFitEpoch((epoch) => epoch + 1)
    },
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

/** The fitted widths laid over the layout, for the columns the fit still governs. */
function overlayFit(layout: ColumnLayout, fitted: Record<string, number>): ColumnLayout {
  const entries = Object.entries(fitted).filter(
    ([id]) => id in layout.widths && !layout.sized.includes(id)
  )
  if (!entries.length) return layout
  return { ...layout, widths: { ...layout.widths, ...Object.fromEntries(entries) } }
}

function sameWidths(a: Record<string, number>, b: Record<string, number>) {
  const keys = Object.keys(a)
  return keys.length === Object.keys(b).length && keys.every((key) => a[key] === b[key])
}
