import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { DataTable, emptyQuery, type DataTableColumn } from '../src'
import '../src/styles/index.css'

/**
 * Regressions from the 2026-11-10 audit that only a real browser shows: a
 * disabled input losing focus, Radix closing its list after a pick, and
 * sticky offsets in RTL.
 */

type Row = { id: string; name: string; sum: number; note: string; status: string }
const rows: Row[] = Array.from({ length: 12 }, (_, i) => ({
  id: `r-${i}`,
  name: `Row ${i}`,
  sum: i,
  note: `Note ${i}`,
  status: 'open',
}))
const settle = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms))

function mountIn(width: number, ui: React.ReactNode) {
  const host = document.createElement('div')
  host.style.cssText = `position:fixed;top:0;left:0;width:${width}px`
  document.body.appendChild(host)
  return { ...render(ui, { container: host }), host }
}

describe('A-01 text cell editor', () => {
  it('saves once for one Enter, and keeps focus while saving', async () => {
    let resolve!: () => void
    const onSave = vi.fn(() => new Promise<void>((done) => (resolve = done)))
    const columns: DataTableColumn<Row>[] = [
      {
        id: 'name',
        header: 'Name',
        accessor: (r) => r.name,
        width: 200,
        editable: { type: 'text', value: (r) => r.name, onSave },
      },
      { id: 'note', header: 'Note', accessor: (r) => r.note, width: 200 },
    ]
    const { host, unmount } = mountIn(
      600,
      <DataTable
        columns={columns}
        data={rows.slice(0, 2)}
        rowKey={(r) => r.id}
        total={2}
        query={emptyQuery}
        onQueryChange={vi.fn()}
      />
    )
    const user = userEvent.setup()
    await user.dblClick(host.querySelector<HTMLElement>('tbody td[data-col="name"] .mz-dt__cell')!)
    const input = host.querySelector<HTMLInputElement>('.mz-dt__editor')!
    await user.type(input, 'X')
    await user.keyboard('{Enter}')
    await settle(100)
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(document.activeElement).toBe(input)
    resolve()
    await settle(100)
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(host.querySelector('.mz-dt__editor')).toBeNull()
    unmount()
    host.remove()
  })
})

describe('A-02 select cell editor', () => {
  it('shows a refused save instead of closing on it', async () => {
    const onSave = vi.fn(
      () => new Promise<void>((_, reject) => setTimeout(() => reject(new Error('Period is closed')), 50))
    )
    const columns: DataTableColumn<Row>[] = [
      {
        id: 'status',
        header: 'Status',
        accessor: (r) => r.status,
        width: 200,
        editable: {
          type: 'select',
          options: [
            { value: 'open', label: 'Open' },
            { value: 'closed', label: 'Closed' },
          ],
          value: (r) => r.status,
          onSave,
        },
      },
    ]
    const { host, unmount } = mountIn(
      600,
      <DataTable
        columns={columns}
        data={rows.slice(0, 2)}
        rowKey={(r) => r.id}
        total={2}
        query={emptyQuery}
        onQueryChange={vi.fn()}
      />
    )
    const user = userEvent.setup()
    await user.dblClick(host.querySelector<HTMLElement>('tbody td[data-col="status"] .mz-dt__cell')!)
    await settle(150)
    await user.click(await screen.findByRole('option', { name: 'Closed' }))
    await settle(300)
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(host.querySelector('.mz-dt__editor')).not.toBeNull()
    expect(host.querySelector('.mz-dt__editor-error')?.textContent).toBe('Period is closed')
    unmount()
    host.remove()
  })

  it('closes once an accepted save settles', async () => {
    const onSave = vi.fn(() => new Promise<void>((done) => setTimeout(done, 50)))
    const columns: DataTableColumn<Row>[] = [
      {
        id: 'status',
        header: 'Status',
        accessor: (r) => r.status,
        width: 200,
        editable: {
          type: 'select',
          options: [
            { value: 'open', label: 'Open' },
            { value: 'closed', label: 'Closed' },
          ],
          value: (r) => r.status,
          onSave,
        },
      },
    ]
    const { host, unmount } = mountIn(
      600,
      <DataTable
        columns={columns}
        data={rows.slice(0, 2)}
        rowKey={(r) => r.id}
        total={2}
        query={emptyQuery}
        onQueryChange={vi.fn()}
      />
    )
    const user = userEvent.setup()
    await user.dblClick(host.querySelector<HTMLElement>('tbody td[data-col="status"] .mz-dt__cell')!)
    await settle(150)
    await user.click(await screen.findByRole('option', { name: 'Closed' }))
    await settle(300)
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(host.querySelector('.mz-dt__editor')).toBeNull()
    unmount()
    host.remove()
  })
})

describe('A-06 a pinned header in RTL', () => {
  it('stays over its column when the table scrolls', async () => {
    const columns: DataTableColumn<Row>[] = [
      { id: 'name', header: 'Name', accessor: (r) => r.name, width: 200, pinned: 'left' },
      { id: 'sum', header: 'Total', accessor: (r) => r.sum, width: 220 },
      { id: 'note', header: 'Note', accessor: (r) => r.note, width: 220 },
    ]
    const { host, unmount } = mountIn(
      420,
      <DataTable
        columns={columns}
        data={rows}
        rowKey={(r) => r.id}
        total={12}
        query={emptyQuery}
        onQueryChange={vi.fn()}
        maxHeight={240}
        autoFit="grow-only"
      />
    )
    host.dir = 'rtl'
    await settle()
    const scroller = host.querySelector<HTMLElement>('.mz-dt__scroller')!
    scroller.scrollLeft = -200
    await settle(150)
    const th = host.querySelector<HTMLElement>('thead th[data-col="name"]')!
    const td = host.querySelector<HTMLElement>('tbody td[data-col="name"]')!
    expect(Math.round(th.getBoundingClientRect().right)).toBe(Math.round(td.getBoundingClientRect().right))
    unmount()
    host.remove()
  })
})
