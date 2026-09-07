import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as React from 'react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  ChartContainer,
  ChartLegendContent,
  ChartTooltipContent,
  ScrollArea,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  type ChartConfig,
} from '../src'

describe('Table', () => {
  it('scrolls itself rather than the page', () => {
    // A bare wide table pushes the document into a horizontal scroll, so the
    // container is part of the component instead of the caller's problem.
    const { container } = render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Part</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow data-state="selected">
            <TableCell>M6 bolt</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )

    const wrap = container.querySelector('[data-slot="table-container"]')
    expect(wrap).toHaveClass('mz-table-wrap')
    expect(wrap?.querySelector('table')).toHaveClass('mz-table')
    expect(screen.getByRole('row', { name: /M6 bolt/ })).toHaveAttribute('data-state', 'selected')
  })

  it('hands the scrolling element back to the caller', () => {
    // Owning the container would otherwise put it out of reach of a
    // synchronised header or a virtualiser.
    const ref = React.createRef<HTMLDivElement>()
    render(
      <Table containerRef={ref} containerClassName="max-h-40">
        <TableBody>
          <TableRow>
            <TableCell>row</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )
    expect(ref.current).toHaveAttribute('data-slot', 'table-container')
    expect(ref.current).toHaveClass('max-h-40')
  })
})

describe('Breadcrumb', () => {
  it('marks the last crumb as the current page', () => {
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbEllipsis label="Show more" />
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Orders</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    )

    expect(screen.getByRole('navigation')).toHaveAttribute('aria-label', 'breadcrumb')
    expect(screen.getByText('Orders')).toHaveAttribute('aria-current', 'page')
    expect(screen.getByText('Show more')).toHaveClass('mz-sr-only')
    // Separators are decoration; a screen reader must not read them as crumbs.
    const separators = document.querySelectorAll('[data-slot="breadcrumb-separator"]')
    expect(separators).toHaveLength(2)
    separators.forEach((s) => expect(s).toHaveAttribute('aria-hidden', 'true'))
  })
})

describe('AlertDialog', () => {
  it('dresses its two actions as buttons and closes on either', async () => {
    const onConfirm = vi.fn()
    render(
      <AlertDialog>
        <AlertDialogTrigger>Delete</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogTitle>Delete the order?</AlertDialogTitle>
          <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction tone="danger" onClick={onConfirm}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )

    await userEvent.click(screen.getByText('Delete'))
    const confirm = screen.getByRole('button', { name: 'Delete' })
    expect(confirm).toHaveClass('mz-btn')
    expect(confirm).toHaveAttribute('data-tone', 'danger')
    expect(screen.getByRole('button', { name: 'Keep' })).toHaveClass('mz-btn--outline')

    await userEvent.click(confirm)
    expect(onConfirm).toHaveBeenCalled()
    expect(screen.queryByText('Delete the order?')).toBeNull()
  })

  it('offers no close button — the footer is the only way out', async () => {
    render(
      <AlertDialog defaultOpen>
        <AlertDialogContent>
          <AlertDialogTitle>Sure?</AlertDialogTitle>
          <AlertDialogCancel>No</AlertDialogCancel>
        </AlertDialogContent>
      </AlertDialog>
    )
    expect(document.querySelector('[data-slot="dialog-close"]')).toBeNull()
  })
})

describe('ScrollArea', () => {
  it('scrolls the viewport, not the component root', () => {
    const { container } = render(
      <ScrollArea className="h-20">
        <p>content</p>
      </ScrollArea>
    )
    const viewport = container.querySelector('[data-slot="scroll-area-viewport"]')
    expect(viewport).toBeTruthy()
    expect(viewport?.textContent).toBe('content')
  })

  it('renders its own bar in place of the platform one', () => {
    // Radix mounts the bar only once there is something to scroll, so the
    // always-on type is what makes it assertable without a layout engine.
    const { container } = render(
      <ScrollArea type="always" className="h-20">
        <p>content</p>
      </ScrollArea>
    )
    // The thumb itself needs a measured viewport, which a DOM without layout
    // cannot give — the bar and its orientation are what is assertable here.
    const bar = container.querySelector('[data-slot="scroll-area-scrollbar"]')
    expect(bar).toHaveClass('mz-scrollbar')
    expect(bar).toHaveAttribute('data-orientation', 'vertical')
  })
})

describe('TabsList overflow', () => {
  const list = (props: Partial<React.ComponentProps<typeof TabsList>>) => (
    <Tabs defaultValue="a">
      <TabsList {...props}>
        <TabsTrigger value="a">Alpha</TabsTrigger>
        <TabsTrigger value="b">Beta</TabsTrigger>
      </TabsList>
      <TabsContent value="a">A</TabsContent>
    </Tabs>
  )

  it('leaves the plain list untouched by default', () => {
    render(list({}))
    const el = screen.getByRole('tablist')
    expect(el).toHaveAttribute('data-overflow', 'wrap')
    expect(el).not.toHaveClass('mz-tabs-list--scroll')
  })

  it('scrolls on one line when asked', () => {
    render(list({ overflow: 'scroll' }))
    expect(screen.getByRole('tablist')).toHaveClass('mz-tabs-list--scroll')
  })

  it('keeps every trigger mounted in the menu variant', () => {
    // Radix roving focus lives on the list, so a collapsed trigger has to stay
    // inside it — hiding it is the kit's job, unmounting it would break Tabs.
    render(list({ overflow: 'menu' }))
    expect(screen.getAllByRole('tab')).toHaveLength(2)
    expect(document.querySelector('.mz-tabs-list__mirror')).toBeTruthy()
    expect(document.querySelector('.mz-tabs-list__mirror')).toHaveAttribute('aria-hidden', 'true')
  })
})

describe('TabsList overflow / measurement', () => {
  /**
   * The collapse is arithmetic over measured widths, and a DOM without layout
   * measures everything as zero. So layout is supplied here: each tab is 200px
   * wide, the row is 700, and the reserved room for the menu button means only
   * two of the four fit.
   */
  const TABS = ['Alpha', 'Beta', 'Gamma', 'Delta']
  let notify: ((entries: unknown[]) => void) | undefined

  beforeEach(() => {
    class FakeResizeObserver {
      constructor(cb: (entries: unknown[]) => void) {
        notify = cb
      }
      observe() {}
      disconnect() {}
      unobserve() {}
    }
    vi.stubGlobal('ResizeObserver', FakeResizeObserver)

    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement
    ) {
      const width = this.classList.contains('mz-tabs-list-wrap') ? 700 : 200
      return { width, height: 34, top: 0, left: 0, right: width, bottom: 34, x: 0, y: 0, toJSON: () => ({}) } as DOMRect
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    notify = undefined
  })

  const renderTabs = () =>
    render(
      <Tabs defaultValue="a">
        <TabsList overflow="menu" overflowLabel="More">
          {TABS.map((label, i) => (
            <TabsTrigger key={label} value={String.fromCharCode(97 + i)}>
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="a">Panel A</TabsContent>
        <TabsContent value="d">Panel D</TabsContent>
      </Tabs>
    )

  const hiddenTabs = () =>
    screen.getAllByRole('tab', { hidden: true }).filter((t) => t.style.display === 'none')

  it('collapses only what does not fit, and says how many', () => {
    renderTabs()
    act(() => notify?.([{ contentRect: { width: 700 } }]))

    expect(hiddenTabs().map((t) => t.textContent)).toEqual(['Gamma', 'Delta'])
    const button = screen.getByRole('button', { name: /More \(2\)/ })
    expect(button).toBeTruthy()
  })

  it('activates a collapsed tab from the menu', async () => {
    renderTabs()
    act(() => notify?.([{ contentRect: { width: 700 } }]))

    await userEvent.click(screen.getByRole('button', { name: /More \(2\)/ }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Delta' }))

    // Radix selects on mousedown, so the menu dispatches that rather than a
    // click; the proof it worked is the panel that tab controls.
    expect(screen.getByText('Panel D')).toBeVisible()
    expect(screen.queryByText('Panel A')).toBeNull()
  })

  it('keeps collapsing after the tab set shrinks', () => {
    // React nulls a removed child's ref slot but never shortens the array, so
    // a stale trailing entry made the measured length stop matching the tab
    // count — and the collapse switched itself off for good.
    const Harness = ({ count }: { count: number }) => (
      <Tabs defaultValue="a">
        <TabsList overflow="menu" overflowLabel="More">
          {TABS.slice(0, count).map((label, i) => (
            <TabsTrigger key={label} value={String.fromCharCode(97 + i)}>
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="a">Panel A</TabsContent>
      </Tabs>
    )

    const { rerender } = render(<Harness count={4} />)
    act(() => notify?.([{ contentRect: { width: 700 } }]))
    expect(hiddenTabs()).toHaveLength(2)

    rerender(<Harness count={3} />)
    act(() => notify?.([{ contentRect: { width: 500 } }]))
    // 500px fits one 200px tab beside the button, so two of the three collapse.
    expect(hiddenTabs()).toHaveLength(2)
  })

  it('gives everything back when the row grows again', () => {
    renderTabs()
    act(() => notify?.([{ contentRect: { width: 700 } }]))
    expect(hiddenTabs()).toHaveLength(2)

    act(() => notify?.([{ contentRect: { width: 2000 } }]))
    expect(hiddenTabs()).toHaveLength(0)
    expect(screen.queryByRole('button', { name: /More/ })).toBeNull()
  })
})

describe('Chart', () => {
  const config = {
    shipped: { label: 'Shipped', color: '#4e75ff' },
    returned: { label: 'Returned', theme: { light: '#c2410c', dark: '#fb923c' } },
  } satisfies ChartConfig

  it('publishes one custom property per series, per theme', () => {
    const { container } = render(
      <ChartContainer config={config}>
        <div />
      </ChartContainer>
    )
    const css = container.querySelector('style')?.innerHTML ?? ''

    expect(css).toContain('--color-shipped: #4e75ff')
    expect(css).toContain('--color-returned: #c2410c')
    expect(css).toContain('--color-returned: #fb923c')
    // Both the kit's theme attribute and a host's own class must be covered.
    expect(css).toContain("[data-mz-theme='dark']")
    expect(css).toContain('.dark ')
  })

  it('refuses a value that would close the declaration', () => {
    const { container } = render(
      <ChartContainer
        config={{ evil: { color: 'red; } body { display: none } .x {' } } as ChartConfig}
      >
        <div />
      </ChartContainer>
    )
    const css = container.querySelector('style')?.innerHTML ?? ''
    expect(css).not.toContain('display: none')
    expect(css).not.toContain('--color-evil')
  })

  it('reads the series label from the config in the tooltip and the legend', () => {
    const payload = [{ dataKey: 'shipped', value: 42, color: '#4e75ff' }]
    render(
      <ChartContainer config={config}>
        <ChartTooltipContent active payload={payload} label="Week 12" />
        <ChartLegendContent payload={payload} />
      </ChartContainer>
    )

    expect(screen.getByText('Week 12')).toBeTruthy()
    expect(screen.getAllByText('Shipped')).toHaveLength(2)
    expect(screen.getByText('42')).toBeTruthy()
  })

  it('names a slice from a field inside the datum', () => {
    // A pie has one series and many slices: the config key lives in the datum,
    // not in dataKey, which is the whole reason nameKey exists.
    const pie = {
      steel: { label: 'Steel' },
      brass: { label: 'Brass' },
    } satisfies ChartConfig

    render(
      <ChartContainer config={pie}>
        <ChartTooltipContent
          active
          nameKey="material"
          payload={[{ dataKey: 'value', value: 7, payload: { material: 'brass' } }]}
        />
      </ChartContainer>
    )
    expect(screen.getByText('Brass')).toBeTruthy()
  })

  it('takes the group heading from the config too', () => {
    render(
      <ChartContainer config={config}>
        <ChartTooltipContent
          active
          label="shipped"
          payload={[{ dataKey: 'shipped', value: 3 }]}
        />
      </ChartContainer>
    )
    // The heading resolved through the config rather than printing the raw key.
    expect(document.querySelector('.mz-chart__tooltip-label')?.textContent).toBe('Shipped')
  })

  it('renders nothing while the pointer is off the plot', () => {
    const { container } = render(
      <ChartContainer config={config}>
        <ChartTooltipContent active={false} payload={[{ dataKey: 'shipped', value: 1 }]} />
      </ChartContainer>
    )
    expect(container.querySelector('[data-slot="chart-tooltip"]')).toBeNull()
  })
})
