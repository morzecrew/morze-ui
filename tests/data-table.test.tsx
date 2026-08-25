import { StrictMode, act } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, renderHook, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import {
  DataTable,
  useColumnLayout,
  emptyQuery,
  isFilterActive,
  parseSort,
  serializeSort,
  setFilter,
  sortStateOf,
  toggleSort,
  type DataTableColumn,
  type DataTableQuery,
} from '../src'

type Row = { id: string; name: string; sum: number }
const rows: Row[] = [
  { id: '1', name: 'First', sum: 100 },
  { id: '2', name: 'Second', sum: 200 },
]
const columns: DataTableColumn<Row>[] = [
  { id: 'name', header: 'Name', accessor: (r) => r.name, sortable: true, filter: { type: 'text' } },
  { id: 'sum', header: 'Total', accessor: (r) => r.sum, sortable: true, align: 'right' },
]

const table = (props: Partial<React.ComponentProps<typeof DataTable<Row>>> = {}) => {
  const onQueryChange = vi.fn()
  const utils = render(
    <DataTable
      columns={columns}
      data={rows}
      rowKey={(r) => r.id}
      total={2}
      query={emptyQuery}
      onQueryChange={onQueryChange}
      {...props}
    />
  )
  return { ...utils, onQueryChange }
}

describe('query utils', () => {
  it('cycles a column through asc, desc and off', () => {
    let query: DataTableQuery = emptyQuery
    query = toggleSort(query, 'name')
    expect(query.sort).toEqual([{ id: 'name', dir: 'asc' }])
    query = toggleSort(query, 'name')
    expect(query.sort).toEqual([{ id: 'name', dir: 'desc' }])
    query = toggleSort(query, 'name')
    expect(query.sort).toEqual([])
  })

  it('replaces the sort unless it is additive', () => {
    const first = toggleSort(emptyQuery, 'name')
    expect(toggleSort(first, 'sum').sort).toEqual([{ id: 'sum', dir: 'asc' }])
    expect(toggleSort(first, 'sum', true).sort).toEqual([
      { id: 'name', dir: 'asc' },
      { id: 'sum', dir: 'asc' },
    ])
  })

  it('numbers columns only while the sort is multi-column', () => {
    const single = toggleSort(emptyQuery, 'name')
    expect(sortStateOf(single, 'name')).toEqual({ dir: 'asc', index: undefined })
    const multi = toggleSort(single, 'sum', true)
    expect(sortStateOf(multi, 'sum')).toEqual({ dir: 'asc', index: 2 })
  })

  it('drops filters that carry no constraint', () => {
    expect(isFilterActive({ type: 'text', value: '   ' })).toBe(false)
    expect(isFilterActive({ type: 'select', value: [] })).toBe(false)
    expect(isFilterActive({ type: 'number-range' })).toBe(false)
    expect(isFilterActive({ type: 'boolean', value: false })).toBe(true)

    const withFilter = setFilter(emptyQuery, 'name', { type: 'text', value: 'abc' })
    expect(withFilter.filters.name).toBeDefined()
    expect(setFilter(withFilter, 'name', { type: 'text', value: '' }).filters.name).toBeUndefined()
  })

  it('resets the page whenever the result set changes', () => {
    const onPage3 = { ...emptyQuery, page: 3 }
    expect(setFilter(onPage3, 'name', { type: 'text', value: 'x' }).page).toBe(1)
    expect(toggleSort(onPage3, 'name').page).toBe(1)
  })

  it('round-trips sort through the URL form', () => {
    const sort = [
      { id: 'date', dir: 'desc' as const },
      { id: 'name', dir: 'asc' as const },
    ]
    expect(serializeSort(sort)).toBe('-date,name')
    expect(parseSort('-date,name')).toEqual(sort)
    expect(parseSort(null)).toEqual([])
  })
})

describe('DataTable', () => {
  it('translates the column filter along with the rest of the table', async () => {
    // The header filter is the only child that used to be rendered without
    // `labels`, so its popover stayed English while the pager and the column
    // manager followed the host's locale.
    table({
      labels: {
        filterFor: (column) => `Фильтр: ${column}`,
        apply: 'Применить',
        reset: 'Сбросить',
        contains: 'Содержит…',
      },
    })
    const trigger = screen.getByTitle('Фильтр: Name')
    await userEvent.click(trigger)
    expect(screen.getByPlaceholderText('Содержит…')).toBeInTheDocument()
    expect(screen.getByText('Применить')).toBeInTheDocument()
    expect(screen.getByText('Сбросить')).toBeInTheDocument()
  })

  it('renders a row per record and marks sortable headers for assistive tech', () => {
    table()
    expect(screen.getByRole('columnheader', { name: /Name/ })).toHaveAttribute('aria-sort', 'none')
    expect(screen.getByText('First')).toBeTruthy()
    expect(screen.getByText('Second')).toBeTruthy()
  })

  it('emits a query instead of sorting locally', async () => {
    const { onQueryChange } = table()
    await userEvent.click(screen.getByRole('button', { name: 'Name' }))
    expect(onQueryChange).toHaveBeenCalledWith(
      expect.objectContaining({ sort: [{ id: 'name', dir: 'asc' }] })
    )
  })

  it('reflects the incoming sort direction', () => {
    table({ query: { ...emptyQuery, sort: [{ id: 'sum', dir: 'desc' }] } })
    expect(screen.getByRole('columnheader', { name: /Total/ })).toHaveAttribute(
      'aria-sort',
      'descending'
    )
  })

  it('shows a chip per active filter and clears it', async () => {
    const onQueryChange = vi.fn()
    render(
      <DataTable
        columns={columns}
        data={rows}
        rowKey={(r) => r.id}
        total={2}
        query={{ ...emptyQuery, filters: { name: { type: 'text', value: 'Fir' } } }}
        onQueryChange={onQueryChange}
      />
    )
    expect(document.querySelector('.mz-dt__chip')).toHaveTextContent('Name: “Fir”')
    await userEvent.click(screen.getByRole('button', { name: 'Clear filter' }))
    expect(onQueryChange).toHaveBeenCalledWith(expect.objectContaining({ filters: {} }))
  })

  it('surfaces the bulk bar once rows are selected', () => {
    table({
      selection: { keys: ['1'], allMatching: false },
      onSelectionChange: vi.fn(),
      bulkActions: () => <button type="button">Delete</button>,
    })
    expect(screen.getByText(/Selected: 1/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeTruthy()
  })

  it('offers to escalate the selection to every matching row', () => {
    const onSelectionChange = vi.fn()
    table({
      total: 500,
      selection: { keys: ['1', '2'], allMatching: false },
      onSelectionChange,
    })
    expect(screen.getByRole('button', { name: /Select all 500/ })).toBeTruthy()
  })

  it('renders empty and error states instead of a bare table', () => {
    const { rerender } = table({ data: [], total: 0 })
    expect(document.querySelector('.mz-dt__state')).toHaveTextContent('Nothing found')
    rerender(
      <DataTable
        columns={columns}
        data={[]}
        rowKey={(r) => r.id}
        total={0}
        error="Service unavailable"
        onRetry={() => {}}
        query={emptyQuery}
        onQueryChange={vi.fn()}
      />
    )
    expect(screen.getByText('Service unavailable')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy()
  })

  it('carries a slack column so resizing cannot squeeze the neighbours', () => {
    // With table-layout: fixed the browser spreads leftover width across every
    // column; the filler absorbs it so each column keeps its exact size.
    const { container } = table()
    expect(container.querySelector('col.mz-dt__col-filler')).not.toBeNull()
    expect(container.querySelector('th.mz-dt__th--filler')).not.toBeNull()
    expect(container.querySelectorAll('td.mz-dt__td--filler')).toHaveLength(rows.length)
  })

  it('spans full-width rows across the slack column too', () => {
    const { container } = table({ data: [], total: 0 })
    const cols = container.querySelectorAll('colgroup > col').length
    const stateRow = container.querySelector('.mz-dt__state')
    expect(stateRow).not.toBeNull()
    // colgroup width must match what the empty/skeleton rows claim to span.
    const skeleton = render(
      <DataTable
        columns={columns}
        data={[]}
        rowKey={(r) => r.id}
        total={0}
        loading
        query={emptyQuery}
        onQueryChange={vi.fn()}
      />
    )
    const span = skeleton.container.querySelector('tbody td')?.getAttribute('colspan')
    expect(Number(span)).toBe(cols)
  })

  it('takes a row class and extra row attributes from the host', () => {
    const { container } = table({
      rowClassName: (row) => (row.id === '1' ? 'is-deleted' : undefined),
      rowProps: (row) => ({ 'data-record': row.id, title: row.name }),
    })
    const rendered = container.querySelectorAll('tbody tr')
    expect(rendered[0]).toHaveClass('mz-dt__row', 'is-deleted')
    expect(rendered[0]).toHaveAttribute('data-record', '1')
    expect(rendered[0]).toHaveAttribute('title', 'First')
    expect(rendered[1]).not.toHaveClass('is-deleted')
  })

  it('runs the host row handler alongside onRowClick', async () => {
    const hostClick = vi.fn()
    const onRowClick = vi.fn()
    table({ onRowClick, rowProps: () => ({ onClick: hostClick }) })
    await userEvent.click(screen.getByText('First'))
    expect(hostClick).toHaveBeenCalledTimes(1)
    expect(onRowClick).toHaveBeenCalledWith(rows[0])
  })

  it('hides the rows-per-page control when the host fixes the page size', () => {
    const fixed = table({ pageSizeOptions: false })
    expect(fixed.container.querySelector('.mz-dt__pagination-size')).toBeNull()
    // The pager itself stays: the page count and the arrows still mean something.
    expect(fixed.container.querySelector('.mz-dt__pagination-nav')).not.toBeNull()
    fixed.unmount()

    // A single option is a control that cannot change anything either.
    const one = table({ pageSizeOptions: [25] })
    expect(one.container.querySelector('.mz-dt__pagination-size')).toBeNull()
    one.unmount()

    expect(table().container.querySelector('.mz-dt__pagination-size')).not.toBeNull()
  })

  it('exposes a resize handle as a focusable separator', () => {
    table()
    const handle = screen.getByRole('separator', { name: /Width of column “Name”/ })
    expect(handle).toHaveAttribute('tabindex', '0')
    expect(handle).toHaveAttribute('aria-orientation', 'vertical')
  })
})

describe('load more', () => {
  it('replaces the pager with a footer inside the scroller', () => {
    const { container } = table({ total: 100, onLoadMore: vi.fn() })
    const footer = container.querySelector('[data-slot="data-table-load-more"]')
    expect(footer).not.toBeNull()
    // An infinite scroll has to observe the footer against the table's own
    // scroller, which only works while it is a descendant of it.
    expect(container.querySelector('.mz-dt__scroller')?.contains(footer!)).toBe(true)
    expect(container.querySelector('.mz-dt__pagination')).toBeNull()
  })

  it('keeps the pager when the host asks for both', () => {
    const { container } = table({ total: 100, onLoadMore: vi.fn(), pagination: true })
    expect(container.querySelector('.mz-dt__pagination')).not.toBeNull()
  })

  it('stops offering more once everything is loaded', () => {
    const loaded = table({ total: rows.length, onLoadMore: vi.fn() })
    expect(loaded.container.querySelector('[data-slot="data-table-load-more"]')).toBeNull()
    loaded.unmount()
    const capped = table({ total: 100, hasMore: false, onLoadMore: vi.fn() })
    expect(capped.container.querySelector('[data-slot="data-table-load-more"]')).toBeNull()
  })

  it('asks once per batch of rows, however often it is triggered', async () => {
    const onLoadMore = vi.fn()
    table({ total: 100, onLoadMore })
    const button = screen.getByRole('button', { name: 'Load more' })
    await userEvent.click(button)
    await userEvent.click(button)
    // The second click is for rows that are already on their way — a host that
    // answers with nothing new would otherwise be asked forever.
    expect(onLoadMore).toHaveBeenCalledTimes(1)
  })
})

describe('custom filters', () => {
  it('counts a custom value as active only when it carries a constraint', () => {
    expect(isFilterActive({ type: 'custom', value: undefined })).toBe(false)
    expect(isFilterActive({ type: 'custom', value: '' })).toBe(false)
    expect(isFilterActive({ type: 'custom', value: [] })).toBe(false)
    expect(isFilterActive({ type: 'custom', value: ['a'], label: 'A' })).toBe(true)
    expect(isFilterActive({ type: 'custom', value: { id: 1 } })).toBe(true)
  })

  it('describes the chip with the label the widget supplied', () => {
    render(
      <DataTable
        columns={columns}
        data={rows}
        rowKey={(r) => r.id}
        total={2}
        query={{
          ...emptyQuery,
          filters: { name: { type: 'custom', value: ['a', 'b'], label: '2 selected' } },
        }}
        onQueryChange={vi.fn()}
      />
    )
    expect(document.querySelector('.mz-dt__chip')).toHaveTextContent('Name: 2 selected')
  })

  it('renders the host widget in the header popover and applies what it commits', async () => {
    const custom: DataTableColumn<Row>[] = [
      {
        id: 'name',
        header: 'Name',
        accessor: (r) => r.name,
        filter: {
          type: 'custom',
          render: ({ commit }) => (
            <button type="button" onClick={() => commit(['x'], 'X only')}>
              Pick X
            </button>
          ),
        },
      },
    ]
    const onQueryChange = vi.fn()
    render(
      <DataTable
        columns={custom}
        data={rows}
        rowKey={(r) => r.id}
        total={2}
        query={emptyQuery}
        onQueryChange={onQueryChange}
      />
    )
    await userEvent.click(screen.getByRole('button', { name: /Filter: Name/ }))
    await userEvent.click(await screen.findByRole('button', { name: 'Pick X' }))
    expect(onQueryChange).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: { name: { type: 'custom', value: ['x'], label: 'X only' } },
      })
    )
  })
})

describe('column auto-fit', () => {
  const fitColumns: DataTableColumn<Row>[] = [
    { id: 'a', header: 'A', width: 100 },
    { id: 'b', header: 'B', width: 200 },
    { id: 'c', header: 'C', width: 100, minWidth: 150 },
  ]

  it('stretches columns to fill the width exactly', () => {
    const { result } = renderHook(() => useColumnLayout({ columns: fitColumns }))
    act(() => result.current.fitTo(800))
    const total = fitColumns.reduce((sum, c) => sum + result.current.widthOf(c.id), 0)
    expect(total).toBe(800)
  })

  it('honours minWidth and hands the surplus to the rest', () => {
    const { result } = renderHook(() => useColumnLayout({ columns: fitColumns }))
    act(() => result.current.fitTo(500))
    // 'c' would scale to 125 but its floor is 150.
    expect(result.current.widthOf('c')).toBe(150)
    const total = fitColumns.reduce((sum, c) => sum + result.current.widthOf(c.id), 0)
    expect(total).toBe(500)
  })

  it('falls back to the declared widths when they do not fit', () => {
    const { result } = renderHook(() => useColumnLayout({ columns: fitColumns }))
    act(() => result.current.fitTo(200))
    expect(result.current.widthOf('a')).toBe(100)
    expect(result.current.widthOf('b')).toBe(200)
  })

  it('is derived from the declared widths, so it never drifts', () => {
    const { result } = renderHook(() => useColumnLayout({ columns: fitColumns }))
    act(() => result.current.fitTo(900))
    const wide = fitColumns.map((c) => result.current.widthOf(c.id))
    act(() => result.current.fitTo(300))
    act(() => result.current.fitTo(900))
    expect(fitColumns.map((c) => result.current.widthOf(c.id))).toEqual(wide)
  })

  it('leaves a hand-resized column alone', () => {
    const { result } = renderHook(() => useColumnLayout({ columns: fitColumns }))
    act(() => result.current.setWidth('b', 400))
    act(() => result.current.fitTo(900))
    expect(result.current.widthOf('b')).toBe(400)
  })

  it('reports one user action to the host once, not once per updater run', () => {
    // React may run a state updater more than once for a single commit, and
    // under StrictMode it always does. Persisting from inside it wrote the
    // layout twice and told the host about one resize twice.
    const onLayoutChange = vi.fn()
    const { result } = renderHook(
      () => useColumnLayout({ columns: fitColumns, onLayoutChange }),
      { wrapper: StrictMode }
    )
    act(() => result.current.setWidth('b', 300))
    expect(onLayoutChange).toHaveBeenCalledTimes(1)
    expect(onLayoutChange.mock.calls[0]![0].widths.b).toBe(300)
  })

  it('writes the layout to storage once per change', () => {
    const key = 'test.layout.once'
    window.localStorage.removeItem(key)
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    const { result } = renderHook(
      () => useColumnLayout({ columns: fitColumns, persistKey: key }),
      { wrapper: StrictMode }
    )
    act(() => result.current.setWidth('b', 300))
    expect(setItem.mock.calls.filter(([k]) => k === key)).toHaveLength(1)
    setItem.mockRestore()
    window.localStorage.removeItem(key)
  })

  it('builds two updates in the same tick on each other', () => {
    const { result } = renderHook(() => useColumnLayout({ columns: fitColumns }))
    act(() => {
      result.current.setWidth('a', 111)
      result.current.setWidth('b', 222)
    })
    expect(result.current.widthOf('a')).toBe(111)
    expect(result.current.widthOf('b')).toBe(222)
  })

  it('keeps auto-fit out of storage and out of the host callback', () => {
    const onLayoutChange = vi.fn()
    const { result } = renderHook(() => useColumnLayout({ columns: fitColumns, onLayoutChange }))
    act(() => result.current.fitTo(800))
    expect(onLayoutChange).not.toHaveBeenCalled()
  })

  it('leaves a column with flex: false at its declared width', () => {
    const columnsWithFixed: DataTableColumn<Row>[] = [
      { id: 'a', header: 'A', width: 100 },
      { id: 'actions', header: '', width: 60, flex: false },
    ]
    const { result } = renderHook(() => useColumnLayout({ columns: columnsWithFixed }))
    act(() => result.current.fitTo(500))
    expect(result.current.widthOf('actions')).toBe(60)
    expect(result.current.widthOf('a')).toBe(440)
  })
})
