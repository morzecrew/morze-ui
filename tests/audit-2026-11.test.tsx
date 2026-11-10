import { act, useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, renderHook, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import {
  DataTable,
  DataTablePagination,
  emptyQuery,
  useColumnLayout,
  useTableQuery,
  type DataTableColumn,
  type RowSelectionState,
} from '../src'

/**
 * Regressions from the 2026-11-10 audit (docs/audit-2026-11-10.md), the
 * DataTable half: each test is the probe that reproduced the defect.
 */

type Row = { id: string; name: string }
const make = (count: number, prefix = 'r') =>
  Array.from({ length: count }, (_, i) => ({ id: `${prefix}${i}`, name: `N${prefix}${i}` }))
const columns: DataTableColumn<Row>[] = [{ id: 'name', header: 'Name', accessor: (r) => r.name }]

afterEach(() => {
  window.localStorage.clear()
  window.history.replaceState(null, '', '/')
})

describe('A-03 selection: “all matching” and a row unticked on another page', () => {
  it('keeps the rest of the page ticked and drops only that row', () => {
    const onSelectionChange = vi.fn()
    // `keys` holds the rows of page 1, where "all matching" was chosen.
    const selection: RowSelectionState = { keys: ['a0', 'a1'], allMatching: true }
    render(
      <DataTable
        columns={columns}
        data={make(3, 'b')}
        rowKey={(r) => r.id}
        total={100}
        query={{ ...emptyQuery, page: 2 }}
        onQueryChange={vi.fn()}
        selection={selection}
        onSelectionChange={onSelectionChange}
      />
    )
    expect(screen.getByRole('checkbox', { name: 'Select page' })).toHaveAttribute(
      'aria-checked',
      'true'
    )
    fireEvent.click(screen.getAllByRole('checkbox', { name: 'Select row' })[1]!)
    expect(onSelectionChange).toHaveBeenCalledWith({ keys: ['b0', 'b2'], allMatching: false })
  })

  it('clears the page when its header box is unticked', () => {
    const onSelectionChange = vi.fn()
    render(
      <DataTable
        columns={columns}
        data={make(2, 'b')}
        rowKey={(r) => r.id}
        total={100}
        query={emptyQuery}
        onQueryChange={vi.fn()}
        selection={{ keys: ['a0'], allMatching: true }}
        onSelectionChange={onSelectionChange}
      />
    )
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select page' }))
    expect(onSelectionChange).toHaveBeenCalledWith({ keys: [], allMatching: false })
  })
})

describe('A-04 / A-05 column layout survives a reload and a release', () => {
  it('keeps a declared-pinned column unpinned after a reload', () => {
    const key = 'audit.pin'
    const pinned: DataTableColumn<Row>[] = [
      { id: 'a', header: 'A', pinned: 'left' },
      { id: 'b', header: 'B' },
    ]
    const first = renderHook(() => useColumnLayout({ columns: pinned, persistKey: key }))
    act(() => first.result.current.setPinned('a', undefined))
    expect(first.result.current.layout.pinned.a).toBeUndefined()
    first.unmount()
    const second = renderHook(() => useColumnLayout({ columns: pinned, persistKey: key }))
    expect(second.result.current.layout.pinned.a).toBeUndefined()
    expect(second.result.current.visible.map((c) => c.id)).toEqual(['a', 'b'])
  })

  it('reports an unpinned column to the host in a form JSON keeps', () => {
    const onLayoutChange = vi.fn()
    const pinned: DataTableColumn<Row>[] = [{ id: 'a', header: 'A', pinned: 'left' }]
    const { result } = renderHook(() => useColumnLayout({ columns: pinned, onLayoutChange }))
    act(() => result.current.setPinned('a', undefined))
    const sent = JSON.parse(JSON.stringify(onLayoutChange.mock.calls[0]![0]))
    expect(sent.pinned).toEqual({ a: false })
  })

  it('gives a new declared width to a column the user never resized', () => {
    const key = 'audit.width'
    const before: DataTableColumn<Row>[] = [
      { id: 'act', header: 'Actions', width: 80, flex: false },
      { id: 'b', header: 'B' },
    ]
    const first = renderHook(() => useColumnLayout({ columns: before, persistKey: key }))
    act(() => first.result.current.toggleHidden('b'))
    first.unmount()
    const after = before.map((c) => (c.id === 'act' ? { ...c, width: 140 } : c))
    const second = renderHook(() => useColumnLayout({ columns: after, persistKey: key }))
    expect(second.result.current.widthOf('act')).toBe(140)
    // The unrelated action is still remembered.
    expect(second.result.current.layout.hidden).toEqual(['b'])
  })

  it('keeps a width the user did set by hand', () => {
    const key = 'audit.width.sized'
    const before: DataTableColumn<Row>[] = [{ id: 'act', header: 'Actions', width: 80, flex: false }]
    const first = renderHook(() => useColumnLayout({ columns: before, persistKey: key }))
    act(() => first.result.current.setWidth('act', 111))
    first.unmount()
    const after = [{ ...before[0]!, width: 140 }]
    const second = renderHook(() => useColumnLayout({ columns: after, persistKey: key }))
    expect(second.result.current.widthOf('act')).toBe(111)
  })

  it('follows a width change in the same session', () => {
    const before: DataTableColumn<Row>[] = [{ id: 'act', header: 'Actions', width: 80, flex: false }]
    const { result, rerender } = renderHook(({ c }) => useColumnLayout({ columns: c }), {
      initialProps: { c: before },
    })
    rerender({ c: [{ ...before[0]!, width: 140 }] })
    expect(result.current.widthOf('act')).toBe(140)
  })
})

describe('A-07 an expanded key whose row has gone', () => {
  it('does not switch the virtual window off', () => {
    function Host() {
      const [data, setData] = useState(make(50))
      return (
        <>
          <button onClick={() => setData(make(50, 'x'))}>refilter</button>
          <DataTable
            columns={columns}
            data={data}
            rowKey={(r) => r.id}
            total={50}
            query={emptyQuery}
            onQueryChange={vi.fn()}
            virtualize
            renderExpanded={(r) => <p>{r.name}</p>}
            pagination={false}
          />
        </>
      )
    }
    const { container } = render(<Host />)
    const drawn = () =>
      container.querySelectorAll('tbody tr.mz-dt__row:not(.mz-dt__row--expanded)').length
    const windowed = drawn()
    expect(windowed).toBeLessThan(50)
    fireEvent.click(screen.getAllByRole('button', { name: 'Expand' })[0]!)
    fireEvent.click(screen.getByText('refilter'))
    expect(container.querySelectorAll('.mz-dt__row--expanded')).toHaveLength(0)
    expect(drawn()).toBe(windowed)
  })
})

describe('A-08 keyboard + virtualize', () => {
  it('keeps one tab stop after a mouse scroll past the focused row', () => {
    const { container } = render(
      <DataTable
        columns={columns}
        data={make(500)}
        rowKey={(r) => r.id}
        total={500}
        query={emptyQuery}
        onQueryChange={vi.fn()}
        virtualize
        keyboard
        pagination={false}
      />
    )
    const scroller = container.querySelector<HTMLElement>('.mz-dt__scroller')!
    expect(container.querySelectorAll('td[tabindex="0"]')).toHaveLength(1)
    act(() => {
      scroller.scrollTop = 44 * 200
      scroller.dispatchEvent(new Event('scroll'))
    })
    const stops = container.querySelectorAll('td[tabindex="0"]')
    expect(stops).toHaveLength(1)
    const first = container.querySelector('td[data-grid-row]')!.getAttribute('data-grid-row')
    expect(stops[0]!.getAttribute('data-grid-row')).toBe(first)
  })
})

describe('A-09 a hand-edited filter in the URL', () => {
  it.each([
    ['null', 'null'],
    ['an array', '[1,2]'],
    ['a select without values', '{"name":{"type":"select"}}'],
    ['a text filter with a number', '{"name":{"type":"text","value":5}}'],
  ])('reads %s as no filter instead of crashing', (_, raw) => {
    window.history.replaceState(null, '', `/?t.f=${encodeURIComponent(raw)}`)
    const { result } = renderHook(() => useTableQuery({ urlKey: 't.' }))
    expect(result.current.query.filters).toEqual({})
    expect(() =>
      render(
        <DataTable
          columns={columns}
          data={make(2)}
          rowKey={(r) => r.id}
          total={2}
          query={result.current.query}
          onQueryChange={vi.fn()}
        />
      )
    ).not.toThrow()
  })

  it('keeps the entries that are well formed', () => {
    const raw = JSON.stringify({
      name: { type: 'text', value: 'acme' },
      broken: { type: 'select' },
      sum: { type: 'number-range', min: 10 },
    })
    window.history.replaceState(null, '', `/?t.f=${encodeURIComponent(raw)}`)
    const { result } = renderHook(() => useTableQuery({ urlKey: 't.' }))
    expect(result.current.query.filters).toEqual({
      name: { type: 'text', value: 'acme' },
      sum: { type: 'number-range', min: 10 },
    })
  })
})

describe('A-10 a page past the end', () => {
  it('shows the last page and moves the query there', () => {
    const onQueryChange = vi.fn()
    const { container } = render(
      <DataTablePagination
        total={80}
        rowsOnPage={0}
        query={{ ...emptyQuery, page: 5 }}
        onQueryChange={onQueryChange}
      />
    )
    expect(container.querySelector('.mz-dt__pagination-info')?.textContent).toBe('76–80 of 80')
    expect(container.querySelector('.mz-dt__pagination-page')?.textContent).toBe('4 / 4')
    expect(onQueryChange).toHaveBeenCalledWith(expect.objectContaining({ page: 4 }))
  })

  it('leaves a page that exists alone', () => {
    const onQueryChange = vi.fn()
    render(
      <DataTablePagination
        total={80}
        rowsOnPage={25}
        query={{ ...emptyQuery, page: 2 }}
        onQueryChange={onQueryChange}
      />
    )
    expect(onQueryChange).not.toHaveBeenCalled()
  })
})

describe('A-11 the search box', () => {
  it('does not re-render the cells on every letter', async () => {
    let renders = 0
    const counted: DataTableColumn<Row>[] = [
      {
        id: 'name',
        header: 'Name',
        cell: (r) => {
          renders += 1
          return r.name
        },
      },
    ]
    render(
      <DataTable
        columns={counted}
        data={make(100)}
        rowKey={(r) => r.id}
        total={100}
        query={emptyQuery}
        onQueryChange={vi.fn()}
        search={{ debounce: 10_000 }}
        pagination={false}
      />
    )
    renders = 0
    await userEvent.setup().type(screen.getByRole('searchbox'), 'hello')
    expect(screen.getByRole('searchbox')).toHaveValue('hello')
    expect(renders).toBe(0)
  })
})

describe('A-12 selection in the grid', () => {
  it('marks a selected row aria-selected', () => {
    render(
      <DataTable
        columns={columns}
        data={make(2)}
        rowKey={(r) => r.id}
        total={2}
        query={emptyQuery}
        onQueryChange={vi.fn()}
        keyboard
        selection={{ keys: ['r1'], allMatching: false }}
        onSelectionChange={vi.fn()}
      />
    )
    const [first, second] = screen.getAllByRole('row').slice(1)
    expect(first).toHaveAttribute('aria-selected', 'false')
    expect(second).toHaveAttribute('aria-selected', 'true')
  })
})

describe('A-13 a cell being edited whose row leaves the data', () => {
  it('does not reopen its editor when the row comes back', () => {
    const editable: DataTableColumn<Row>[] = [
      {
        id: 'name',
        header: 'Name',
        accessor: (r) => r.name,
        editable: { type: 'text', value: (r) => r.name, onSave: vi.fn() },
      },
    ]
    function Host() {
      const [page, setPage] = useState(1)
      return (
        <>
          <button onClick={() => setPage((p) => (p === 1 ? 2 : 1))}>flip</button>
          <DataTable
            columns={editable}
            data={make(3, `p${page}-`)}
            rowKey={(r) => r.id}
            total={6}
            query={{ ...emptyQuery, page }}
            onQueryChange={vi.fn()}
          />
        </>
      )
    }
    const { container } = render(<Host />)
    fireEvent.doubleClick(container.querySelector('tbody td[data-col="name"]')!)
    expect(container.querySelector('.mz-dt__editor')).not.toBeNull()
    act(() => (screen.getByText('flip') as HTMLButtonElement).click())
    act(() => (screen.getByText('flip') as HTMLButtonElement).click())
    expect(container.querySelector('.mz-dt__editor')).toBeNull()
  })
})
