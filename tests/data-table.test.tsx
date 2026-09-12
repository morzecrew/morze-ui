import { StrictMode, act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createEvent, fireEvent, render, renderHook, screen } from '@testing-library/react'
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
    expect(container.querySelector('.mz-dt__state')).not.toBeNull()
    // The detail panel is the row that still spans everything, and the
    // colgroup width is what it has to agree with — a span one short leaves
    // the slack column outside the panel. (The first-load placeholder used to
    // span too; it draws a cell per column now — see G-14.)
    const expanded = render(
      <DataTable
        columns={columns}
        data={rows}
        rowKey={(r) => r.id}
        total={rows.length}
        query={emptyQuery}
        onQueryChange={vi.fn()}
        renderExpanded={() => <span>details</span>}
        expanded={[rows[0]!.id]}
      />
    )
    const cols = expanded.container.querySelectorAll('colgroup > col').length
    const span = expanded.container
      .querySelector('.mz-dt__td--expanded')
      ?.getAttribute('colspan')
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

describe('column manager', () => {
  type Wide = { id: string; a: string }
  const wideRows: Wide[] = [{ id: '1', a: 'x' }]
  const wideColumns: DataTableColumn<Wide>[] = [
    { id: 'num', header: '#', label: 'Number', pinned: 'left', accessor: (r) => r.id },
    { id: 'name', header: 'Name', accessor: (r) => r.a },
    { id: 'blank', header: '', accessor: () => 'b' },
    { id: 'node', header: <b>X</b>, accessor: () => 'n' },
  ]

  const manager = async (props: Partial<React.ComponentProps<typeof DataTable<Wide>>> = {}) => {
    const user = userEvent.setup()
    render(
      <DataTable
        columns={wideColumns}
        data={wideRows}
        rowKey={(r) => r.id}
        total={1}
        query={emptyQuery}
        onQueryChange={vi.fn()}
        {...props}
      />
    )
    await user.click(screen.getByRole('button', { name: /Columns/ }))
    return user
  }

  const listed = () =>
    Array.from(document.querySelectorAll('.mz-dt__columns-label')).map((n) => n.textContent)
  const painted = () =>
    Array.from(document.querySelectorAll('.mz-dt__th')).map((n) => n.textContent?.trim())

  it('names a column with no text header after its position', async () => {
    // A header may be a node, and an id is a developer's string — both used to
    // reach the list as a blank row or as a raw `node`.
    await manager()
    expect(listed()).toEqual(['Number', 'Name', '#3', '#4'])
  })

  it('lists the columns in the order the table paints them', async () => {
    // The list showed the raw order, so a column dragged to the top of it
    // landed second on screen, behind whatever was pinned.
    const user = await manager()
    const headerOf: Record<string, string> = { Number: '#', Name: 'Name', '#3': '', '#4': 'X' }
    const agrees = () => expect(listed().map((l) => headerOf[l!])).toEqual(painted().slice(0, 4))
    agrees()
    await user.click(screen.getByRole('button', { name: /Move “#4” up/ }))
    agrees()
    expect(listed()).toEqual(['Number', 'Name', '#4', '#3'])
  })

  it('keeps a move inside the column’s own pin group', async () => {
    const user = await manager()
    // "Name" is the first loose column: it cannot climb over the pinned one,
    // which is what used to reorder the layout without moving anything on
    // screen. Its own group still moves.
    expect(screen.getByRole('button', { name: /Move “Name” up/ })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: /Move “Name” down/ }))
    expect(listed()).toEqual(['Number', '#3', 'Name', '#4'])
    expect(painted().slice(0, 4)).toEqual(['#', '', 'Name', 'X'])
  })

  it('does not start a drag from the row’s own buttons', async () => {
    await manager()
    const eye = screen.getAllByRole('button', { name: /Hide|Show/ })[3]!
    const start = createEvent.dragStart(eye)
    fireEvent(eye, start)
    expect(start.defaultPrevented).toBe(true)
  })

  it('drops a dragged column onto a target in the same group', async () => {
    await manager()
    const items = Array.from(document.querySelectorAll('.mz-dt__columns-item'))
    fireEvent.dragStart(items[3]!)
    fireEvent.dragOver(items[1]!)
    fireEvent.drop(items[1]!)
    expect(listed()).toEqual(['Number', '#4', 'Name', '#3'])
  })

  it('refuses a drop across the pin boundary', async () => {
    await manager()
    const items = Array.from(document.querySelectorAll('.mz-dt__columns-item'))
    fireEvent.dragStart(items[1]!)
    const over = createEvent.dragOver(items[0]!)
    fireEvent(items[0]!, over)
    // Not preventing the dragover is what tells the browser this is no target.
    expect(over.defaultPrevented).toBe(false)
    fireEvent.drop(items[0]!)
    expect(listed()).toEqual(['Number', 'Name', '#3', '#4'])
  })

  it('hides the button — and an empty toolbar with it — on columnManager={false}', async () => {
    render(
      <DataTable
        columns={wideColumns}
        data={wideRows}
        rowKey={(r) => r.id}
        total={1}
        query={emptyQuery}
        onQueryChange={vi.fn()}
        columnManager={false}
      />
    )
    expect(screen.queryByRole('button', { name: /Columns/ })).toBeNull()
    expect(document.querySelector('.mz-dt__toolbar')).toBeNull()
  })

  it('still shows the toolbar for a host’s own controls without the button', () => {
    render(
      <DataTable
        columns={wideColumns}
        data={wideRows}
        rowKey={(r) => r.id}
        total={1}
        query={emptyQuery}
        onQueryChange={vi.fn()}
        columnManager={false}
        toolbar={<input aria-label="Search" />}
      />
    )
    expect(screen.getByLabelText('Search')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Columns/ })).toBeNull()
  })
})

describe('header state', () => {
  it('marks a filtering column active so the trigger can carry the brand colour', () => {
    render(
      <DataTable
        columns={columns}
        data={rows}
        rowKey={(r) => r.id}
        total={2}
        query={{ ...emptyQuery, filters: { name: { type: 'text', value: 'abc' } } }}
        onQueryChange={vi.fn()}
      />
    )
    expect(document.querySelector('.mz-dt__filter')).toHaveAttribute('data-active', 'true')
  })
})

describe('layout hook with an inline columns array', () => {
  it('does not re-render itself forever', () => {
    // A host almost never memoises `columns`, so the hook sees a new array on
    // every render. Keying the baseline on that identity made the hook commit
    // a fresh layout each time, which re-rendered the host, which built the
    // array again. The counter fails the test instead of hanging the run.
    let renders = 0
    const { result } = renderHook(() => {
      renders += 1
      if (renders > 50) throw new Error(`render loop: ${renders} renders`)
      return useColumnLayout({ columns: [{ id: 'a', header: 'A' }, { id: 'b', header: 'B' }] })
    })
    expect(renders).toBeLessThan(10)
    expect(result.current.visible.map((c) => c.id)).toEqual(['a', 'b'])
  })

  it('still picks up a genuine change to the columns', () => {
    const { result, rerender } = renderHook(
      ({ ids }: { ids: string[] }) =>
        useColumnLayout({ columns: ids.map((id) => ({ id, header: id })) }),
      { initialProps: { ids: ['a', 'b'] } }
    )
    rerender({ ids: ['a', 'b', 'c'] })
    expect(result.current.visible.map((c) => c.id)).toEqual(['a', 'b', 'c'])
  })
})

describe('pagination without a total', () => {
  const pager = (props: Partial<React.ComponentProps<typeof DataTable<Row>>> = {}) => {
    const onQueryChange = vi.fn()
    render(
      <DataTable
        columns={columns}
        data={rows}
        rowKey={(r) => r.id}
        query={{ ...emptyQuery, pageSize: 2 }}
        onQueryChange={onQueryChange}
        {...props}
      />
    )
    return { onQueryChange }
  }

  it('lets the reader off page one when the page came back full', async () => {
    const { onQueryChange } = pager()
    const next = screen.getByLabelText('Next page')
    expect(next).toBeEnabled()
    await userEvent.click(next)
    expect(onQueryChange).toHaveBeenCalledWith(expect.objectContaining({ page: 2 }))
  })

  it('stops at a partial page, because that is the last one', () => {
    pager({ data: rows.slice(0, 1) })
    expect(screen.getByLabelText('Next page')).toBeDisabled()
  })

  it('hides the jump-to-last control, which has nothing to point at', () => {
    pager()
    expect(screen.queryByLabelText('Last page')).toBeNull()
    expect(screen.getByLabelText('First page')).toBeInTheDocument()
  })

  it('keeps the last page reachable when the total is known', () => {
    render(
      <DataTable
        columns={columns}
        data={rows}
        rowKey={(r) => r.id}
        total={9}
        query={{ ...emptyQuery, pageSize: 2 }}
        onQueryChange={vi.fn()}
      />
    )
    expect(screen.getByLabelText('Last page')).toBeEnabled()
    expect(screen.getByText('1 / 5')).toBeInTheDocument()
  })
})

describe('bulk bar', () => {
  const withSelection = (selection: { keys: string[]; allMatching: boolean }, total?: number) =>
    render(
      <DataTable
        columns={columns}
        data={rows}
        rowKey={(r) => r.id}
        total={total}
        query={emptyQuery}
        onQueryChange={vi.fn()}
        selection={selection}
        onSelectionChange={vi.fn()}
        bulkActions={() => <button type="button">Archive</button>}
      />
    )

  it('shows for explicitly ticked rows', () => {
    withSelection({ keys: ['1'], allMatching: false }, 2)
    expect(screen.getByRole('region', { name: 'Actions for the selected rows' })).toBeInTheDocument()
  })

  it('survives the escalation to every matching row', () => {
    // The count is unknowable in this mode, so it used to read as "nothing
    // selected" and took the actions — and the only way out — off screen.
    withSelection({ keys: ['1', '2'], allMatching: true }, 137)
    expect(screen.getByRole('region', { name: 'Actions for the selected rows' })).toBeInTheDocument()
    expect(screen.getByText('Archive')).toBeInTheDocument()
    expect(screen.getByText('Clear selection')).toBeInTheDocument()
    expect(document.querySelector('.mz-dt__bulkbar-count')).toHaveTextContent(
      'Selected: 137 (all matching)'
    )
  })

  it('names the mode instead of guessing a number when the total is unknown', () => {
    withSelection({ keys: ['1'], allMatching: true })
    expect(screen.getByRole('region', { name: 'Actions for the selected rows' })).toBeInTheDocument()
    expect(screen.getByText('(all matching)')).toBeInTheDocument()
    expect(screen.queryByText(/Selected: 0/)).toBeNull()
  })

  it('stays away when nothing is selected', () => {
    withSelection({ keys: [], allMatching: false }, 2)
    expect(screen.queryByRole('region', { name: 'Actions for the selected rows' })).toBeNull()
  })
})

describe('load more across query changes', () => {
  const page = (prefix: string): Row[] => [
    { id: `${prefix}1`, name: `${prefix} one`, sum: 1 },
    { id: `${prefix}2`, name: `${prefix} two`, sum: 2 },
  ]

  it('asks again for a new result set that is as long as the last one', async () => {
    // The batch guard remembered the row count of the last request and never
    // let go of it. A filter change whose first page is as long as the rows
    // already on screen — and a first page nearly always is a full one — then
    // matched the guard, and nothing ever asked for more again.
    const onLoadMore = vi.fn()
    const first = { ...emptyQuery, pageSize: 2 }
    const { rerender } = render(
      <DataTable
        columns={columns}
        data={page('a')}
        rowKey={(r) => r.id}
        total={100}
        query={first}
        onQueryChange={vi.fn()}
        onLoadMore={onLoadMore}
        autoLoadMore={false}
      />
    )
    await userEvent.click(screen.getByRole('button', { name: 'Load more' }))
    expect(onLoadMore).toHaveBeenCalledTimes(1)

    const filtered = { ...first, filters: { name: { type: 'text' as const, value: 'b' } } }
    rerender(
      <DataTable
        columns={columns}
        data={page('b')}
        rowKey={(r) => r.id}
        total={100}
        query={filtered}
        onQueryChange={vi.fn()}
        onLoadMore={onLoadMore}
        autoLoadMore={false}
      />
    )
    await userEvent.click(screen.getByRole('button', { name: 'Load more' }))
    expect(onLoadMore).toHaveBeenCalledTimes(2)
  })

  it('still asks once per batch while the query stands', async () => {
    const onLoadMore = vi.fn()
    const query = { ...emptyQuery, pageSize: 2 }
    const { rerender } = render(
      <DataTable columns={columns} data={page('a')} rowKey={(r) => r.id} total={100}
        query={query} onQueryChange={vi.fn()} onLoadMore={onLoadMore} autoLoadMore={false} />
    )
    await userEvent.click(screen.getByRole('button', { name: 'Load more' }))
    // The host re-renders with the same rows while the request is in flight.
    rerender(
      <DataTable columns={columns} data={page('a')} rowKey={(r) => r.id} total={100} loading
        query={query} onQueryChange={vi.fn()} onLoadMore={onLoadMore} autoLoadMore={false} />
    )
    rerender(
      <DataTable columns={columns} data={page('a')} rowKey={(r) => r.id} total={100}
        query={query} onQueryChange={vi.fn()} onLoadMore={onLoadMore} autoLoadMore={false} />
    )
    await userEvent.click(screen.getByRole('button', { name: 'Load more' }))
    expect(onLoadMore).toHaveBeenCalledTimes(1)
  })
})

describe('auto-fit with a controlled layout', () => {
  const fitColumns: DataTableColumn<Row>[] = [
    { id: 'a', header: 'A', width: 100 },
    { id: 'b', header: 'B', width: 200 },
    { id: 'c', header: 'C', width: 100 },
  ]

  it('still stretches the columns when the host owns the layout', () => {
    // Fit used to be written into the hook's own state, which the controlled
    // branch never reads — a host that owned the layout got no auto-fit at all.
    const onLayoutChange = vi.fn()
    const { result } = renderHook(() =>
      useColumnLayout({
        columns: fitColumns,
        layout: { widths: { a: 100, b: 200, c: 100 } },
        onLayoutChange,
      })
    )
    act(() => result.current.fitTo(800))
    const total = fitColumns.reduce((sum, c) => sum + result.current.widthOf(c.id), 0)
    expect(total).toBe(800)
    // Fit is derived from the container, so the host is still not told.
    expect(onLayoutChange).not.toHaveBeenCalled()
  })

  it('lets a width the host set by hand win over the fit', () => {
    const { result } = renderHook(() =>
      useColumnLayout({
        columns: fitColumns,
        layout: { widths: { a: 100, b: 333, c: 100 }, sized: ['b'] },
      })
    )
    act(() => result.current.fitTo(800))
    expect(result.current.widthOf('b')).toBe(333)
    expect(result.current.widthOf('a') + result.current.widthOf('c')).toBe(800 - 333)
  })

  it('keeps fitted widths out of storage on the next user action', () => {
    // They used to ride into localStorage with the next resize, so a saved
    // layout depended on the last window it happened to be fitted in.
    const key = 'test.layout.fit'
    window.localStorage.removeItem(key)
    const { result } = renderHook(() => useColumnLayout({ columns: fitColumns, persistKey: key }))
    act(() => result.current.fitTo(800))
    act(() => result.current.setWidth('a', 120))
    const stored = JSON.parse(window.localStorage.getItem(key)!) as { widths: Record<string, number> }
    expect(stored.widths.a).toBe(120)
    expect(stored.widths.b).toBe(200)
    window.localStorage.removeItem(key)
  })
})

describe('auto-fit inside the table', () => {
  const fitColumns: DataTableColumn<Row>[] = [
    { id: 'a', header: 'A', width: 100 },
    { id: 'b', header: 'B', width: 300 },
  ]
  const widthVar = (container: HTMLElement, id: string) =>
    parseFloat((container.querySelector('.mz-dt') as HTMLElement).style.getPropertyValue(`--mz-dt-w-${id}`))
  let original: PropertyDescriptor | undefined

  beforeEach(() => {
    // happy-dom has no layout engine; the scroller's width is supplied here.
    original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth')
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
      configurable: true,
      get(this: HTMLElement) {
        return this.classList.contains('mz-dt__scroller') ? 1002 : 0
      },
    })
  })
  afterEach(() => {
    if (original) Object.defineProperty(HTMLElement.prototype, 'clientWidth', original)
    else delete (HTMLElement.prototype as { clientWidth?: number }).clientWidth
  })

  it('fills the container on mount, leaves a hand resize alone, and refits after a reset', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <DataTable columns={fitColumns} data={rows} rowKey={(r) => r.id} total={2} query={emptyQuery} onQueryChange={vi.fn()} />
    )
    // 1002px minus the 2px the table keeps for its border, split 1:3.
    expect(widthVar(container, 'a')).toBe(250)
    expect(widthVar(container, 'b')).toBe(750)

    // A hand resize takes the column out of the fit; the neighbour stays put.
    screen.getByRole('separator', { name: /Width of column “A”/ }).focus()
    await user.keyboard('{ArrowRight}')
    expect(widthVar(container, 'a')).toBe(258)
    expect(widthVar(container, 'b')).toBe(750)

    // Reset hands every column back to the fit, which has to run again even
    // though the container has not moved.
    await user.click(screen.getByRole('button', { name: /Columns/ }))
    await user.click(await screen.findByRole('button', { name: 'Reset' }))
    expect(widthVar(container, 'a')).toBe(250)
    expect(widthVar(container, 'b')).toBe(750)
  })
})

describe('inside a form', () => {
  it('never submits the form from its own buttons', async () => {
    // Fourteen internal buttons had no type, and a button's default is submit.
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault())
    render(
      <form onSubmit={onSubmit}>
        <DataTable
          columns={columns}
          data={rows}
          rowKey={(r) => r.id}
          total={100}
          query={{ ...emptyQuery, pageSize: 2 }}
          onQueryChange={vi.fn()}
          selection={{ keys: ['1'], allMatching: false }}
          onSelectionChange={vi.fn()}
        />
      </form>
    )
    await userEvent.click(screen.getByLabelText('Next page'))
    await userEvent.click(screen.getByLabelText('Last page'))
    await userEvent.click(screen.getByRole('button', { name: 'Clear selection' }))
    expect(onSubmit).not.toHaveBeenCalled()
    for (const button of document.querySelectorAll<HTMLButtonElement>('.mz-dt button.mz-btn')) {
      expect(button).toHaveAttribute('type', 'button')
    }
  })
})

describe('date filter ids', () => {
  it('gives each date filter its own field ids', async () => {
    // The ids were fixed strings, so two date filters on one page shared them
    // and a label pointed at whichever input came first in the document.
    const dated: DataTableColumn<Row>[] = [
      { id: 'created', header: 'Created', filter: { type: 'date-range' } },
      { id: 'updated', header: 'Updated', filter: { type: 'date-range' } },
    ]
    const user = userEvent.setup()
    render(
      <DataTable columns={dated} data={rows} rowKey={(r) => r.id} total={2} query={emptyQuery} onQueryChange={vi.fn()} />
    )
    await user.click(screen.getByTitle('Filter: Created'))
    const first = (await screen.findAllByLabelText('From')).at(-1)!.id
    await user.keyboard('{Escape}')
    await user.click(screen.getByTitle('Filter: Updated'))
    const second = (await screen.findAllByLabelText('From')).at(-1)!.id
    expect(first).toBeTruthy()
    expect(second).toBeTruthy()
    expect(first).not.toBe(second)
    expect(first).not.toBe('mz-dt-from')
  })
})

describe('sort semantics', () => {
  it('claims aria-sort only where a column can be sorted', () => {
    // To assistive tech `aria-sort="none"` says "sortable, not sorted yet".
    const mixed: DataTableColumn<Row>[] = [
      { id: 'name', header: 'Name', sortable: true },
      { id: 'sum', header: 'Total' },
    ]
    render(
      <DataTable columns={mixed} data={rows} rowKey={(r) => r.id} total={2} query={emptyQuery} onQueryChange={vi.fn()} />
    )
    expect(screen.getByRole('columnheader', { name: /Name/ })).toHaveAttribute('aria-sort', 'none')
    expect(screen.getByRole('columnheader', { name: /Total/ })).not.toHaveAttribute('aria-sort')
  })
})

/* ==========================================================================
   P1 — the 2026-09 review. Each block names the finding it closes.
   ========================================================================== */

describe('scroller height and frame (D-05, V-08)', () => {
  it('gives the scroller something to stick the header against', () => {
    // `stickyHeader` is measured against the scroller, and the scroller had
    // no height to scroll within — it simply grew with its content, so the
    // header never stuck and there was no prop to say otherwise.
    const { container, rerender } = render(
      <DataTable
        columns={columns}
        data={rows}
        rowKey={(r) => r.id}
        total={2}
        query={emptyQuery}
        onQueryChange={vi.fn()}
        maxHeight={420}
      />
    )
    const root = container.querySelector('[data-slot="data-table"]') as HTMLElement
    expect(root.style.getPropertyValue('--mz-dt-max-h')).toBe('420px')

    rerender(
      <DataTable
        columns={columns}
        data={rows}
        rowKey={(r) => r.id}
        total={2}
        query={emptyQuery}
        onQueryChange={vi.fn()}
        height="60vh"
        fill
        frame="plain"
      />
    )
    expect(root.style.getPropertyValue('--mz-dt-h')).toBe('60vh')
    expect(root.className).toContain('mz-dt--fill')
    expect(root.className).toContain('mz-dt--plain')
  })
})

describe('header hints and sort direction (D-08)', () => {
  it('shows a column hint on a sortable column too', async () => {
    // `title` was taken by the sort hint there, so `headerTitle` silently did
    // nothing on exactly the columns readers ask about.
    const hinted: DataTableColumn<Row>[] = [
      { id: 'sum', header: 'Total', sortable: true, headerTitle: 'Net of VAT' },
    ]
    render(
      <DataTable columns={hinted} data={rows} rowKey={(r) => r.id} total={2} query={emptyQuery} onQueryChange={vi.fn()} />
    )
    expect(screen.getByTitle('Net of VAT')).toBeInTheDocument()
  })

  it('starts an amount column at the big end', async () => {
    const descFirst: DataTableColumn<Row>[] = [
      { id: 'sum', header: 'Total', sortable: true, sortDescFirst: true },
    ]
    const onQueryChange = vi.fn()
    const user = userEvent.setup()
    render(
      <DataTable columns={descFirst} data={rows} rowKey={(r) => r.id} total={2} query={emptyQuery} onQueryChange={onQueryChange} />
    )
    await user.click(screen.getByRole('button', { name: /Total/ }))
    expect(onQueryChange.mock.calls[0]![0].sort).toEqual([{ id: 'sum', dir: 'desc' }])
  })
})

describe('filter chips (D-07, D-12, G-08)', () => {
  it('prints a range in the reader’s locale, with its unit', () => {
    const priced: DataTableColumn<Row>[] = [
      { id: 'sum', header: 'Total', filter: { type: 'number-range', unit: '₽' } },
    ]
    render(
      <DataTable
        columns={priced}
        data={rows}
        rowKey={(r) => r.id}
        total={2}
        locale="ru-RU"
        query={{ ...emptyQuery, filters: { sum: { type: 'number-range', min: 1000, max: 25000 } } }}
        onQueryChange={vi.fn()}
      />
    )
    // Grouped by the locale, and carrying the unit the column declared —
    // `unit` was accepted by the type and read by nothing.
    const chip = document.querySelector('.mz-dt__chip')!
    expect(chip.textContent).toContain('₽')
    expect(chip.textContent).toContain((1000).toLocaleString('ru-RU'))
    expect(chip.textContent).toContain((25000).toLocaleString('ru-RU'))
  })

  it('writes a day the way the locale does, not as the wire format', () => {
    const dated: DataTableColumn<Row>[] = [{ id: 'name', header: 'Created', filter: { type: 'date-range' } }]
    render(
      <DataTable
        columns={dated}
        data={rows}
        rowKey={(r) => r.id}
        total={2}
        locale="ru-RU"
        query={{ ...emptyQuery, filters: { name: { type: 'date-range', from: '2026-03-01' } } }}
        onQueryChange={vi.fn()}
      />
    )
    const chip = document.querySelector('.mz-dt__chip')!
    expect(chip.textContent).toContain(new Date(2026, 2, 1).toLocaleDateString('ru-RU'))
    // And it is still the first of March west of Greenwich: the ISO string is
    // parsed on the local calendar, not through UTC midnight.
    expect(chip.textContent).not.toContain('2026-03-01')
  })

  it('closes a long value list instead of spilling it across the row', () => {
    const many: DataTableColumn<Row>[] = [
      {
        id: 'name',
        header: 'Status',
        filter: {
          type: 'select',
          options: ['a', 'b', 'c', 'd', 'e'].map((v) => ({ value: v, label: v.toUpperCase() })),
        },
      },
    ]
    render(
      <DataTable
        columns={many}
        data={rows}
        rowKey={(r) => r.id}
        total={2}
        query={{ ...emptyQuery, filters: { name: { type: 'select', value: ['a', 'b', 'c', 'd', 'e'] } } }}
        onQueryChange={vi.fn()}
      />
    )
    const chip = document.querySelector('.mz-dt__chip')!
    expect(chip.textContent).toContain('A, B, C')
    expect(chip.textContent).toContain('+2')
    expect(chip.textContent).not.toContain('D')
  })
})

describe('filter semantics (D-13)', () => {
  it('offers one-of-two as radios rather than checkboxes that act like them', async () => {
    const flagged: DataTableColumn<Row>[] = [{ id: 'name', header: 'Paid', filter: { type: 'boolean' } }]
    const user = userEvent.setup()
    render(
      <DataTable columns={flagged} data={rows} rowKey={(r) => r.id} total={2} query={emptyQuery} onQueryChange={vi.fn()} />
    )
    await user.click(screen.getByTitle('Filter: Paid'))
    expect(await screen.findByRole('radiogroup')).toBeInTheDocument()
    expect(screen.getAllByRole('radio')).toHaveLength(2)
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
  })

  it('does the same for a single-choice select', async () => {
    const single: DataTableColumn<Row>[] = [
      {
        id: 'name',
        header: 'Status',
        filter: { type: 'select', multiple: false, options: [{ value: 'a', label: 'A' }] },
      },
    ]
    const user = userEvent.setup()
    render(
      <DataTable columns={single} data={rows} rowKey={(r) => r.id} total={2} query={emptyQuery} onQueryChange={vi.fn()} />
    )
    await user.click(screen.getByTitle('Filter: Status'))
    expect(await screen.findByRole('radiogroup')).toBeInTheDocument()
  })
})

describe('text filter operators (G-08)', () => {
  it('sends the chosen operator along with the value', async () => {
    const withOps: DataTableColumn<Row>[] = [
      { id: 'name', header: 'Name', filter: { type: 'text', ops: ['contains', 'equals'] } },
    ]
    const onQueryChange = vi.fn()
    const user = userEvent.setup()
    render(
      <DataTable columns={withOps} data={rows} rowKey={(r) => r.id} total={2} query={emptyQuery} onQueryChange={onQueryChange} />
    )
    await user.click(screen.getByTitle('Filter: Name'))
    await user.click(await screen.findByRole('button', { name: 'Equals' }))
    await user.type(screen.getByPlaceholderText('Contains…'), 'Ivanov')
    await user.click(screen.getByRole('button', { name: 'Apply' }))
    expect(onQueryChange.mock.calls.at(-1)![0].filters.name).toEqual({
      type: 'text',
      value: 'Ivanov',
      op: 'equals',
    })
  })

  it('leaves the value operator-free when the column offers no choice', async () => {
    const onQueryChange = vi.fn()
    const user = userEvent.setup()
    table({ onQueryChange } as never)
    await user.click(screen.getByTitle('Filter: Name'))
    await user.type(await screen.findByPlaceholderText('Contains…'), 'x')
    await user.click(screen.getByRole('button', { name: 'Apply' }))
    expect(onQueryChange.mock.calls.at(-1)![0].filters.name).toEqual({ type: 'text', value: 'x', op: undefined })
  })
})

describe('inline editing (D-11)', () => {
  it('renders the reason a save was refused instead of hiding it in a title', async () => {
    const editable: DataTableColumn<Row>[] = [
      {
        id: 'name',
        header: 'Name',
        accessor: (r) => r.name,
        editable: {
          type: 'text',
          value: (r) => r.name,
          onSave: () => Promise.reject(new Error('Period is closed')),
        },
      },
    ]
    const user = userEvent.setup()
    render(
      <DataTable columns={editable} data={rows} rowKey={(r) => r.id} total={2} query={emptyQuery} onQueryChange={vi.fn()} />
    )
    await user.dblClick(screen.getAllByText('First')[0]!)
    const input = screen.getByDisplayValue('First')
    await user.clear(input)
    await user.type(input, 'Changed{Enter}')
    const message = await screen.findByRole('status')
    expect(message).toHaveTextContent('Period is closed')
    // And what the reader typed is still there to correct.
    expect(screen.getByDisplayValue('Changed')).toBeInTheDocument()
  })

  it('leaves a row its own rule says is not editable alone', async () => {
    const onSave = vi.fn()
    const guarded: DataTableColumn<Row>[] = [
      {
        id: 'name',
        header: 'Name',
        accessor: (r) => r.name,
        editable: { type: 'text', value: (r) => r.name, onSave, canEdit: (r) => r.id !== '1' },
      },
    ]
    const user = userEvent.setup()
    render(
      <DataTable columns={guarded} data={rows} rowKey={(r) => r.id} total={2} query={emptyQuery} onQueryChange={vi.fn()} />
    )
    await user.dblClick(screen.getAllByText('First')[0]!)
    expect(screen.queryByDisplayValue('First')).not.toBeInTheDocument()
    await user.dblClick(screen.getAllByText('Second')[0]!)
    expect(screen.getByDisplayValue('Second')).toBeInTheDocument()
  })
})

describe('row activation (G-02)', () => {
  it('does not open the record from a control inside a cell', async () => {
    const onRowClick = vi.fn()
    const onDelete = vi.fn()
    const withAction: DataTableColumn<Row>[] = [
      { id: 'name', header: 'Name', accessor: (r) => r.name },
      { id: 'sum', header: '', cell: () => <button type="button" onClick={onDelete}>Delete</button> },
    ]
    const user = userEvent.setup()
    render(
      <DataTable
        columns={withAction}
        data={rows}
        rowKey={(r) => r.id}
        total={2}
        query={emptyQuery}
        onQueryChange={vi.fn()}
        onRowClick={onRowClick}
      />
    )
    await user.click(screen.getAllByRole('button', { name: 'Delete' })[0]!)
    expect(onDelete).toHaveBeenCalledTimes(1)
    // The row used to open behind the dialog the delete button had raised.
    expect(onRowClick).not.toHaveBeenCalled()

    await user.click(screen.getByText('First'))
    expect(onRowClick).toHaveBeenCalledTimes(1)
  })
})

describe('expansion (G-03)', () => {
  it('can be driven from outside the table', async () => {
    const onExpandedChange = vi.fn()
    const user = userEvent.setup()
    const { rerender } = render(
      <DataTable
        columns={columns}
        data={rows}
        rowKey={(r) => r.id}
        total={2}
        query={emptyQuery}
        onQueryChange={vi.fn()}
        renderExpanded={(row) => <span>Details for {row.name}</span>}
        expanded={[]}
        onExpandedChange={onExpandedChange}
      />
    )
    await user.click(screen.getAllByRole('button', { name: 'Expand' })[0]!)
    expect(onExpandedChange).toHaveBeenCalledWith(['1'])
    // Controlled: nothing opens until the host says so.
    expect(screen.queryByText('Details for First')).not.toBeInTheDocument()

    rerender(
      <DataTable
        columns={columns}
        data={rows}
        rowKey={(r) => r.id}
        total={2}
        query={emptyQuery}
        onQueryChange={vi.fn()}
        renderExpanded={(row) => <span>Details for {row.name}</span>}
        expanded={['1']}
        onExpandedChange={onExpandedChange}
      />
    )
    expect(screen.getByText('Details for First')).toBeInTheDocument()
  })

  it('opens every row on the page at once', async () => {
    const user = userEvent.setup()
    render(
      <DataTable
        columns={columns}
        data={rows}
        rowKey={(r) => r.id}
        total={2}
        query={emptyQuery}
        onQueryChange={vi.fn()}
        renderExpanded={(row) => <span>Details for {row.name}</span>}
      />
    )
    await user.click(screen.getByRole('button', { name: 'Expand all' }))
    expect(screen.getByText('Details for First')).toBeInTheDocument()
    expect(screen.getByText('Details for Second')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Collapse all' }))
    expect(screen.queryByText('Details for First')).not.toBeInTheDocument()
  })

  it('opens a row from the row itself when asked to', async () => {
    const user = userEvent.setup()
    render(
      <DataTable
        columns={columns}
        data={rows}
        rowKey={(r) => r.id}
        total={2}
        query={emptyQuery}
        onQueryChange={vi.fn()}
        renderExpanded={(row) => <span>Details for {row.name}</span>}
        expandOnRowClick
      />
    )
    await user.click(screen.getByText('First'))
    expect(screen.getByText('Details for First')).toBeInTheDocument()
  })
})

describe('global search (G-04)', () => {
  it('puts the box’s value in the query and resets the page', async () => {
    vi.useFakeTimers()
    try {
      const onQueryChange = vi.fn()
      render(
        <DataTable
          columns={columns}
          data={rows}
          rowKey={(r) => r.id}
          total={2}
          query={{ ...emptyQuery, page: 4 }}
          onQueryChange={onQueryChange}
          search
        />
      )
      fireEvent.change(screen.getByLabelText('Search…'), { target: { value: 'inv-42' } })
      // Debounced: one request for a word, not one per letter.
      expect(onQueryChange).not.toHaveBeenCalled()
      act(() => void vi.advanceTimersByTime(400))
      expect(onQueryChange).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'inv-42', page: 1 })
      )
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('summary row (G-05)', () => {
  it('adds up the rows the table holds', () => {
    const summed: DataTableColumn<Row>[] = [
      { id: 'name', header: 'Name', accessor: (r) => r.name },
      {
        id: 'sum',
        header: 'Total',
        accessor: (r) => r.sum,
        align: 'right',
        footer: (list) => list.reduce((total, row) => total + row.sum, 0),
      },
    ]
    const { container } = render(
      <DataTable columns={summed} data={rows} rowKey={(r) => r.id} total={2} query={emptyQuery} onQueryChange={vi.fn()} summary />
    )
    expect(container.querySelector('tfoot')!.textContent).toContain('300')
  })

  it('stays away unless a column has something to put in it', () => {
    const { container } = render(
      <DataTable columns={columns} data={rows} rowKey={(r) => r.id} total={2} query={emptyQuery} onQueryChange={vi.fn()} summary />
    )
    expect(container.querySelector('tfoot')).toBeNull()
  })
})

describe('column style hooks (G-05)', () => {
  it('puts the declared classes on the cells and the header', () => {
    const styled: DataTableColumn<Row>[] = [
      { id: 'sum', header: 'Total', accessor: (r) => r.sum, className: 'num', headerClassName: 'num-head' },
    ]
    const { container } = render(
      <DataTable columns={styled} data={rows} rowKey={(r) => r.id} total={2} query={emptyQuery} onQueryChange={vi.fn()} />
    )
    expect(container.querySelector('th.num-head')).toBeTruthy()
    expect(container.querySelectorAll('td.num')).toHaveLength(2)
  })
})

describe('state for assistive tech (G-09)', () => {
  it('says how many rows there are and when they are being replaced', () => {
    const { container, rerender } = render(
      <DataTable columns={columns} data={rows} rowKey={(r) => r.id} total={137} query={emptyQuery} onQueryChange={vi.fn()} />
    )
    const grid = container.querySelector('table')!
    // The header counts as a row, which is what makes "row 30 of 137" add up.
    expect(grid).toHaveAttribute('aria-rowcount', '138')
    expect(grid).not.toHaveAttribute('aria-busy')

    rerender(
      <DataTable columns={columns} data={rows} rowKey={(r) => r.id} total={137} loading query={emptyQuery} onQueryChange={vi.fn()} />
    )
    expect(grid).toHaveAttribute('aria-busy', 'true')
  })

  it('announces the selection count', () => {
    render(
      <DataTable
        columns={columns}
        data={rows}
        rowKey={(r) => r.id}
        total={2}
        query={emptyQuery}
        onQueryChange={vi.fn()}
        selection={{ keys: ['1'], allMatching: false }}
        onSelectionChange={vi.fn()}
      />
    )
    expect(screen.getByRole('status')).toHaveTextContent('Selected: 1')
  })
})

describe('load-more contract (G-11)', () => {
  it('hands the host the page to ask for', async () => {
    const onLoadMore = vi.fn()
    const user = userEvent.setup()
    render(
      <DataTable
        columns={columns}
        data={rows}
        rowKey={(r) => r.id}
        total={100}
        query={{ ...emptyQuery, pageSize: 2 }}
        onQueryChange={vi.fn()}
        onLoadMore={onLoadMore}
        autoLoadMore={false}
      />
    )
    await user.click(screen.getByRole('button', { name: 'Load more' }))
    // Two rows of two per page are behind us, so the host wants page 2. The
    // table cannot bump `query.page` itself — the pager owns that field.
    expect(onLoadMore).toHaveBeenCalledWith({ nextPage: 2 })
  })
})

describe('filter trigger visibility (V-07)', () => {
  it('is quiet by default and unconditional on request', () => {
    const { container, rerender } = render(
      <DataTable columns={columns} data={rows} rowKey={(r) => r.id} total={2} query={emptyQuery} onQueryChange={vi.fn()} />
    )
    const root = () => container.querySelector('[data-slot="data-table"]')!
    expect(root()).toHaveAttribute('data-filter-trigger', 'hover')
    rerender(
      <DataTable columns={columns} data={rows} rowKey={(r) => r.id} total={2} query={emptyQuery} onQueryChange={vi.fn()} filterTrigger="always" />
    )
    expect(root()).toHaveAttribute('data-filter-trigger', 'always')
  })
})

describe('the stored layout has a shape and a way back (G-07)', () => {
  const sizedColumns: DataTableColumn<Row>[] = [
    { id: 'a', header: 'A', width: 100 },
    { id: 'b', header: 'B', width: 200 },
  ]

  it('stamps what it writes', () => {
    const key = 'test.layout.version'
    window.localStorage.removeItem(key)
    const { result } = renderHook(() => useColumnLayout({ columns: sizedColumns, persistKey: key }))
    act(() => result.current.setWidth('a', 150))
    const stored = JSON.parse(window.localStorage.getItem(key)!) as { v: number }
    expect(stored.v).toBe(1)
    window.localStorage.removeItem(key)
  })

  it('adopts a layout written before there was a version', () => {
    // Its shape *is* version 1, so dropping it would lose every layout saved
    // by an earlier release for nothing.
    const key = 'test.layout.legacy'
    window.localStorage.setItem(key, JSON.stringify({ widths: { a: 321 }, hidden: ['b'] }))
    const { result } = renderHook(() => useColumnLayout({ columns: sizedColumns, persistKey: key }))
    expect(result.current.widthOf('a')).toBe(321)
    expect(result.current.layout.hidden).toEqual(['b'])
    window.localStorage.removeItem(key)
  })

  it('drops a layout it does not understand rather than half-reading it', () => {
    const key = 'test.layout.future'
    window.localStorage.setItem(key, JSON.stringify({ v: 99, widths: { a: 321 } }))
    const { result } = renderHook(() => useColumnLayout({ columns: sizedColumns, persistKey: key }))
    expect(result.current.widthOf('a')).toBe(100)
    window.localStorage.removeItem(key)
  })

  it('hands a hand-dragged column back to auto-fit', () => {
    const { result } = renderHook(() => useColumnLayout({ columns: sizedColumns }))
    act(() => result.current.setWidth('a', 400))
    expect(result.current.layout.sized).toEqual(['a'])
    // Sized columns are left alone by the fit — that is the point of the flag.
    act(() => result.current.fitTo(900))
    expect(result.current.widthOf('a')).toBe(400)

    const before = result.current.fitEpoch
    act(() => result.current.unsize('a'))
    expect(result.current.layout.sized).toEqual([])
    // Back to the declared width, which is the figure the fit scales from —
    // leaving the dragged one in would make the next fit depend on a gesture
    // that has just been undone.
    expect(result.current.widthOf('a')).toBe(100)
    // And the fit has to be told to run: nothing about the container changed.
    expect(result.current.fitEpoch).toBeGreaterThan(before)

    act(() => result.current.fitTo(900))
    expect(result.current.widthOf('a')).toBeGreaterThan(100)
  })

  it('offers the way back only on a column that was dragged', async () => {
    const user = userEvent.setup()
    const { rerender } = render(
      <DataTable
        columns={sizedColumns}
        data={rows}
        rowKey={(r) => r.id}
        total={2}
        query={emptyQuery}
        onQueryChange={vi.fn()}
        layout={{ widths: { a: 400 }, sized: [] }}
      />
    )
    await user.click(screen.getByRole('button', { name: /Columns/ }))
    expect(screen.queryByTitle('Auto width for “A”')).not.toBeInTheDocument()

    rerender(
      <DataTable
        columns={sizedColumns}
        data={rows}
        rowKey={(r) => r.id}
        total={2}
        query={emptyQuery}
        onQueryChange={vi.fn()}
        layout={{ widths: { a: 400 }, sized: ['a'] }}
      />
    )
    expect(await screen.findByTitle('Auto width for “A”')).toBeInTheDocument()
    expect(screen.queryByTitle('Auto width for “B”')).not.toBeInTheDocument()
  })
})

describe('column ids reach CSS without colliding (G-12)', () => {
  it('gives two ids that differ only by punctuation two variables', () => {
    // `replace(/[^a-zA-Z0-9_-]/g, '_')` let `_` through *and* used it as the
    // replacement, so `a.b` and `a_b` both came out `a_b`: one variable, one
    // width, and dragging either column resized both.
    const punctuated: DataTableColumn<Row>[] = [
      { id: 'order.total', header: 'Dotted', width: 120 },
      { id: 'order_total', header: 'Scored', width: 260 },
    ]
    const { container } = render(
      <DataTable
        columns={punctuated}
        data={rows}
        rowKey={(r) => r.id}
        total={2}
        query={emptyQuery}
        onQueryChange={vi.fn()}
        autoFit={false}
      />
    )
    // The root carries one custom property per column, and that is where the
    // two used to land on top of each other. (Asserted here rather than on the
    // `<col>` elements: happy-dom drops a longhand whose value is a var(), so
    // their style attribute comes back empty.)
    const root = container.querySelector<HTMLElement>('[data-slot="data-table"]')!
    const declared = root.getAttribute('style') ?? ''
    const names = [...declared.matchAll(/--mz-dt-w-[a-zA-Z0-9_-]+/g)].map((m) => m[0])
    expect(names).toHaveLength(2)
    expect(new Set(names).size).toBe(2)
    // And each column keeps its own declared width rather than the other's.
    expect(root.style.getPropertyValue(names[0]!)).toBe('120px')
    expect(root.style.getPropertyValue(names[1]!)).toBe('260px')
  })
})

describe('the first-load placeholder has the table under it (G-14)', () => {
  it('draws a cell per column instead of one bar across the width', () => {
    const { container } = render(
      <DataTable
        columns={columns}
        data={[]}
        rowKey={(r) => r.id}
        loading
        query={emptyQuery}
        onQueryChange={vi.fn()}
        selection={{ keys: [], allMatching: false }}
        onSelectionChange={vi.fn()}
      />
    )
    const first = container.querySelector('tbody tr')!
    // One bar spanning everything announced a list and then jumped into a grid
    // the moment the rows arrived.
    expect(first.querySelector('td[colspan]')).toBeNull()
    // Selection column + the two data columns + the slack column.
    expect(first.querySelectorAll('td')).toHaveLength(4)
    expect(first.querySelectorAll('td[data-col]')).toHaveLength(2)
    expect(first.querySelectorAll('.mz-skeleton')).toHaveLength(2)
  })
})
