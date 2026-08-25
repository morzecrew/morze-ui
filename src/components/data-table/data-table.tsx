'use client'

import * as React from 'react'

import { cn } from '../../lib/utils'
import {
  AlertIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronRightIcon,
  InboxIcon,
  SortIcon,
} from '../../lib/icons'
import { Button } from '../button'
import { Checkbox } from '../checkbox'
import { Skeleton } from '../skeleton'
import { CellEditor } from './cell-editor'
import { ColumnFilter, FilterChip } from './column-filter'
import { ColumnManager } from './column-manager'
import { DataTablePagination } from './data-table-pagination'
import type {
  ColumnLayout,
  DataTableColumn,
  DataTableQuery,
  RowAttributes,
  RowSelectionState,
} from './types'
import { resolveLabels, type DataTableLabels } from './labels'
import { activeFilters, setFilter, sortStateOf, toggleSort } from './utils'
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
  onRowClick?: (row: T) => void
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
   * Stretches the columns to fill the container on mount and on container
   * resize, so there is no dead space at the right edge. Columns the user
   * resized by hand keep their width. `false` uses the declared widths as-is.
   */
  autoFit?: boolean
  density?: 'compact' | 'normal' | 'relaxed'
  stickyHeader?: boolean
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
  onLoadMore?: () => void
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
  onRowClick,
  rowClassName,
  rowProps,
  layout: controlledLayout,
  onLayoutChange,
  persistKey = null,
  toolbar,
  autoFit = true,
  density = 'normal',
  stickyHeader = true,
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
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set())
  const [editing, setEditing] = React.useState<{ key: string; col: string } | null>(null)

  const {
    layout,
    visible,
    widthOf,
    minWidthOf,
    setWidth,
    toggleHidden,
    setPinned,
    move,
    moveTo,
    reset,
    fitTo,
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
  }, [autoFit, fitTo, selectable, renderExpanded, hiddenKey, orderKey])

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

  const canLoadMore =
    Boolean(onLoadMore) && (hasMore ?? (total === undefined || data.length < total))
  const showLoadMore = canLoadMore && !error && data.length > 0
  const showPager = pagination ?? !onLoadMore

  const askForMore = () => {
    if (askedAt.current === data.length) return
    askedAt.current = data.length
    onLoadMoreRef.current?.()
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
  }, [showLoadMore, autoLoadMore, loading, data.length])

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
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

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
                    aria-sort={dir === 'asc' ? 'ascending' : dir === 'desc' ? 'descending' : 'none'}
                    className="mz-dt__th"
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
                          title={labels.sortBy(label)}
                          onClick={(event) =>
                            onQueryChange(toggleSort(query, column.id, event.shiftKey))
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
                          const isEditing = editing?.key === key && editing.col === column.id
                          return (
                            <td
                              key={column.id}
                              data-col={column.id}
                              data-pinned={pinned}
                              data-pin-edge={pinEdgeOf(column.id)}
                              data-align={column.align}
                              data-editable={column.editable ? true : undefined}
                              className="mz-dt__td"
                              style={
                                pinned
                                  ? ({ [pinned]: offsets.get(column.id) } as React.CSSProperties)
                                  : undefined
                              }
                              onDoubleClick={
                                column.editable
                                  ? (event) => {
                                      event.stopPropagation()
                                      setEditing({ key, col: column.id })
                                    }
                                  : undefined
                              }
                            >
                              {isEditing && column.editable ? (
                                <CellEditor
                                  row={row}
                                  def={column.editable}
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

  return (
    <div
      ref={rootRef}
      data-slot="data-table"
      data-density={density}
      className={cn('mz-dt', className)}
      style={widthVars}
    >
      {(toolbar || chips.length > 0 || columns.some((c) => c.hideable !== false)) && (
        <div className="mz-dt__toolbar">
          <div className="mz-dt__toolbar-main">{toolbar}</div>
          <div className="mz-dt__toolbar-side">
            <ColumnManager
              columns={columns}
              layout={layout}
              labels={labelsProp}
              onToggleHidden={toggleHidden}
              onSetPinned={setPinned}
              onMove={move}
              onMoveTo={moveTo}
              onReset={reset}
            />
          </div>
        </div>
      )}

      {chips.length > 0 && (
        <div className="mz-dt__chips">
          {chips.map(([id, value]) => (
            <FilterChip
              key={id}
              label={
                <>
                  <b>{labelOf(id)}</b>
                  {describeFilter(value, columnById.get(id)?.filter, labels)}
                </>
              }
              clearLabel={labels.clearFilter}
              onClear={() => onQueryChange(setFilter(query, id, undefined))}
            />
          ))}
          <Button
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
        <table className="mz-dt__table" data-sticky={stickyHeader || undefined}>
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
                  <tr key={`skeleton-${index}`} className="mz-dt__row">
                    <td className="mz-dt__td" colSpan={colSpan}>
                      <Skeleton style={{ height: 14, width: `${60 + ((index * 13) % 35)}%` }} />
                    </td>
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
                        data-clickable={onRowClick ? true : undefined}
                        onClick={
                          onRowClick || hostProps?.onClick
                            ? (event) => {
                                hostProps?.onClick?.(event)
                                onRowClick?.(row)
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
        </table>

        {!loading && !error && data.length === 0 ? (
          <div className="mz-dt__state">
            {emptyState ?? (
              <>
                <InboxIcon />
                <p>{labels.empty}</p>
                {chips.length > 0 ? (
                  <Button
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
              <Button size="sm" variant="secondary" onClick={onRetry}>
                {labels.retry}
              </Button>
            ) : null}
          </div>
        ) : null}

        {showLoadMore ? (
          <div ref={moreRef} className="mz-dt__more" data-slot="data-table-load-more">
            <Button variant="secondary" size="sm" disabled={loading} onClick={askForMore}>
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

      {selectable && (rows.count ?? 0) > 0 ? (
        <div className="mz-dt__bulkbar" role="region" aria-label={labels.bulkActions}>
          <span className="mz-dt__bulkbar-count">
            {labels.selectedCount(
              selectionCount?.toLocaleString(locale) ?? String(rows.count ?? 0)
            )}
            {rows.allMatching ? labels.allMatchingSuffix : null}
          </span>
          {!rows.allMatching && total !== undefined && rows.pageSelected && total > data.length ? (
            <Button variant="link" size="xs" onClick={rows.selectAllMatching}>
              {labels.selectAllMatching(total.toLocaleString(locale))}
            </Button>
          ) : null}
          <div className="mz-dt__bulkbar-actions">
            {bulkActions?.(selection ?? { keys: [], allMatching: false })}
            <Button variant="ghost" size="sm" onClick={rows.clear}>
              {labels.clearSelection}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function describeFilter(
  value: import('./types').FilterValue,
  def: import('./types').ColumnFilterDef | undefined,
  labels: DataTableLabels
): string {
  switch (value.type) {
    case 'text':
      return `: “${value.value}”`
    case 'select': {
      // Show what the user picked in the menu, not the raw wire value.
      const options = def?.type === 'select' ? def.options : []
      const labels = value.value.map(
        (v) => options.find((option) => option.value === v)?.label ?? v
      )
      return `: ${labels.join(', ')}`
    }
    case 'number-range':
      return `: ${value.min ?? '…'}–${value.max ?? '…'}`
    case 'date-range':
      return `: ${value.from ?? '…'} – ${value.to ?? '…'}`
    case 'boolean':
      return `: ${value.value ? labels.yes.toLowerCase() : labels.no.toLowerCase()}`
    case 'custom': {
      // Only the host can put a custom value into words.
      const text = (def?.type === 'custom' ? def.describe?.(value.value) : undefined) ?? value.label
      return text ? `: ${text}` : ''
    }
  }
}
