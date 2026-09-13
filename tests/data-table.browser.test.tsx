import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import {
  Button,
  DataTable,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  emptyQuery,
  type ColumnLayout,
  type DataTableColumn,
} from '../src'
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

describe('virtual rows (G-06)', () => {
  const many: Row[] = Array.from({ length: 1000 }, (_, i) => ({
    id: `v-${i}`,
    name: `Row ${i}`,
    sum: i,
    note: `Note ${i}`,
  }))

  const drawn = (host: HTMLElement) =>
    [...host.querySelectorAll<HTMLElement>('tbody tr.mz-dt__row')].filter(
      (row) => !row.hasAttribute('aria-hidden')
    )

  it('draws a window of a thousand rows and keeps the scrollbar honest', async () => {
    const { host, unmount } = mountIn(900, (
      <DataTable
        columns={columns}
        data={many}
        rowKey={(r) => r.id}
        total={many.length}
        query={emptyQuery}
        onQueryChange={vi.fn()}
        maxHeight={300}
        virtualize
      />
    ))
    await settle()

    const rendered = drawn(host)
    // 300px of viewport at 44px a row is seven, plus the overscan at both
    // ends. What matters is that it is a window and not a thousand.
    expect(rendered.length).toBeGreaterThan(4)
    expect(rendered.length).toBeLessThan(40)
    expect(rendered[0]).toHaveTextContent('Row 0')

    const scroller = host.querySelector<HTMLElement>('.mz-dt__scroller')!
    // The rows that are not drawn are still there as height: a thousand rows
    // at 44px, give or take the header and a rounding.
    expect(scroller.scrollHeight).toBeGreaterThan(1000 * 40)

    scroller.scrollTop = 440 * 10
    await settle(200)
    const later = drawn(host)
    expect(later.length).toBeLessThan(40)
    expect(host).not.toHaveTextContent('Row 0')
    // Row 100 is what sits at 4400px, and it is drawn rather than estimated.
    expect(host).toHaveTextContent('Row 100')

    scroller.scrollTop = scroller.scrollHeight
    await settle(200)
    expect(host).toHaveTextContent('Row 999')
    unmount()
    host.remove()
  })

  it('follows the grid keyboard into a row it has not drawn yet', async () => {
    const { host, unmount } = mountIn(900, (
      <DataTable
        columns={columns}
        data={many}
        rowKey={(r) => r.id}
        total={many.length}
        query={emptyQuery}
        onQueryChange={vi.fn()}
        maxHeight={300}
        virtualize
        keyboard
      />
    ))
    await settle()
    const first = host.querySelector<HTMLElement>('td[data-grid-row="0"][data-grid-col="0"]')!
    first.focus()
    // Ten pages of ten rows: far past the window that was drawn on mount.
    for (let i = 0; i < 10; i += 1) {
      await userEvent.keyboard('{PageDown}')
      await settle(60)
    }
    const focused = document.activeElement as HTMLElement
    expect(focused.dataset.gridRow).toBe('100')
    expect(focused.closest('tr')).toHaveTextContent('Row 100')
    unmount()
    host.remove()
  })

  it('draws every row while a detail panel is open', async () => {
    const some = many.slice(0, 60)
    const { host, unmount } = mountIn(900, (
      <DataTable
        columns={columns}
        data={some}
        rowKey={(r) => r.id}
        total={some.length}
        query={emptyQuery}
        onQueryChange={vi.fn()}
        maxHeight={300}
        virtualize
        renderExpanded={(row) => <div style={{ height: 120 }}>{row.note}</div>}
        defaultExpanded={['v-0']}
      />
    ))
    await settle()
    // An expanded row is a row of a height this arithmetic does not know, so
    // the window is given up rather than left to drift.
    expect(drawn(host).length).toBe(some.length + 1)
    unmount()
    host.remove()
  })
})

describe('right to left (G-13)', () => {
  const pinned: DataTableColumn<Row>[] = [
    { id: 'name', header: 'Name', accessor: (r) => r.name, width: 200, pinned: 'left' },
    { id: 'sum', header: 'Total', accessor: (r) => r.sum, width: 220, align: 'right' },
    { id: 'note', header: 'Note', accessor: (r) => r.note, width: 220 },
  ]

  const rtlTable = () => {
    const mounted = mountIn(420, (
      <DataTable
        columns={pinned}
        data={rows}
        rowKey={(r) => r.id}
        total={rows.length}
        query={emptyQuery}
        onQueryChange={vi.fn()}
        maxHeight={240}
      />
    ))
    mounted.host.dir = 'rtl'
    return mounted
  }

  it('pins a column against the edge the reader starts from', async () => {
    const { host, unmount } = rtlTable()
    await settle()
    const scroller = host.querySelector<HTMLElement>('.mz-dt__scroller')!
    const cell = host.querySelector<HTMLElement>('tbody td[data-pinned="left"]')!
    // `pinned: 'left'` is the API's word for the first column; in an RTL table
    // the first column is on the right, and that is where it has to stick —
    // inside the scroller's own 1px border.
    const stuckToTheStart = () =>
      Math.abs(cell.getBoundingClientRect().right - scroller.getBoundingClientRect().right)
    expect(stuckToTheStart()).toBeLessThanOrEqual(2)

    // And it stays there once the body scrolls sideways, where an RTL scroller
    // counts its offset downwards from zero.
    scroller.scrollLeft = -120
    await settle(150)
    expect(Math.abs(scroller.scrollLeft)).toBeGreaterThan(0)
    expect(stuckToTheStart()).toBeLessThanOrEqual(2)
    expect(scroller).toHaveAttribute('data-scrolled-start')
    unmount()
    host.remove()
  })

  it('widens a column when the handle is dragged towards the reader', async () => {
    const { host, unmount } = rtlTable()
    await settle()
    const handle = host.querySelector<HTMLElement>('.mz-dt__resizer')!
    const before = host.querySelector<HTMLElement>('thead th[data-col="name"]')!.offsetWidth
    handle.focus()
    // The handle is on the column's inline end — its left edge here — so the
    // arrow that widens it is the one pointing away from the text.
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}')
    await settle(120)
    expect(host.querySelector<HTMLElement>('thead th[data-col="name"]')!.offsetWidth).toBeGreaterThan(
      before
    )
    unmount()
    host.remove()
  })
})

describe('a tooltip over a button that is off (K-07)', () => {
  it('opens for aria-disabled, where a real pointer is what decides', async () => {
    // The fast suite proves the handlers; only a browser can prove the hit
    // test, which is the half that was broken: `.mz-btn[aria-disabled]` used
    // to carry `pointer-events: none`, so the pointer never reached the
    // trigger and the tooltip never opened.
    const { host, unmount } = mountIn(300, (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button aria-disabled>Publish</Button>
          </TooltipTrigger>
          <TooltipContent>Fill in the title first</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    ))
    await settle(50)
    const button = host.querySelector<HTMLElement>('.mz-btn')!
    expect(getComputedStyle(button).pointerEvents).not.toBe('none')
    await userEvent.hover(button)
    await settle(200)
    expect(document.body).toHaveTextContent('Fill in the title first')
    unmount()
    host.remove()
  })
})
