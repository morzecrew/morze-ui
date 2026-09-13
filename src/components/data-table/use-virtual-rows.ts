'use client'

import * as React from 'react'

/* --------------------------------------------------------------------------
   Virtual rows (G-06).

   Every row was laid out by the browser and re-rendered by React on any
   change of state, so a thousand-row load-more list spent its time on rows
   nobody was looking at. Memoising the rows would not have fixed it: a
   column's `cell` is a fresh closure on every render of the host, so a
   memoised row re-renders anyway. Drawing fewer of them does fix it.

   Uniform heights and no react-virtual: the kit carries no date library
   behind its Calendar either, and a fixed row height is arithmetic, not a
   dependency. The cost of that choice is the expanded-row fallback below.
   -------------------------------------------------------------------------- */

/** What a row is tall, per density — the fallback where layout cannot be read. */
const DENSITY_ROW_HEIGHT = { compact: 36, normal: 44, relaxed: 56 } as const
/** Rows drawn above and below the viewport, so a scroll never shows a gap. */
const OVERSCAN = 6
/** The window's first guess, before the scroller has been measured. */
const INITIAL_VIRTUAL_ROWS = 30

export type VirtualizeOption = boolean | { rowHeight?: number; overscan?: number }

export type VirtualRows<T> = {
  /** Measured for the window's arithmetic; the grid keyboard scrolls by it too. */
  theadRef: React.RefObject<HTMLTableSectionElement | null>
  rowHeight: number
  virtualOn: boolean
  /** Index of the first drawn row in `data`. */
  firstRow: number
  rowsInView: T[]
  padTop: number
  padBottom: number
}

export function useVirtualRows<T>({
  virtualize,
  data,
  density,
  expandedCount,
  rootRef,
  scrollerRef,
}: {
  virtualize: VirtualizeOption
  data: T[]
  density: keyof typeof DENSITY_ROW_HEIGHT
  /** Detail panels open right now — see the fallback below. */
  expandedCount: number
  rootRef: React.RefObject<HTMLDivElement | null>
  scrollerRef: React.RefObject<HTMLDivElement | null>
}): VirtualRows<T> {
  const options = virtualize === true ? {} : virtualize || null
  const overscan = options?.overscan ?? OVERSCAN
  const theadRef = React.useRef<HTMLTableSectionElement>(null)
  const [measuredRow, setMeasuredRow] = React.useState(0)
  // `||` and not `??`: an unmeasured row is 0, which is not an answer.
  const rowHeight = options?.rowHeight || measuredRow || DENSITY_ROW_HEIGHT[density]
  // An open detail panel is a row of a height this arithmetic does not know,
  // so the window is given up rather than left to drift.
  const virtualOn = Boolean(options) && expandedCount === 0 && data.length > 0
  const [range, setRange] = React.useState({ start: 0, end: INITIAL_VIRTUAL_ROWS })

  // Measured from a row the table actually drew, so a host whose rows are
  // taller than the density says still gets the arithmetic it needs. The
  // density's own figure stands in for a DOM without layout.
  const fixedHeight = options?.rowHeight
  React.useEffect(() => {
    if (!virtualOn || fixedHeight) return
    const drawn = rootRef.current?.querySelector<HTMLElement>('.mz-dt__row')?.offsetHeight ?? 0
    if (drawn > 0 && drawn !== measuredRow) setMeasuredRow(drawn)
  }, [virtualOn, fixedHeight, density, measuredRow, data.length, rootRef])

  React.useEffect(() => {
    const scroller = scrollerRef.current
    if (!virtualOn || !scroller) return
    const update = () => {
      // The header is sticky but still occupies its place in the flow, so the
      // rows begin one header below the top of the scrollable content.
      const head = theadRef.current?.offsetHeight ?? 0
      const top = Math.max(0, scroller.scrollTop - head)
      const start = Math.max(0, Math.floor(top / rowHeight) - overscan)
      const end = Math.min(
        data.length,
        Math.ceil((top + scroller.clientHeight) / rowHeight) + overscan
      )
      // Nothing but the window is written from here, and only when it really
      // moved: a fresh object per scroll frame is what once fed the scroller's
      // own observer into a render loop (FIXES.md).
      setRange((current) =>
        current.start === start && current.end === end ? current : { start, end }
      )
    }
    update()
    scroller.addEventListener('scroll', update, { passive: true })
    const observer = new ResizeObserver(update)
    observer.observe(scroller)
    return () => {
      scroller.removeEventListener('scroll', update)
      observer.disconnect()
    }
  }, [virtualOn, rowHeight, overscan, data.length, scrollerRef])

  const firstRow = virtualOn ? Math.min(range.start, Math.max(0, data.length - 1)) : 0
  const rowsInView = virtualOn ? data.slice(firstRow, Math.max(range.end, firstRow)) : data

  return {
    theadRef,
    rowHeight,
    virtualOn,
    firstRow,
    rowsInView,
    padTop: firstRow * rowHeight,
    padBottom: Math.max(0, (data.length - firstRow - rowsInView.length) * rowHeight),
  }
}
