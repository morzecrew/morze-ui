'use client'

import * as React from 'react'

import type { DataTableColumn } from './types'

/* --------------------------------------------------------------------------
   The table's keyboard (G-01).

   A clickable row could not be reached from the keyboard at all, and an
   editable cell opened on a double click alone: for anyone not using a
   pointer the table was readable and nothing else.

   Two halves, and only the larger one is opt-in. Without `keyboard`, a
   clickable row is a tab stop of its own and answers Enter — that lives on
   the row itself, in `data-table.tsx`, because it changes no roles. With it,
   the body becomes a grid: one roving tab stop over the cells, arrows to move
   it, Enter or F2 to edit, Enter to activate the row, Space to tick it.
   -------------------------------------------------------------------------- */

/** Rows a PageUp/PageDown jumps inside the grid. */
const GRID_PAGE = 10

type Position = { row: number; col: number }
type Bounds = { lastRow: number; lastCol: number; ctrl: boolean }

/**
 * Where each navigation key goes from where the focus is now. A table rather
 * than a switch: the keys differ only in the arithmetic, and spelling that as
 * ten cases made one function answer for the whole keyboard.
 */
const MOVES: Record<string, (at: Position, bounds: Bounds) => Position> = {
  ArrowRight: ({ row, col }) => ({ row, col: col + 1 }),
  ArrowLeft: ({ row, col }) => ({ row, col: col - 1 }),
  ArrowDown: ({ row, col }) => ({ row: row + 1, col }),
  ArrowUp: ({ row, col }) => ({ row: row - 1, col }),
  PageDown: ({ row, col }) => ({ row: row + GRID_PAGE, col }),
  PageUp: ({ row, col }) => ({ row: row - GRID_PAGE, col }),
  // Ctrl takes Home and End to the corners of the grid rather than of the row.
  Home: ({ row }, { ctrl }) => ({ row: ctrl ? 0 : row, col: 0 }),
  End: ({ row }, { ctrl, lastRow, lastCol }) => ({ row: ctrl ? lastRow : row, col: lastCol }),
}

/** The navigable columns, in the order the table draws them. */
type GridColumn<T> =
  | { kind: 'select' }
  | { kind: 'expand' }
  | { kind: 'column'; column: DataTableColumn<T> }

export type GridKeyboard<T> = {
  /** Spread onto the `<table>`; empty when the grid is off. */
  gridProps: React.HTMLAttributes<HTMLTableElement>
  /** Attributes for one body cell — nothing at all when the grid is off. */
  gridCell: (row: number, col: number) => Record<string, unknown> | undefined
  /** Closes the editor and gives the cell its focus back. */
  finishEditing: (row: number, col: number) => void
  /** Control columns before the first data column — the grid's own offset. */
  controlCount: number
}

export function useGridKeyboard<T>({
  keyboard,
  data,
  rowKey,
  visible,
  selectable,
  expandable,
  rootRef,
  scrollerRef,
  theadRef,
  rowHeight,
  rowActivates,
  onRowClick,
  expandOnRowClick,
  toggleExpanded,
  toggleSelection,
  setEditing,
}: {
  keyboard: boolean
  data: T[]
  rowKey: (row: T) => string
  visible: DataTableColumn<T>[]
  selectable: boolean
  expandable: boolean
  rootRef: React.RefObject<HTMLDivElement | null>
  scrollerRef: React.RefObject<HTMLDivElement | null>
  theadRef: React.RefObject<HTMLTableSectionElement | null>
  rowHeight: number
  rowActivates: boolean
  onRowClick?: (row: T) => void
  expandOnRowClick: boolean
  toggleExpanded: (key: string) => void
  toggleSelection: (key: string, options?: { shiftKey?: boolean }) => void
  setEditing: (cell: { key: string; col: string } | null) => void
}): GridKeyboard<T> {
  const gridColumns = React.useMemo<GridColumn<T>[]>(
    () => [
      ...(selectable ? [{ kind: 'select' as const }] : []),
      ...(expandable ? [{ kind: 'expand' as const }] : []),
      ...visible.map((column) => ({ kind: 'column' as const, column })),
    ],
    [selectable, expandable, visible]
  )
  const controlCount = (selectable ? 1 : 0) + (expandable ? 1 : 0)
  const [focus, setFocus] = React.useState({ row: 0, col: 0 })
  // Clamped on the way out rather than on the way in: a page change, a hidden
  // column or a shorter result set can leave the stored position outside the
  // table, and a tab stop no cell carries is a grid Tab cannot enter at all.
  const focusRow = Math.max(0, Math.min(focus.row, data.length - 1))
  const focusCol = Math.max(0, Math.min(focus.col, gridColumns.length - 1))

  /** Set while the grid is waiting for a virtualised row to be drawn. */
  const pendingFocus = React.useRef(false)

  const cellAt = (row: number, col: number) =>
    rootRef.current?.querySelector<HTMLElement>(
      `td[data-grid-row="${row}"][data-grid-col="${col}"]`
    ) ?? null

  const moveFocus = (to: Position) => {
    const next = {
      row: Math.max(0, Math.min(data.length - 1, to.row)),
      col: Math.max(0, Math.min(gridColumns.length - 1, to.col)),
    }
    setFocus(next)
    // Focused straight away rather than after the state lands: a cell at
    // tabIndex -1 still takes focus from script, and waiting a commit for it
    // would drop every keystroke held down in between.
    const cell = cellAt(next.row, next.col)
    if (cell) return cell.focus()
    // Virtualised, and the row has not been drawn yet. Scrolling it into the
    // window is what draws it; the effect below hands it the focus once it is
    // there, which is the only part that cannot happen in this call.
    pendingFocus.current = true
    const scroller = scrollerRef.current
    if (!scroller) return
    const head = theadRef.current?.offsetHeight ?? 0
    scroller.scrollTop = Math.max(0, head + next.row * rowHeight - scroller.clientHeight / 2)
  }

  React.useEffect(() => {
    if (!pendingFocus.current) return
    const cell = cellAt(focusRow, focusCol)
    if (!cell) return
    pendingFocus.current = false
    cell.focus()
  })

  /** The column an Enter in this cell would open an editor for, if any. */
  const editorAt = (row: T, col: number) => {
    const entry = gridColumns[col]
    if (entry?.kind !== 'column') return undefined
    const def = entry.column.editable
    return def && (def.canEdit?.(row) ?? true) ? entry.column : undefined
  }

  const finishEditing = (row: number, col: number) => {
    setEditing(null)
    if (!keyboard) return
    const cell = cellAt(row, col)
    // Only while the reader is still inside the cell: a save caused by
    // clicking another cell has already moved focus there, and pulling it
    // back here would undo the click that caused the save.
    if (cell && cell.contains(document.activeElement)) cell.focus()
  }

  /**
   * Where the event happened, or `null` if it did not happen on a cell. The
   * cell itself only: inside it the keys belong to whatever has focus — the
   * editor's Enter saves, a menu's arrows walk its own items.
   */
  const positionOf = (target: EventTarget | null): Position | null => {
    const cell = target as HTMLElement | null
    if (cell?.dataset?.gridCol === undefined) return null
    return { row: Number(cell.dataset.gridRow), col: Number(cell.dataset.gridCol) }
  }

  /** Enter and F2: the cell's own editor first, the row's click second. */
  const activate = (event: React.KeyboardEvent, record: T, col: number) => {
    const editable = editorAt(record, col)
    if (editable) {
      event.preventDefault()
      return setEditing({ key: rowKey(record), col: editable.id })
    }
    // F2 means "edit this cell" and nothing else; Enter falls through to the
    // row, which is what a click on the same cell would have done.
    if (event.key === 'F2' || !rowActivates) return
    event.preventDefault()
    onRowClick?.(record)
    if (expandOnRowClick && expandable) toggleExpanded(rowKey(record))
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    const at = positionOf(event.target)
    const record = at ? data[at.row] : undefined
    if (!at || record === undefined) return

    const move = MOVES[event.key]
    if (move) {
      event.preventDefault()
      return moveFocus(
        move(at, {
          ctrl: event.ctrlKey,
          lastRow: data.length - 1,
          lastCol: gridColumns.length - 1,
        })
      )
    }
    if (event.key === ' ' && selectable) {
      // Or the scroller answers the space bar by jumping a screen, which is
      // the one thing a reader ticking rows never means by it.
      event.preventDefault()
      return toggleSelection(rowKey(record), { shiftKey: event.shiftKey })
    }
    if (event.key === 'Enter' || event.key === 'F2') activate(event, record, at.col)
  }

  /* The roving tab stop follows whatever actually took focus, so a click into
     a cell — or a Tab into a control inside one — leaves the grid where the
     reader is rather than where the arrow keys last left it. */
  const onFocus = (event: React.FocusEvent) => {
    const cell = (event.target as HTMLElement).closest?.('td[data-grid-col]') as HTMLElement | null
    const at = cell ? { row: Number(cell.dataset.gridRow), col: Number(cell.dataset.gridCol) } : null
    if (!at) return
    setFocus((current) => (current.row === at.row && current.col === at.col ? current : at))
  }

  return {
    controlCount,
    finishEditing,
    // `grid` is what tells a screen reader the arrow keys do something here;
    // on a reading table they belong to the page's own scroll, so the role
    // only arrives with the keyboard that justifies it.
    gridProps: keyboard ? { role: 'grid', onKeyDown, onFocus } : {},
    gridCell: (row, col) =>
      keyboard
        ? {
            role: 'gridcell',
            tabIndex: row === focusRow && col === focusCol ? 0 : -1,
            'data-grid-row': row,
            'data-grid-col': col,
          }
        : undefined,
  }
}
