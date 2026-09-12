import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { DataTable, emptyQuery, type ColumnLayout, type DataTableColumn } from '../src'
// The real stylesheet, because that is the point: `table-layout: fixed`, the
// scroller's `overflow` and its `max-height` are all CSS, and without them
// these specs would measure unstyled markup and pass for the wrong reason.
import '../src/styles/index.css'

/**
 * The half of the table that only exists once something measures it.
 *
 * happy-dom reports `clientWidth: 0` for everything, so in the fast suite
 * auto-fit never runs, the ResizeObserver never fires, and the two defects
 * this file is about cannot reproduce at all — FIXES.md records both as
 * "verified by hand in the playground and guarded only by their comments".
 * These run in a real Chrome: `npm run test:browser`.
 */

type Row = { id: string; name: string; sum: number; note: string }

const rows: Row[] = Array.from({ length: 12 }, (_, i) => ({
  id: `r-${i}`,
  name: `Row ${i}`,
  sum: 1000 + i * 137,
  note: `Note ${i}: delivery and commissioning`,
}))

const columns: DataTableColumn<Row>[] = [
  { id: 'name', header: 'Name', accessor: (r) => r.name, width: 200 },
  { id: 'sum', header: 'Total', accessor: (r) => r.sum, width: 200, align: 'right' },
  { id: 'note', header: 'Note', accessor: (r) => r.note, width: 200 },
]

/** A fixed box to measure against, off the flow so the runner's own UI cannot move it. */
function mountIn(width: number, ui: React.ReactNode) {
  const host = document.createElement('div')
  host.style.cssText = `position:fixed;top:0;left:0;width:${width}px`
  document.body.appendChild(host)
  const result = render(ui, { container: host })
  return { ...result, host }
}

const settle = (ms = 350) => new Promise((resolve) => setTimeout(resolve, ms))

const widthsOf = (host: HTMLElement) =>
  [...host.querySelectorAll<HTMLTableCellElement>('thead th[data-col]')].map((th) =>
    Math.round(th.getBoundingClientRect().width)
  )

describe('auto-fit against a real container', () => {
  it('stretches the declared widths to fill the row', async () => {
    // 600px of declared width in an 900px box: the fit spreads the slack over
    // the flexible columns instead of leaving it at the right edge.
    const { host, unmount } = mountIn(900, (
      <DataTable
        columns={columns}
        data={rows}
        rowKey={(r) => r.id}
        total={rows.length}
        query={emptyQuery}
        onQueryChange={vi.fn()}
      />
    ))
    await settle()
    const widths = widthsOf(host)
    expect(widths).toHaveLength(3)
    for (const width of widths) expect(width).toBeGreaterThan(200)
    unmount()
    host.remove()
  })

  it('redistributes into the same width when a column is hidden', async () => {
    // The half of the auto-fit fix happy-dom cannot reach: hiding a column has
    // to hand its width to the others, not leave a gap at the right edge.
    function Harness() {
      const [layout, setLayout] = useState<Partial<ColumnLayout>>({})
      return (
        <>
          <button type="button" onClick={() => setLayout({ hidden: ['note'] })}>
            hide note
          </button>
          <DataTable
            columns={columns}
            data={rows}
            rowKey={(r) => r.id}
            total={rows.length}
            query={emptyQuery}
            onQueryChange={vi.fn()}
            layout={layout}
            onLayoutChange={(next) => setLayout(next)}
          />
        </>
      )
    }
    const { host, unmount } = mountIn(900, <Harness />)
    await settle()
    const before = widthsOf(host).reduce((total, width) => total + width, 0)

    await userEvent.click(screen.getByRole('button', { name: 'hide note' }))
    await settle()

    const after = widthsOf(host)
    expect(after).toHaveLength(2)
    // Two columns now cover what three covered: the slack was redistributed,
    // not left behind. A few pixels of rounding and the border are fine.
    expect(after.reduce((total, width) => total + width, 0)).toBeGreaterThan(before - 8)
    unmount()
    host.remove()
  })

  it('stops the scroll observer and React driving each other', async () => {
    // The freeze (FIXES.md): the edge-shadow effect wrote a fresh state object
    // on every observer tick, so a measurement that found nothing new still
    // re-rendered — and any cell that reflowed during that render resized the
    // scroller and fed the observer again. The tab locked hard: no console, no
    // DevTools, and hot reload could not recover it.
    //
    // Reproducing it needs a cell that really does reflow. `table-layout:
    // fixed` and the cell's own `overflow: hidden` mean content cannot change
    // a column's *width*, so the lever is height — and it has to clear the
    // row's own `height: var(--mz-dt-row-h)`, which on a table cell is a
    // minimum: a child under 44px changes nothing at all. Above it the row,
    // the table and — with no `maxHeight` — the scroller the observer is
    // watching all grow with it.
    let renders = 0
    const reflowing: DataTableColumn<Row>[] = [
      ...columns,
      {
        id: 'block',
        header: 'Block',
        width: 240,
        cell: () => {
          renders += 1
          return <div style={{ display: 'block', height: 60 + (renders % 5) * 8 }} />
        },
      },
    ]
    // Just over the container, so fitting can also make a scrollbar appear —
    // the two-step cycle a "last width" guard used to wave straight through.
    const { host, unmount } = mountIn(660, (
      <DataTable
        columns={reflowing}
        data={rows}
        rowKey={(r) => r.id}
        total={rows.length}
        query={emptyQuery}
        onQueryChange={vi.fn()}
      />
    ))
    await settle(700)
    const afterMount = renders
    await settle(700)
    // Nothing is asking for a re-render any more. Without the identity
    // bail-out this count climbs for as long as the table is on screen.
    expect(renders).toBe(afterMount)
    unmount()
    host.remove()
  })
})

describe('the sticky header has something to stick to', () => {
  it('keeps the header in place while the body scrolls', async () => {
    // D-05: `stickyHeader` defaults to true and did nothing, because the
    // scroller had no height and therefore never scrolled. Nothing without a
    // layout engine can tell the difference.
    const { host, unmount } = mountIn(900, (
      <DataTable
        columns={columns}
        data={rows}
        rowKey={(r) => r.id}
        total={rows.length}
        query={emptyQuery}
        onQueryChange={vi.fn()}
        maxHeight={220}
      />
    ))
    await settle()
    const scroller = host.querySelector<HTMLElement>('.mz-dt__scroller')!
    const header = host.querySelector<HTMLElement>('thead th')!
    expect(scroller.scrollHeight).toBeGreaterThan(scroller.clientHeight)

    const restingTop = header.getBoundingClientRect().top
    scroller.scrollTop = 120
    await settle(120)
    expect(scroller.scrollTop).toBeGreaterThan(0)
    expect(header.getBoundingClientRect().top).toBeCloseTo(restingTop, 0)
    unmount()
    host.remove()
  })
})
