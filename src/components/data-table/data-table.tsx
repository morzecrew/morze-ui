'use client'

import * as React from 'react'

import { cn } from '../../lib/utils'
import {
  AlertIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronRightIcon,
  InboxIcon,
  SearchIcon,
  SortIcon,
} from '../../lib/icons'
import { Button } from '../button'
import { Checkbox } from '../checkbox'
import { Input } from '../input'
import { Skeleton } from '../skeleton'
import { CellEditor } from './cell-editor'
import { ColumnFilter, FilterChip } from './column-filter'
import { ColumnManager } from './column-manager'
import { DataTablePagination } from './data-table-pagination'
import type {
  ColumnLayout,
  DataTableColumn,
  DataTableFilters,
  DataTableQuery,
  RowAttributes,
  RowSelectionState,
} from './types'
import { resolveLabels, type DataTableLabels } from './labels'
import {
  activeFilters,
  serializeSort,
  setFilter,
  setSearch,
  sortStateOf,
  toggleSort,
} from './utils'
import { cssSafe, useColumnResize } from './use-column-resize'
import { useColumnLayout } from './use-column-layout'
import { useRowSelection } from './use-row-selection'

export type DataTableProps<T> = {
  columns: DataTableColumn<T>[]
  data: T[]
  rowKey: (row: T) => string
  /** Total matching rows on the server; drives the pager. */
  total?: number
  loading?: boolean
  error?: React.ReactNode
  onRetry?: () => void

  query: DataTableQuery
  onQueryChange: (query: DataTableQuery) => void

  /** Shift-click extends the range; `allMatching` covers unfetched rows. */
  selection?: RowSelectionState
  onSelectionChange?: (selection: RowSelectionState) => void
  bulkActions?: (selection: RowSelectionState) => React.ReactNode

  renderExpanded?: (row: T) => React.ReactNode
  /** Controlled expansion. Pair with `onExpandedChange`. */
  expanded?: string[]
  onExpandedChange?: (keys: string[]) => void
  defaultExpanded?: string[]
  /** A click anywhere on the row opens it, not only the chevron. */
  expandOnRowClick?: boolean
  /**
   * Fires for a click on the row itself. A click that started on a link,
   * button, field or menu item inside a cell is that control's, not the
   * row's — every host used to have to `stopPropagation` in every action cell
   * to stop a delete button also opening the record behind the dialog.
   */
  onRowClick?: (row: T) => void
  onRowDoubleClick?: (row: T) => void
  onRowContextMenu?: (row: T, event: React.MouseEvent) => void
  /** Per-row class name — tinting a row by record state, marking it stale. */
  rowClassName?: (row: T, context: { rowIndex: number }) => string | undefined
  /**
   * Extra attributes for the row element: `data-*`, `title`, `aria-*`, a
   * handler of your own. The table's own attributes win, so this cannot break
   * selection, expansion or the pinned-column seam; a `className` here is
   * merged, and an `onClick` runs before `onRowClick`.
   */
  rowProps?: (row: T, context: { rowIndex: number }) => RowAttributes

  layout?: Partial<ColumnLayout>
  onLayoutChange?: (layout: ColumnLayout) => void
  /** localStorage key for widths, order, visibility and pinning. */
  persistKey?: string | null

  toolbar?: React.ReactNode
  /**
   * `false` drops the Columns button — for a table whose layout the host
   * fixes, or drives from its own UI. The layout itself still works: `layout`,
   * `onLayoutChange` and `persistKey` are unaffected.
   */
  columnManager?: boolean
  /**
   * Stretches the columns to fill the container on mount and on container
   * resize, so there is no dead space at the right edge. Columns the user
   * resized by hand keep their width. `false` uses the declared widths as-is.
   */
  autoFit?: boolean
  density?: 'compact' | 'normal' | 'relaxed'
  /**
   * Sticks the header while the body scrolls. It needs the scroller to have a
   * height to scroll within — `maxHeight`, `height` or `fill` — since without
   * one the scroller grows with its content and never scrolls at all.
   */
  stickyHeader?: boolean
  /** Caps the scroller; this is what makes `stickyHeader` work. */
  maxHeight?: number | string
  /** Fixes the scroller's height instead of capping it. */
  height?: number | string
  /**
   * Takes the height of a flex parent: the table fills it and the scroller
   * takes what the toolbar, chips and pager leave over.
   */
  fill?: boolean
  /**
   * `card` (default) frames the scroller with a border, a radius and a
   * shadow; `plain` drops all three, for a table already inside a Card or a
   * panel, where the two frames doubled up.
   */
  frame?: 'card' | 'plain'
  /**
   * Built-in search box in the toolbar. Its value lives in `query.search`, so
   * it resets the page, reaches the URL through `useTableQuery`, and arrives
   * at the backend in the same request as everything else.
   */
  search?: boolean | { placeholder?: string; debounce?: number }
  /**
   * `hover` (default) shows a column's filter button under the pointer, under
   * the keyboard, and always while that column is filtering; `always` keeps
   * every trigger on screen. A row of six identical funnels is noise.
   */
  filterTrigger?: 'always' | 'hover'
  /** Totals row under the body, built from each column's `footer`. */
  summary?: boolean
  emptyState?: React.ReactNode
  /** `false` — or a single option — hides the rows-per-page select. */
  pageSizeOptions?: number[] | false
  /** Renders the pager. Defaults to `false` once `onLoadMore` is given. */
  pagination?: boolean
  /**
   * Appends the next page instead of replacing the current one. Passing it
   * puts a footer inside the table's own scroller — the element an infinite
   * scroll needs to watch, which a host cannot add from the outside.
   */
  onLoadMore?: (context: { nextPage: number }) => void
  /** Whether anything is left to load. Defaults to `data.length < total`. */
  hasMore?: boolean
  /** `false` waits for a click instead of loading as the footer scrolls in. */
  autoLoadMore?: boolean
  /** Overrides for any of the table's own strings. Defaults are English. */
  labels?: Partial<DataTableLabels>
  /** Locale for number formatting; defaults to the browser's. */
  locale?: string
  caption?: string
  className?: string
}

const SELECT_WIDTH = 44
const EXPAND_WIDTH = 40
/** How long a fitted width keeps blocking a re-fit to that same width. */
const FIT_CYCLE_MS = 250

export function DataTable<T>({
  columns,
  data,
  rowKey,
  total,
  loading = false,
  error,
  onRetry,
  query,
  onQueryChange,
  selection,
  onSelectionChange,
  bulkActions,
  renderExpanded,
  expanded: controlledExpanded,
  onExpandedChange,
  defaultExpanded,
  expandOnRowClick = false,
  onRowClick,
  onRowDoubleClick,
  onRowContextMenu,
  rowClassName,
  rowProps,
  layout: controlledLayout,
  onLayoutChange,
  persistKey = null,
  toolbar,
  columnManager = true,
  autoFit = true,
  density = 'normal',
  stickyHeader = true,
  maxHeight,
  height,
  fill = false,
  frame = 'card',
  search = false,
  filterTrigger = 'hover',
  summary = false,
  emptyState,
  pageSizeOptions,
  pagination,
  onLoadMore,
  hasMore,
  autoLoadMore = true,
  labels: labelsProp,
  locale,
  caption,
  className,
}: DataTableProps<T>) {
  const labels = resolveLabels(labelsProp)
  const rootRef = React.useRef<HTMLDivElement>(null)
  const scrollerRef = React.useRef<HTMLDivElement>(null)
  const [scrolled, setScrolled] = React.useState({ left: false, right: false })
  const [editing, setEditing] = React.useState<{ key: string; col: string } | null>(null)

  /* ----------------------------- Expansion -----------------------------
     Controlled when `expanded` is given, so a host can open a row from
     elsewhere on the page, restore what was open after a refetch, or drive
     "expand all" itself. Uncontrolled it behaves exactly as before. */
  const [internalExpanded, setInternalExpanded] = React.useState<string[]>(defaultExpanded ?? [])
  const expandedKeys = controlledExpanded ?? internalExpanded
  const expanded = React.useMemo(() => new Set(expandedKeys), [expandedKeys])
  const commitExpanded = (next: string[]) => {
    if (controlledExpanded === undefined) setInternalExpanded(next)
    onExpandedChange?.(next)
  }

  const {
    layout,
    visible,
    widthOf,
    minWidthOf,
    setWidth,
    toggleHidden,
    setPinned,
    moveTo,
    reset,
    unsize,
    fitTo,
    fitEpoch,
  } = useColumnLayout({ columns, persistKey, layout: controlledLayout, onLayoutChange })

  const resize = useColumnResize({ rootRef, widthOf, minWidthOf, onCommit: setWidth })

  const selectable = Boolean(selection && onSelectionChange)
  const pageKeys = React.useMemo(() => data.map(rowKey), [data, rowKey])
  const rows = useRowSelection({
    value: selection ?? { keys: [], allMatching: false },
    onChange: onSelectionChange ?? (() => {}),
    pageKeys,
  })

  // Fill the row on mount and on container resize.
  //
  // The widths this effect has recently fitted to. A single "last width" is not
  // enough: fitting to A can make a scrollbar appear, which makes the next
  // measurement B, and fitting to B makes it disappear again. Both steps differ
  // from the one immediately before, so a last-width guard waves the whole cycle
  // through and the observer keeps re-fitting for as long as the table is shown.
  // Entries expire, so a genuine resize back to an earlier width still fits.
  const recentFits = React.useRef<{ width: number; at: number }[]>([])
  // Hidden and order are compared by value: `merge` hands back fresh arrays on
  // every layout change, and re-subscribing on a width change would clear the
  // cycle history that width change is supposed to be caught by.
  const hiddenKey = layout.hidden.join('\u0000')
  const orderKey = layout.order.join('\u0000')
  React.useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller || !autoFit) return
    const controls = (selectable ? SELECT_WIDTH : 0) + (renderExpanded ? EXPAND_WIDTH : 0)
    // A column hidden, shown or moved has to redistribute into the same width,
    // so the history cannot outlive the layout it was collected for.
    recentFits.current = []
    const run = () => {
      const available = scroller.clientWidth - controls - 2
      const now = Date.now()
      const recent = recentFits.current.filter((entry) => now - entry.at < FIT_CYCLE_MS)
      recentFits.current = recent
      if (recent.some((entry) => Math.abs(available - entry.width) < 1)) return
      recent.push({ width: available, at: now })
      fitTo(available)
    }
    run()
    const observer = new ResizeObserver(run)
    observer.observe(scroller)
    return () => observer.disconnect()
    // `fitEpoch` is bumped by a layout reset: every column is flexible again
    // and nothing about the container has changed, so nothing else would
    // trigger the fit that has to follow.
  }, [autoFit, fitTo, selectable, renderExpanded, hiddenKey, orderKey, fitEpoch])

  // Edge shadows tell the reader there is more table beyond the viewport.
  React.useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    const update = () => {
      const max = scroller.scrollWidth - scroller.clientWidth
      const left = scroller.scrollLeft > 1
      const right = scroller.scrollLeft < max - 1
      // A fresh object here would be a new state on every observer tick, and any
      // cell whose content reflows during that render feeds the observer again —
      // the two then re-render each other until the tab locks up.
      setScrolled((current) =>
        current.left === left && current.right === right ? current : { left, right }
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
  }, [visible.length, data.length])

  /* ------------------------------ Load more ------------------------------
     The footer lives inside the scroller, because that is the element an
     observer has to be rooted at; a host cannot reach in from the outside. */
  const moreRef = React.useRef<HTMLDivElement>(null)
  const onLoadMoreRef = React.useRef(onLoadMore)
  // Kept current after every commit, so the observer below never has to be
  // re-subscribed just because the host passed a fresh closure.
  React.useEffect(() => {
    onLoadMoreRef.current = onLoadMore
  })
  // The row count the last request was made at. One request per batch of rows:
  // a host that answers with nothing new would otherwise be asked forever.
  const askedAt = React.useRef(-1)
  // A new result set starts that count over. It used to survive a query
  // change, and a filter whose first page happened to be as long as the rows
  // already on screen — the first page nearly always is a full one — left
  // `askedAt` equal to `data.length`: neither the footer scrolling into view
  // nor the button ever asked again.
  const queryKey = `${serializeSort(query.sort)}\u0000${filtersKey(query.filters)}\u0000${query.pageSize}\u0000${query.search ?? ''}`
  React.useEffect(() => {
    askedAt.current = -1
  }, [queryKey])
  React.useEffect(() => {
    // Fewer rows than at the last request: the host replaced the list rather
    // than appending to it, whatever the query says.
    if (data.length < askedAt.current) askedAt.current = -1
  }, [data.length])

  const canLoadMore =
    Boolean(onLoadMore) && (hasMore ?? (total === undefined || data.length < total))
  const showLoadMore = canLoadMore && !error && data.length > 0
  const showPager = pagination ?? !onLoadMore

  // The page the host should ask for next. The table cannot increment
  // `query.page` itself — that would make the pager and the infinite scroll
  // fight over the same field — so the number is handed over instead of left
  // for every host to keep a counter for.
  const nextPage = query.pageSize > 0 ? Math.floor(data.length / query.pageSize) + 1 : query.page + 1

  const askForMore = () => {
    if (askedAt.current === data.length) return
    askedAt.current = data.length
    onLoadMoreRef.current?.({ nextPage })
  }

  React.useEffect(() => {
    const sentinel = moreRef.current
    const scroller = scrollerRef.current
    if (!sentinel || !scroller || !showLoadMore || !autoLoadMore || loading) return
    if (typeof IntersectionObserver === 'undefined') return
    // Nothing here may touch state: a re-render that reflows a cell feeds the
    // scroller's own observer, and the two can then drive each other (FIXES.md).
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) askForMore()
      },
      { root: scroller, rootMargin: '120px' }
    )
    observer.observe(sentinel)
    // Re-observing on every batch is what keeps an endless scroll going: the
    // fresh observer reports the footer again if it is still in view.
    return () => observer.disconnect()
    // Re-observed on a query change too: a fresh observer reports the footer
    // again if the new, equally long result set left it in view.
  }, [showLoadMore, autoLoadMore, loading, data.length, queryKey])

  // Sticky offsets are expressed as a calc() over the width variables, so they
  // stay correct while a column is being resized.
  const offsets = React.useMemo(() => {
    const result = new Map<string, string>()
    let leftParts: string[] = selectable ? [`${SELECT_WIDTH}px`] : []
    if (renderExpanded) leftParts = [...leftParts, `${EXPAND_WIDTH}px`]
    for (const column of visible) {
      if (layout.pinned[column.id] !== 'left') continue
      result.set(column.id, leftParts.length ? `calc(${leftParts.join(' + ')})` : '0px')
      leftParts.push(`var(--mz-dt-w-${cssSafe(column.id)}, ${widthOf(column.id)}px)`)
    }
    const rightParts: string[] = []
    for (const column of [...visible].reverse()) {
      if (layout.pinned[column.id] !== 'right') continue
      result.set(column.id, rightParts.length ? `calc(${rightParts.join(' + ')})` : '0px')
      rightParts.push(`var(--mz-dt-w-${cssSafe(column.id)}, ${widthOf(column.id)}px)`)
    }
    return result
  }, [visible, layout.pinned, widthOf, selectable, renderExpanded])

  const widthVars = React.useMemo(() => {
    const style: Record<string, string> = {}
    for (const column of visible) {
      style[`--mz-dt-w-${cssSafe(column.id)}`] = `${widthOf(column.id)}px`
    }
    return style as React.CSSProperties
  }, [visible, widthOf])

  // Only the cell on the seam gets the edge shadow, so the cue reads as one
  // boundary rather than a shadow under every pinned column.
  const leftPinned = visible.filter((c) => layout.pinned[c.id] === 'left')
  const rightPinned = visible.filter((c) => layout.pinned[c.id] === 'right')
  const lastLeftPinned = leftPinned[leftPinned.length - 1]?.id
  const firstRightPinned = rightPinned[0]?.id
  const pinEdgeOf = (id: string) =>
    id === lastLeftPinned ? 'left' : id === firstRightPinned ? 'right' : undefined
  // With no pinned data column the control column carries the seam instead.
  const controlPinEdge = leftPinned.length === 0 ? 'left' : undefined

  const chips = activeFilters(query.filters)
  const columnById = React.useMemo(() => new Map(columns.map((c) => [c.id, c])), [columns])
  const labelOf = (id: string) => {
    const column = columnById.get(id)
    return column?.label ?? (typeof column?.header === 'string' ? column.header : id)
  }

  const toggleExpanded = (key: string) =>
    commitExpanded(
      expanded.has(key) ? expandedKeys.filter((k) => k !== key) : [...expandedKeys, key]
    )

  // "Everything on this page", not "everything the filter matches": the table
  // only ever holds the rows it was given, and a key it has never seen cannot
  // be opened.
  const allPageExpanded = pageKeys.length > 0 && pageKeys.every((key) => expanded.has(key))
  const toggleExpandedAll = () =>
    commitExpanded(
      allPageExpanded
        ? expandedKeys.filter((key) => !pageKeys.includes(key))
        : [...new Set([...expandedKeys, ...pageKeys])]
    )

  /* ------------------------------- Search -------------------------------
     Typed locally and pushed into the query on a timer: the value is part of
     `query`, and committing per keystroke would be one request per letter.
     The draft follows the query whenever the query moves on its own — a
     Reset, the back button, a saved view — but not while the reader is
     mid-word, which is what the pending timer stands for. */
  const searchConfig = search === true ? {} : search === false ? null : search
  const searchDebounce = searchConfig?.debounce ?? 300
  const [searchDraft, setSearchDraft] = React.useState(query.search ?? '')
  const searchTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  // Both are read at fire time rather than closed over, so a filter applied
  // while the timer runs is not rolled back by it and a fresh callback does
  // not have to restart the timer. Kept current after the commit, like the
  // load-more ref above: a render React later discards must not leave a ref
  // pointing into it.
  const queryChangeRef = React.useRef(onQueryChange)
  const queryRef = React.useRef(query)
  React.useEffect(() => {
    queryChangeRef.current = onQueryChange
    queryRef.current = query
  })
  React.useEffect(() => {
    // Not while the reader is mid-word: a pending timer is what says so.
    if (searchTimer.current) return
    setSearchDraft(query.search ?? '')
  }, [query.search])
  React.useEffect(() => () => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
  }, [])
  const onSearchInput = (value: string) => {
    setSearchDraft(value)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      searchTimer.current = null
      queryChangeRef.current(setSearch(queryRef.current, value))
    }, searchDebounce)
  }

  /* A click that started on a control inside a cell belongs to that control.
     Without this the row handler fired too: opening a record behind the
     confirmation dialog its own delete button had just raised, following a
     link and navigating somewhere else at once, toggling a checkbox and
     opening the row it selects. Every host worked around it by calling
     `stopPropagation` in every action cell, and forgetting one was the bug.
     `label` is in the list because clicking one activates the control it
     names. Scoped to the row the handler is on, so a portalled menu — which
     is a descendant of `document.body`, not of the row — is still ignored. */
  const rowActivates = Boolean(onRowClick) || (expandOnRowClick && Boolean(renderExpanded))
  const fromInteractive = (event: React.MouseEvent) => {
    const target = event.target as Element | null
    if (!target?.closest) return false
    const control = target.closest(
      'a[href], button, input, select, textarea, label, [role="button"],' +
        ' [role="menuitem"], [role="checkbox"], [role="radio"], [role="link"],' +
        ' [role="switch"], [role="tab"], [contenteditable="true"]'
    )
    return Boolean(control && event.currentTarget.contains(control))
  }

  const fillerIndex = visible.length - rightPinned.length
  // +1 for the filler column, so full-width rows really span the table.
  const colSpan = visible.length + 1 + (selectable ? 1 : 0) + (renderExpanded ? 1 : 0)
  const selectionCount = rows.allMatching ? total : rows.count

  /* Cells are rendered through helpers so the filler column can be spliced in
     between the scrolling columns and the right-pinned group. */
  const renderHeaderCells = (list: DataTableColumn<T>[]) =>
    list.map((column) => {
                const { dir, index } = sortStateOf(query, column.id)
                const pinned = layout.pinned[column.id]
                const label = labelOf(column.id)
                return (
                  <th
                    key={column.id}
                    data-col={column.id}
                    data-pinned={pinned}
                    data-pin-edge={pinEdgeOf(column.id)}
                    data-align={column.align}
                    // Only a sortable column claims the attribute: to assistive
                    // tech `none` means "sortable, not sorted yet", not "cannot".
                    aria-sort={
                      column.sortable
                        ? dir === 'asc'
                          ? 'ascending'
                          : dir === 'desc'
                            ? 'descending'
                            : 'none'
                        : undefined
                    }
                    className={cn('mz-dt__th', column.headerClassName)}
                    style={
                      pinned
                        ? ({ [pinned]: offsets.get(column.id) } as React.CSSProperties)
                        : undefined
                    }
                  >
                    <div className="mz-dt__th-inner">
                      {column.sortable ? (
                        <button
                          type="button"
                          className="mz-dt__sort mz-focusable"
                          // A column's own hint wins over the generic one, on
                          // sortable columns too: `title` was taken by the
                          // sort hint there, so `headerTitle` silently did
                          // nothing on exactly the columns readers ask about.
                          title={column.headerTitle ?? labels.sortBy(label)}
                          aria-description={column.headerTitle ? labels.sortBy(label) : undefined}
                          onClick={(event) =>
                            onQueryChange(
                              toggleSort(query, column.id, event.shiftKey, column.sortDescFirst)
                            )
                          }
                        >
                          <span className="mz-dt__th-label">{column.header}</span>
                          <span className="mz-dt__sort-icon" data-active={dir ? true : undefined}>
                            {dir === 'asc' ? (
                              <ArrowUpIcon />
                            ) : dir === 'desc' ? (
                              <ArrowDownIcon />
                            ) : (
                              <SortIcon />
                            )}
                            {index ? <b>{index}</b> : null}
                          </span>
                        </button>
                      ) : (
                        <span className="mz-dt__th-label" title={column.headerTitle}>
                          {column.header}
                        </span>
                      )}

                      {column.filter ? (
                        <ColumnFilter
                          columnLabel={label}
                          def={column.filter}
                          value={query.filters[column.id]}
                          labels={labelsProp}
                          locale={locale}
                          onApply={(value) => onQueryChange(setFilter(query, column.id, value))}
                        />
                      ) : null}
                    </div>

                    {column.resizable === false ? null : (
                      <span
                        role="separator"
                        aria-orientation="vertical"
                        aria-label={labels.columnWidth(label)}
                        tabIndex={0}
                        className="mz-dt__resizer mz-focusable"
                        data-resizing={resize.resizing === column.id || undefined}
                        onPointerDown={(event) => resize.start(event, column.id)}
                        onDoubleClick={() => resize.autoFit(column.id)}
                        onKeyDown={(event) => resize.onKeyDown(event, column.id)}
                      />
                    )}
                  </th>
                )
              })

  const renderBodyCells = (row: T, rowIndex: number, list: DataTableColumn<T>[]) => {
    const key = rowKey(row)
    return list.map((column) => {
                          const pinned = layout.pinned[column.id]
                          // `canEdit` is the row-level veto: a closed period, a
                          // locked record. A cell it refuses is an ordinary cell,
                          // down to the caret it does not show.
                          const editableHere =
                            column.editable && (column.editable.canEdit?.(row) ?? true)
                              ? column.editable
                              : undefined
                          const isEditing = editing?.key === key && editing.col === column.id
                          return (
                            <td
                              key={column.id}
                              data-col={column.id}
                              data-pinned={pinned}
                              data-pin-edge={pinEdgeOf(column.id)}
                              data-align={column.align}
                              data-editable={editableHere ? true : undefined}
                              className={cn('mz-dt__td', column.className)}
                              style={
                                pinned
                                  ? ({ [pinned]: offsets.get(column.id) } as React.CSSProperties)
                                  : undefined
                              }
                              onDoubleClick={
                                editableHere
                                  ? (event) => {
                                      event.stopPropagation()
                                      setEditing({ key, col: column.id })
                                    }
                                  : undefined
                              }
                            >
                              {isEditing && editableHere ? (
                                <CellEditor
                                  row={row}
                                  def={editableHere}
                                  labels={labelsProp}
                                  onDone={() => setEditing(null)}
                                />
                              ) : (
                                <div className="mz-dt__cell">
                                  {column.cell
                                    ? column.cell(row, { rowIndex })
                                    : column.accessor?.(row)}
                                </div>
                              )}
                            </td>
                          )
                        })
  }

  /* The first-load placeholder. Built from the same three slices as every
     other row, so it has the table's real columns under it: it used to be one
     cell spanning the whole width with a single bar in it, which announced a
     list rather than a table and then jumped into a grid the moment the rows
     arrived. Widths vary per cell so the block reads as text of different
     lengths rather than a barcode. */
  const renderSkeletonCells = (list: DataTableColumn<T>[], rowIndex: number) =>
    list.map((column, columnIndex) => {
      const pinned = layout.pinned[column.id]
      return (
        <td
          key={column.id}
          data-col={column.id}
          data-pinned={pinned}
          data-pin-edge={pinEdgeOf(column.id)}
          data-align={column.align}
          className={cn('mz-dt__td', column.className)}
          style={pinned ? ({ [pinned]: offsets.get(column.id) } as React.CSSProperties) : undefined}
        >
          <Skeleton style={{ height: 12, width: `${45 + ((rowIndex * 17 + columnIndex * 29) % 45)}%` }} />
        </td>
      )
    })

  /* The totals row. Built from the same three slices as the header and the
     body so the filler column lands in the same place, which is what keeps
     the pinned groups aligned across all three. */
  const renderSummaryCells = (list: DataTableColumn<T>[]) =>
    list.map((column) => {
      const pinned = layout.pinned[column.id]
      return (
        <td
          key={column.id}
          data-col={column.id}
          data-pinned={pinned}
          data-pin-edge={pinEdgeOf(column.id)}
          data-align={column.align}
          className={cn('mz-dt__tf', column.className)}
          style={pinned ? ({ [pinned]: offsets.get(column.id) } as React.CSSProperties) : undefined}
        >
          {column.footer?.(data)}
        </td>
      )
    })

  const showSummary = summary && columns.some((column) => column.footer)

  return (
    <div
      ref={rootRef}
      data-slot="data-table"
      data-density={density}
      data-filter-trigger={filterTrigger}
      className={cn('mz-dt', fill && 'mz-dt--fill', frame === 'plain' && 'mz-dt--plain', className)}
      style={
        {
          ...widthVars,
          ...(maxHeight === undefined
            ? null
            : { '--mz-dt-max-h': typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight }),
          ...(height === undefined
            ? null
            : { '--mz-dt-h': typeof height === 'number' ? `${height}px` : height }),
        } as React.CSSProperties
      }
    >
      {(() => {
        const showManager = columnManager && columns.some((c) => c.hideable !== false)
        if (!toolbar && !searchConfig && chips.length === 0 && !showManager) return null
        return (
          <div className="mz-dt__toolbar">
            <div className="mz-dt__toolbar-main">
              {searchConfig ? (
                <Input
                  type="search"
                  inputSize="sm"
                  className="mz-dt__search"
                  aria-label={labels.search}
                  placeholder={searchConfig.placeholder ?? labels.search}
                  value={searchDraft}
                  onChange={(event) => onSearchInput(event.target.value)}
                />
              ) : null}
              {toolbar}
            </div>
            {showManager && (
              <div className="mz-dt__toolbar-side">
                <ColumnManager
                  columns={columns}
                  layout={layout}
                  labels={labelsProp}
                  onToggleHidden={toggleHidden}
                  onSetPinned={setPinned}
                  onMoveTo={moveTo}
                  onUnsize={unsize}
                  onReset={reset}
                />
              </div>
            )}
          </div>
        )
      })()}

      {chips.length > 0 && (
        <div className="mz-dt__chips">
          {chips.map(([id, value]) => (
            <FilterChip
              key={id}
              label={
                <>
                  <b>{labelOf(id)}</b>
                  {describeFilter(value, columnById.get(id)?.filter, labels, locale)}
                </>
              }
              clearLabel={labels.clearFilter}
              onClear={() => onQueryChange(setFilter(query, id, undefined))}
            />
          ))}
          <Button type="button"
            variant="link"
            size="xs"
            onClick={() => onQueryChange({ ...query, filters: {}, page: 1 })}
          >
            {labels.resetAll}
          </Button>
        </div>
      )}

      <div
        ref={scrollerRef}
        className="mz-dt__scroller"
        data-scrolled-left={scrolled.left || undefined}
        data-scrolled-right={scrolled.right || undefined}
      >
        <table
          className="mz-dt__table"
          data-sticky={stickyHeader || undefined}
          // A refetch on a populated table changes nothing a screen reader can
          // see; `aria-busy` is what says the rows underneath are being
          // replaced. `aria-rowcount` counts the header with the rows, and is
          // the only way to say "row 30 of 13 659" when 25 of them are here.
          aria-busy={loading || undefined}
          aria-rowcount={total === undefined ? undefined : total + 1}
        >
          {caption ? <caption className="mz-sr-only">{caption}</caption> : null}
          {/* A trailing auto-width column absorbs whatever space is left over.
              Without it `table-layout: fixed` spreads the slack across every
              column, so dragging one would visibly squeeze its neighbours. */}
          <colgroup>
            {selectable ? <col style={{ width: SELECT_WIDTH }} /> : null}
            {renderExpanded ? <col style={{ width: EXPAND_WIDTH }} /> : null}
            {visible.slice(0, fillerIndex).map((column) => (
              <col
                key={column.id}
                style={{ width: `var(--mz-dt-w-${cssSafe(column.id)}, ${widthOf(column.id)}px)` }}
              />
            ))}
            <col className="mz-dt__col-filler" />
            {visible.slice(fillerIndex).map((column) => (
              <col
                key={column.id}
                style={{ width: `var(--mz-dt-w-${cssSafe(column.id)}, ${widthOf(column.id)}px)` }}
              />
            ))}
          </colgroup>

          <thead>
            <tr>
              {selectable ? (
                <th
                  className="mz-dt__th mz-dt__th--control"
                  data-pinned="left"
                  data-pin-edge={renderExpanded ? undefined : controlPinEdge}
                  style={{ left: 0 }}
                >
                  <Checkbox
                    size="sm"
                    aria-label={labels.selectPage}
                    checked={rows.pageSelected ? true : rows.pagePartial ? 'indeterminate' : false}
                    onCheckedChange={rows.togglePage}
                  />
                </th>
              ) : null}
              {renderExpanded ? (
                <th
                  className="mz-dt__th mz-dt__th--control"
                  data-pinned="left"
                  data-pin-edge={controlPinEdge}
                  style={{ left: selectable ? SELECT_WIDTH : 0 }}
                >
                  <button
                    type="button"
                    className="mz-dt__expand mz-focusable"
                    data-open={allPageExpanded || undefined}
                    // No aria-expanded: that names a disclosure for one
                    // region, and this control governs every row on the page.
                    aria-label={allPageExpanded ? labels.collapseAll : labels.expandAll}
                    title={allPageExpanded ? labels.collapseAll : labels.expandAll}
                    disabled={pageKeys.length === 0}
                    onClick={toggleExpandedAll}
                  >
                    <ChevronRightIcon />
                  </button>
                  <span className="mz-sr-only">{labels.details}</span>
                </th>
              ) : null}

              {renderHeaderCells(visible.slice(0, fillerIndex))}
              <th className="mz-dt__th mz-dt__th--filler" aria-hidden="true" />
              {renderHeaderCells(visible.slice(fillerIndex))}
            </tr>
          </thead>

          <tbody>
            {loading && data.length === 0
              ? Array.from({ length: Math.min(query.pageSize, 8) }, (_, index) => (
                  <tr key={`skeleton-${index}`} className="mz-dt__row" aria-hidden="true">
                    {selectable ? (
                      <td
                        className="mz-dt__td mz-dt__td--control"
                        data-pinned="left"
                        data-pin-edge={renderExpanded ? undefined : controlPinEdge}
                        style={{ left: 0 }}
                      />
                    ) : null}
                    {renderExpanded ? (
                      <td
                        className="mz-dt__td mz-dt__td--control"
                        data-pinned="left"
                        data-pin-edge={controlPinEdge}
                        style={{ left: selectable ? SELECT_WIDTH : 0 }}
                      />
                    ) : null}
                    {renderSkeletonCells(visible.slice(0, fillerIndex), index)}
                    <td className="mz-dt__td mz-dt__td--filler" />
                    {renderSkeletonCells(visible.slice(fillerIndex), index)}
                  </tr>
                ))
              : data.map((row, rowIndex) => {
                  const key = rowKey(row)
                  const isOpen = expanded.has(key)
                  const context = { rowIndex }
                  const hostClass = rowClassName?.(row, context)
                  const hostProps = rowProps?.(row, context)
                  return (
                    <React.Fragment key={key}>
                      <tr
                        {...hostProps}
                        className={cn('mz-dt__row', hostClass, hostProps?.className)}
                        data-selected={rows.selected.has(key) || rows.allMatching || undefined}
                        data-clickable={rowActivates ? true : undefined}
                        onClick={
                          rowActivates || hostProps?.onClick
                            ? (event) => {
                                hostProps?.onClick?.(event)
                                if (fromInteractive(event)) return
                                onRowClick?.(row)
                                if (expandOnRowClick && renderExpanded) toggleExpanded(key)
                              }
                            : undefined
                        }
                        onDoubleClick={
                          onRowDoubleClick || hostProps?.onDoubleClick
                            ? (event) => {
                                hostProps?.onDoubleClick?.(event)
                                if (fromInteractive(event)) return
                                onRowDoubleClick?.(row)
                              }
                            : undefined
                        }
                        onContextMenu={
                          onRowContextMenu || hostProps?.onContextMenu
                            ? (event) => {
                                hostProps?.onContextMenu?.(event)
                                onRowContextMenu?.(row, event)
                              }
                            : undefined
                        }
                      >
                        {selectable ? (
                          <td
                            className="mz-dt__td mz-dt__td--control"
                            data-pinned="left"
                            data-pin-edge={renderExpanded ? undefined : controlPinEdge}
                            style={{ left: 0 }}
                            onClick={(event) => event.stopPropagation()}
                          >
                            <Checkbox
                              size="sm"
                              aria-label={labels.selectRow}
                              checked={rows.selected.has(key) || rows.allMatching}
                              onClick={(event) =>
                                rows.toggle(key, { shiftKey: (event as React.MouseEvent).shiftKey })
                              }
                            />
                          </td>
                        ) : null}

                        {renderExpanded ? (
                          <td
                            className="mz-dt__td mz-dt__td--control"
                            data-pinned="left"
                            data-pin-edge={controlPinEdge}
                            style={{ left: selectable ? SELECT_WIDTH : 0 }}
                            onClick={(event) => event.stopPropagation()}
                          >
                            <button
                              type="button"
                              className="mz-dt__expand mz-focusable"
                              data-open={isOpen || undefined}
                              aria-expanded={isOpen}
                              aria-label={isOpen ? labels.collapseRow : labels.expandRow}
                              onClick={() => toggleExpanded(key)}
                            >
                              <ChevronRightIcon />
                            </button>
                          </td>
                        ) : null}

                        {renderBodyCells(row, rowIndex, visible.slice(0, fillerIndex))}
                        <td className="mz-dt__td mz-dt__td--filler" aria-hidden="true" />
                        {renderBodyCells(row, rowIndex, visible.slice(fillerIndex))}
                      </tr>

                      {isOpen && renderExpanded ? (
                        // The detail panel belongs to the same record, so a row
                        // tint carries onto it; the attributes do not.
                        <tr className={cn('mz-dt__row mz-dt__row--expanded', hostClass)}>
                          <td className="mz-dt__td mz-dt__td--expanded" colSpan={colSpan}>
                            {renderExpanded(row)}
                          </td>
                        </tr>
                      ) : null}
                    </React.Fragment>
                  )
                })}
          </tbody>

          {showSummary && data.length > 0 ? (
            <tfoot>
              <tr className="mz-dt__row mz-dt__row--summary" aria-label={labels.summary}>
                {selectable ? (
                  <td className="mz-dt__tf mz-dt__tf--control" data-pinned="left" style={{ left: 0 }} />
                ) : null}
                {renderExpanded ? (
                  <td
                    className="mz-dt__tf mz-dt__tf--control"
                    data-pinned="left"
                    style={{ left: selectable ? SELECT_WIDTH : 0 }}
                  />
                ) : null}
                {renderSummaryCells(visible.slice(0, fillerIndex))}
                <td className="mz-dt__tf mz-dt__tf--filler" aria-hidden="true" />
                {renderSummaryCells(visible.slice(fillerIndex))}
              </tr>
            </tfoot>
          ) : null}
        </table>

        {!loading && !error && data.length === 0 ? (
          <div className="mz-dt__state">
            {emptyState ?? (
              <>
                <InboxIcon />
                <p>{labels.empty}</p>
                {chips.length > 0 ? (
                  <Button type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => onQueryChange({ ...query, filters: {}, page: 1 })}
                  >
                    {labels.resetFilters}
                  </Button>
                ) : null}
              </>
            )}
          </div>
        ) : null}

        {error ? (
          <div className="mz-dt__state" data-tone="danger">
            <AlertIcon />
            <p>{error}</p>
            {onRetry ? (
              <Button type="button" size="sm" variant="secondary" onClick={onRetry}>
                {labels.retry}
              </Button>
            ) : null}
          </div>
        ) : null}

        {showLoadMore ? (
          <div ref={moreRef} className="mz-dt__more" data-slot="data-table-load-more">
            <Button type="button" variant="secondary" size="sm" disabled={loading} onClick={askForMore}>
              {loading ? labels.loadingMore : labels.loadMore}
            </Button>
          </div>
        ) : null}

        {loading && data.length > 0 ? <div className="mz-dt__loading-bar" aria-hidden="true" /> : null}
      </div>

      {showPager ? (
        <DataTablePagination
          query={query}
          total={total}
          rowsOnPage={data.length}
          pageSizeOptions={pageSizeOptions}
          labels={labelsProp}
          locale={locale}
          onQueryChange={onQueryChange}
        />
      ) : null}

      {/* `count` is undefined in the all-matching mode — the number of selected
          rows is exactly what nobody knows there — so it cannot stand in for
          "is anything selected". Reading it as one hid the bar at the moment
          the user selected everything, taking the bulk actions and the only
          way back out of the mode with it. */}
      {selectable && (rows.allMatching || (rows.count ?? 0) > 0) ? (
        <div className="mz-dt__bulkbar" role="region" aria-label={labels.bulkActions}>
          {/* Selecting a page changes a number nobody is looking at: the
              count is announced so a screen-reader user hears what the tick
              did. Polite, so it waits for a pause rather than cutting in. */}
          <span className="mz-dt__bulkbar-count" role="status" aria-live="polite">
            {selectionCount === undefined ? (
              // Everything the filter matches is selected, but the host never
              // said how many that is. Any number here would be a guess, so
              // the qualifier carries the whole message on its own.
              labels.allMatchingSuffix.trim()
            ) : (
              <>
                {labels.selectedCount(selectionCount.toLocaleString(locale))}
                {rows.allMatching ? labels.allMatchingSuffix : null}
              </>
            )}
          </span>
          {!rows.allMatching && total !== undefined && rows.pageSelected && total > data.length ? (
            <Button type="button" variant="link" size="xs" onClick={rows.selectAllMatching}>
              {labels.selectAllMatching(total.toLocaleString(locale))}
            </Button>
          ) : null}
          <div className="mz-dt__bulkbar-actions">
            {bulkActions?.(selection ?? { keys: [], allMatching: false })}
            <Button type="button" variant="ghost" size="sm" onClick={rows.clear}>
              {labels.clearSelection}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

/**
 * One string per filter set. A `custom` value is the host's and may not
 * serialise; the key list is then the best that can be said about it.
 */
function filtersKey(filters: DataTableFilters): string {
  try {
    return JSON.stringify(filters)
  } catch {
    return Object.keys(filters).join(',')
  }
}

/** How many picked options a chip spells out before it says "+N". */
const CHIP_VALUES = 3

/**
 * An ISO day as the reader's locale writes it. The value on the wire is
 * always `YYYY-MM-DD` — it is what `<input type="date">` produces and what a
 * backend expects — and printing that raw put an American reader's chip in
 * one format and their calendar in another. Parsed as local noon: a plain
 * `new Date('2026-03-01')` is parsed as UTC midnight and prints as the last
 * day of February anywhere west of Greenwich.
 */
function formatDay(iso: string | undefined, locale: string | undefined): string {
  if (!iso) return '…'
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  const date = new Date(y, m - 1, d, 12)
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString(locale)
}

function describeFilter(
  value: import('./types').FilterValue,
  def: import('./types').ColumnFilterDef | undefined,
  labels: DataTableLabels,
  locale: string | undefined
): string {
  switch (value.type) {
    case 'text': {
      // The operator is part of the constraint whenever the column offered a
      // choice of them: “Name equals Ivanov” and “Name contains Ivanov” are
      // different filters and used to print as the same chip.
      const op =
        value.op && def?.type === 'text' && (def.ops?.length ?? 0) > 1
          ? ` ${opLabel(value.op, labels).toLocaleLowerCase(locale)}`
          : ''
      return `${op}: “${value.value}”`
    }
    case 'select': {
      // Show what the user picked in the menu, not the raw wire value.
      const options = def?.type === 'select' ? def.options : []
      const picked = value.value.map(
        (v) => options.find((option) => option.value === v)?.label ?? v
      )
      // Ten warehouses in one chip pushed every other chip off the row.
      const head = picked.slice(0, CHIP_VALUES).join(', ')
      const rest = picked.length - CHIP_VALUES
      return `: ${head}${rest > 0 ? ` ${labels.andMore(String(rest))}` : ''}`
    }
    case 'number-range': {
      const unit = def?.type === 'number-range' && def.unit ? ` ${def.unit}` : ''
      const n = (value: number | undefined) => (value === undefined ? '…' : value.toLocaleString(locale))
      return `: ${n(value.min)}–${n(value.max)}${unit}`
    }
    case 'date-range':
      return `: ${formatDay(value.from, locale)} – ${formatDay(value.to, locale)}`
    case 'boolean':
      return `: ${value.value ? labels.yes.toLocaleLowerCase(locale) : labels.no.toLocaleLowerCase(locale)}`
    case 'custom': {
      // Only the host can put a custom value into words.
      const text = (def?.type === 'custom' ? def.describe?.(value.value) : undefined) ?? value.label
      return text ? `: ${text}` : ''
    }
  }
}

function opLabel(op: import('./types').TextFilterOp, labels: DataTableLabels): string {
  return op === 'equals' ? labels.opEquals : op === 'startsWith' ? labels.opStartsWith : labels.opContains
}
