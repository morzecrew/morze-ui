import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as React from 'react'

import {
  Alert,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
  Avatar,
  AvatarFallback,
  AvatarGroup,
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  ChartContainer,
  ChartLegendContent,
  Button,
  ChartTooltipContent,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Combobox,
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  DatePicker,
  Dialog,
  DialogContent,
  DialogTitle,
  Empty,
  EmptyActions,
  EmptyDescription,
  EmptyTitle,
  KbdSequence,
  MultiSelect,
  NumberInput,
  Progress,
  RadioGroup,
  RadioGroupItem,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetBody,
  SheetContent,
  SheetTitle,
  SidebarProvider,
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
  Textarea,
  ToggleGroup,
  ToggleGroupItem,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  fromISODate,
  toISODate,
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

describe('SelectTrigger', () => {
  it('draws one focus indicator: its own field glow, not the outline ring too', () => {
    render(
      <Select defaultValue="a">
        <SelectTrigger aria-label="Pick">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">A</SelectItem>
        </SelectContent>
      </Select>
    )
    const trigger = screen.getByRole('combobox', { name: 'Pick' })
    expect(trigger).toHaveClass('mz-select-trigger')
    expect(trigger).not.toHaveClass('mz-focusable')
  })
})

/* ==========================================================================
   P1 — the 2026-09 review: the kit-level API gaps (K-01…K-06, V-09).
   ========================================================================== */

describe('the size scale reaches every field (K-01)', () => {
  it('gives the select trigger the large step the inputs already had', () => {
    render(
      <Select>
        <SelectTrigger size="lg" aria-label="Warehouse">
          <SelectValue placeholder="Pick" />
        </SelectTrigger>
        <SelectContent />
      </Select>
    )
    const trigger = screen.getByLabelText('Warehouse')
    expect(trigger).toHaveAttribute('data-size', 'lg')
    expect(trigger.className).toContain('mz-select-trigger--lg')
  })

  it('sizes a radio and a textarea the way it sizes a checkbox', () => {
    render(
      <>
        <RadioGroup defaultValue="a">
          <RadioGroupItem value="a" size="sm" aria-label="A" />
        </RadioGroup>
        <Textarea inputSize="lg" aria-label="Notes" />
      </>
    )
    expect(screen.getByLabelText('A').className).toContain('mz-radio--sm')
    expect(screen.getByLabelText('Notes').className).toContain('mz-textarea--lg')
  })
})

describe('Dialog and Sheet sizing (K-02, V-09)', () => {
  it('lets a dialog be something other than 32rem', async () => {
    render(
      <Dialog defaultOpen>
        <DialogContent size="lg">
          <DialogTitle>Wide</DialogTitle>
        </DialogContent>
      </Dialog>
    )
    expect(await screen.findByRole('dialog')).toHaveAttribute('data-size', 'lg')
  })

  it('gives a sheet a body with the padding its header already had', async () => {
    render(
      <Sheet defaultOpen>
        <SheetContent size="lg">
          <SheetTitle>Filters</SheetTitle>
          <SheetBody>
            <p>Body</p>
          </SheetBody>
        </SheetContent>
      </Sheet>
    )
    const panel = await screen.findByRole('dialog')
    expect(panel).toHaveAttribute('data-size', 'lg')
    expect(panel.querySelector('[data-slot="sheet-body"]')).toBeTruthy()
  })
})

describe('Alert is not always news (K-03)', () => {
  it('stays a quiet region unless it says otherwise', () => {
    const { rerender } = render(<Alert>Disk is nearly full</Alert>)
    // `role="alert"` interrupts a screen-reader user on every mount, which is
    // wrong for a banner that is simply part of the page.
    expect(screen.queryByRole('alert')).toBeNull()
    rerender(<Alert live>Save failed</Alert>)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })
})

describe('SidebarProvider keeps its hands off Ctrl+B on request (K-04)', () => {
  it('does not claim the shortcut when it is turned off', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    render(
      <SidebarProvider shortcut={null} onOpenChange={onOpenChange}>
        <span>content</span>
      </SidebarProvider>
    )
    await user.keyboard('{Control>}b{/Control}')
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it('still toggles on the default key', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    render(
      <SidebarProvider onOpenChange={onOpenChange}>
        <span>content</span>
      </SidebarProvider>
    )
    await user.keyboard('{Control>}b{/Control}')
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})

describe('ToggleGroupItem tone (K-05)', () => {
  it('lets one item disagree with the group', () => {
    render(
      <ToggleGroup type="single" tone="info" defaultValue="a">
        <ToggleGroupItem value="a">Keep</ToggleGroupItem>
        <ToggleGroupItem value="b" tone="danger">
          Delete
        </ToggleGroupItem>
      </ToggleGroup>
    )
    expect(screen.getByText('Keep').closest('button')).toHaveAttribute('data-tone', 'info')
    // The group's tone used to be forwarded unconditionally, so one
    // destructive item in a neutral bar was not expressible.
    expect(screen.getByText('Delete').closest('button')).toHaveAttribute('data-tone', 'danger')
  })
})

describe('Progress and AvatarGroup (K-06)', () => {
  it('stops claiming a percentage it does not know', () => {
    const { container, rerender } = render(<Progress value={40} />)
    const bar = container.querySelector('[data-slot="progress"]')!
    expect(bar).toHaveAttribute('aria-valuenow', '40')
    rerender(<Progress value={40} indeterminate />)
    expect(bar).toHaveAttribute('data-indeterminate', 'true')
    expect(bar).not.toHaveAttribute('aria-valuenow')
  })

  it('caps a stack and counts the rest', () => {
    const { container } = render(
      <AvatarGroup max={3}>
        {['A', 'B', 'C', 'D', 'E'].map((name) => (
          <Avatar key={name}>
            <AvatarFallback>{name}</AvatarFallback>
          </Avatar>
        ))}
      </AvatarGroup>
    )
    // Three circles on screen either way: two people and the chip.
    expect(container.querySelectorAll('.mz-avatar')).toHaveLength(3)
    expect(container.querySelectorAll('[data-slot="avatar"]')).toHaveLength(2)
    expect(screen.getByText('+3')).toBeInTheDocument()
  })

  it('leaves a stack that fits alone', () => {
    const { container } = render(
      <AvatarGroup max={5}>
        {['A', 'B'].map((name) => (
          <Avatar key={name}>
            <AvatarFallback>{name}</AvatarFallback>
          </Avatar>
        ))}
      </AvatarGroup>
    )
    expect(container.querySelectorAll('.mz-avatar')).toHaveLength(2)
    expect(container.querySelector('[data-slot="avatar-overflow"]')).toBeNull()
  })
})

describe('a sortable header for the hand-laid table (V-06)', () => {
  it('draws the control and claims aria-sort only where it sorts', async () => {
    const onSort = vi.fn()
    const user = userEvent.setup()
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead sortable sorted="desc" sortLabel="Sort by Amount" onSort={onSort}>
              Amount
            </TableHead>
            <TableHead>Note</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>1</TableCell>
            <TableCell>x</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )
    expect(screen.getByRole('columnheader', { name: /Amount/ })).toHaveAttribute('aria-sort', 'descending')
    expect(screen.getByRole('columnheader', { name: 'Note' })).not.toHaveAttribute('aria-sort')
    await user.click(screen.getByRole('button', { name: /Amount/ }))
    expect(onSort).toHaveBeenCalled()
  })
})

describe('DatePicker (K-11)', () => {
  it('opens the kit’s calendar and reports the day in the local format', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(
      <DatePicker
        locale="en-GB"
        today={new Date(2026, 2, 15)}
        defaultValue={new Date(2026, 2, 15)}
        onChange={onChange}
        labels={{ open: 'Pick a day' }}
      />
    )
    const trigger = screen.getByRole('button', { name: 'Pick a day' })
    expect(trigger).toHaveTextContent(new Date(2026, 2, 15).toLocaleDateString('en-GB'))
    await user.click(trigger)
    const days = (await screen.findAllByRole('button')).filter(
      (button) => button.dataset.slot === 'calendar-day'
    )
    const twentieth = days.find((day) => day.textContent === '20' && !day.dataset.outside)!
    await user.click(twentieth)
    expect(onChange).toHaveBeenCalled()
    expect(onChange.mock.calls[0]![0].getDate()).toBe(20)
  })

  it('clears without opening the calendar it just emptied', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<DatePicker defaultValue={new Date(2026, 2, 15)} onChange={onChange} />)
    await user.click(screen.getByRole('button', { name: 'Clear' }))
    expect(onChange).toHaveBeenCalledWith(undefined)
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

describe('day <-> wire format', () => {
  it('never crosses a date line on the way to the backend', () => {
    // toISOString().slice(0, 10) files an evening east of Greenwich under the
    // next day and a morning west of it under the previous one.
    expect(toISODate(new Date(2026, 0, 1, 23, 30))).toBe('2026-01-01')
    expect(toISODate(new Date(2026, 11, 31, 0, 15))).toBe('2026-12-31')
    expect(fromISODate('2026-03-01')?.getMonth()).toBe(2)
    expect(fromISODate('2026-02-31')).toBeUndefined()
    expect(fromISODate('nonsense')).toBeUndefined()
  })
})

describe('Combobox and MultiSelect (K-11)', () => {
  const cities = [
    { value: 'msk', label: 'Moscow' },
    { value: 'spb', label: 'Saint Petersburg' },
    { value: 'kzn', label: 'Kazan', disabled: true },
    { value: 'nsk', label: 'Novosibirsk' },
  ]

  it('filters the list it was given and reports the pick', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Combobox options={cities} onChange={onChange} />)

    await user.click(screen.getByRole('combobox'))
    await user.type(screen.getByRole('searchbox'), 'petersburg')
    expect(screen.getAllByRole('option')).toHaveLength(1)

    await user.click(screen.getByRole('option', { name: 'Saint Petersburg' }))
    expect(onChange).toHaveBeenCalledWith('spb', expect.objectContaining({ value: 'spb' }))
    // One choice is the whole answer: the list closes and the field says so.
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(screen.getByRole('combobox')).toHaveTextContent('Saint Petersburg')
  })

  it('moves the highlight with the arrows and skips what cannot be picked', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Combobox options={cities} onChange={onChange} />)

    await user.click(screen.getByRole('combobox'))
    // msk -> spb -> (kzn is disabled, so the second press passes over it) -> nsk
    await user.keyboard('{ArrowDown}{ArrowDown}')
    await user.keyboard('{Enter}')
    expect(onChange).toHaveBeenCalledWith('nsk', expect.objectContaining({ value: 'nsk' }))
  })

  it('takes the arrows with no search box to put them in', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Combobox options={cities} searchable={false} onChange={onChange} />)
    await user.click(screen.getByRole('combobox'))
    // Nothing else in the panel can hold focus, so the list holds it.
    expect(screen.getByRole('listbox')).toHaveFocus()
    await user.keyboard('{ArrowDown}{Enter}')
    expect(onChange).toHaveBeenCalledWith('spb', expect.objectContaining({ value: 'spb' }))
  })

  it('empties the field without opening the list it just emptied', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Combobox options={cities} defaultValue="msk" onChange={onChange} />)
    await user.click(screen.getByRole('button', { name: 'Clear' }))
    expect(onChange).toHaveBeenCalledWith(undefined, undefined)
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('keeps the list open while several are ticked, and collapses the rest into +N', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<MultiSelect options={cities} maxChips={2} onChange={onChange} />)

    await user.click(screen.getByRole('combobox'))
    await user.click(screen.getByRole('option', { name: 'Moscow' }))
    expect(screen.getByRole('listbox')).toBeTruthy()
    await user.click(screen.getByRole('option', { name: 'Saint Petersburg' }))
    await user.click(screen.getByRole('option', { name: 'Novosibirsk' }))

    expect(onChange).toHaveBeenLastCalledWith(
      ['msk', 'spb', 'nsk'],
      expect.arrayContaining([expect.objectContaining({ label: 'Novosibirsk' })])
    )
    expect(screen.getByRole('option', { name: 'Moscow' })).toHaveAttribute('aria-selected', 'true')

    const trigger = screen.getByRole('combobox')
    expect(trigger).toHaveTextContent('Moscow')
    expect(trigger).toHaveTextContent('Saint Petersburg')
    expect(trigger).toHaveTextContent('+1')
  })

  it('drops the last chip on Backspace in an empty box', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<MultiSelect options={cities} defaultValue={['msk', 'spb']} onChange={onChange} />)
    await user.click(screen.getByRole('combobox'))
    await user.type(screen.getByRole('searchbox'), 'mos')
    // With a query typed, Backspace belongs to the text.
    await user.keyboard('{Backspace}')
    expect(onChange).not.toHaveBeenCalled()
    await user.keyboard('{Backspace}{Backspace}{Backspace}')
    expect(onChange).toHaveBeenCalledWith(['msk'], [expect.objectContaining({ value: 'msk' })])
  })

  it('ticks and clears what is on screen, not what is behind the search', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<MultiSelect options={cities} defaultValue={['msk']} onChange={onChange} />)
    await user.click(screen.getByRole('combobox'))
    await user.type(screen.getByRole('searchbox'), 'o')
    // Moscow and Novosibirsk match; Moscow is already in.
    await user.click(screen.getByRole('button', { name: 'All' }))
    expect(onChange).toHaveBeenLastCalledWith(['msk', 'nsk'], expect.anything())
  })

  describe('async options', () => {
    it('lets only the newest answer land', async () => {
      const pending = new Map<string, (options: { value: string; label: string }[]) => void>()
      const loadOptions = vi.fn(
        (query: string) =>
          new Promise<{ value: string; label: string }[]>((resolve) => pending.set(query, resolve))
      )
      const user = userEvent.setup()
      render(<Combobox loadOptions={loadOptions} debounce={5} />)

      await user.click(screen.getByRole('combobox'))
      // The list that has just opened asks at once, without the debounce.
      await vi.waitFor(() => expect(pending.has('')).toBe(true))
      await act(async () => pending.get('')!([{ value: 'all', label: 'Everything' }]))
      expect(screen.getByRole('option', { name: 'Everything' })).toBeTruthy()

      const box = screen.getByRole('searchbox')
      await user.type(box, 'a')
      await vi.waitFor(() => expect(pending.has('a')).toBe(true))
      await user.type(box, 'b')
      await vi.waitFor(() => expect(pending.has('ab')).toBe(true))

      // Both are in flight and the older one answers last, the way a slower
      // request does. It must not replace the newer list.
      await act(async () => {
        pending.get('ab')!([{ value: 'b', label: 'Newest' }])
        pending.get('a')!([{ value: 'a', label: 'Stale' }])
      })
      expect(screen.queryByRole('option', { name: 'Stale' })).toBeNull()
      expect(screen.getByRole('option', { name: 'Newest' })).toBeTruthy()
    })

    it('waits for minChars before asking anything at all', async () => {
      const loadOptions = vi.fn(async () => [{ value: 'a', label: 'A' }])
      const user = userEvent.setup()
      render(<Combobox loadOptions={loadOptions} minChars={3} debounce={1} />)

      await user.click(screen.getByRole('combobox'))
      await user.type(screen.getByRole('searchbox'), 'ab')
      expect(loadOptions).not.toHaveBeenCalled()
      expect(screen.getByText('Type 3 characters or more')).toBeTruthy()

      await user.type(screen.getByRole('searchbox'), 'c')
      await screen.findByRole('option', { name: 'A' })
      expect(loadOptions).toHaveBeenCalledWith('abc')
    })

    it('keeps the label of a value the current query no longer returns', async () => {
      const loadOptions = vi.fn(async (query: string) =>
        query === 'k' ? [{ value: 'kzn', label: 'Kazan' }] : [{ value: 'msk', label: 'Moscow' }]
      )
      const user = userEvent.setup()
      render(<Combobox loadOptions={loadOptions} debounce={1} />)

      await user.click(screen.getByRole('combobox'))
      await user.type(screen.getByRole('searchbox'), 'k')
      await user.click(await screen.findByRole('option', { name: 'Kazan' }))
      expect(screen.getByRole('combobox')).toHaveTextContent('Kazan')

      // A second opening asks again and gets an answer Kazan is not in.
      await user.click(screen.getByRole('combobox'))
      await screen.findByRole('option', { name: 'Moscow' })
      expect(screen.getByRole('combobox')).toHaveTextContent('Kazan')
    })

    it('says so when the request fails', async () => {
      const loadOptions = vi.fn(async () => {
        throw new Error('offline')
      })
      const user = userEvent.setup()
      render(<Combobox loadOptions={loadOptions} debounce={1} />)
      await user.click(screen.getByRole('combobox'))
      expect(await screen.findByRole('alert')).toHaveTextContent('The options could not be loaded')
    })
  })
})

describe('a control that says no but can still be asked why (K-07)', () => {
  const withTooltip = (button: React.ReactNode) => (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent>Fill in the title first</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )

  it('opens a tooltip over a button that is off', async () => {
    const user = userEvent.setup()
    render(withTooltip(<Button aria-disabled>Publish</Button>))
    // A natively disabled button dispatches no mouse events at all, so a
    // tooltip on it can never open — which is the one moment a reader most
    // wants to know why the button is off.
    await user.hover(screen.getByRole('button', { name: 'Publish' }))
    expect(await screen.findAllByText('Fill in the title first')).not.toHaveLength(0)
  })

  it('keeps it reachable, and says it is unavailable', () => {
    render(<Button aria-disabled>Publish</Button>)
    const button = screen.getByRole('button', { name: 'Publish' })
    expect(button).toHaveAttribute('aria-disabled', 'true')
    // Not `disabled`: that is what takes it out of the tab order and off the
    // pointer's map in the first place.
    expect(button).not.toBeDisabled()
  })

  it('refuses the click, and the submit that would have followed it', async () => {
    const onClick = vi.fn()
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault())
    const user = userEvent.setup()
    render(
      <form onSubmit={onSubmit}>
        <Button type="submit" aria-disabled onClick={onClick}>
          Save
        </Button>
      </form>
    )
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(onClick).not.toHaveBeenCalled()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('leaves a button that is not disabled alone', async () => {
    const onClick = vi.fn()
    const user = userEvent.setup()
    render(<Button onClick={onClick}>Save</Button>)
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})

describe('the command palette (K-11)', () => {
  const palette = (onSelect = vi.fn()) => (
    <Command>
      <CommandInput placeholder="Type a command…" aria-label="Command" />
      <CommandList>
        <CommandEmpty>Nothing found</CommandEmpty>
        <CommandGroup heading="Orders">
          <CommandItem value="New order" onSelect={onSelect}>
            New order <CommandShortcut>⌘N</CommandShortcut>
          </CommandItem>
          <CommandItem value="Open order" keywords={['find', 'search']} onSelect={onSelect}>
            Open order
          </CommandItem>
        </CommandGroup>
        <CommandGroup heading="Settings">
          <CommandItem value="Profile" onSelect={onSelect}>
            Profile
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  )

  const shownItems = () =>
    Array.from(document.querySelectorAll<HTMLElement>('[data-command-item]:not([hidden])')).map(
      (item) => item.dataset.value
    )

  it('filters on what was typed, and on what an item was tagged with', async () => {
    const user = userEvent.setup()
    render(palette())
    expect(shownItems()).toEqual(['New order', 'Open order', 'Profile'])

    await user.type(screen.getByRole('combobox', { name: 'Command' }), 'search')
    // "search" is nowhere in the label; it is one of the item's keywords.
    expect(shownItems()).toEqual(['Open order'])
    // A heading over nothing is worse than no heading.
    expect(screen.queryByText('Settings')).not.toBeVisible()
  })

  it('runs the highlighted item on Enter', async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()
    render(palette(onSelect))
    const input = screen.getByRole('combobox', { name: 'Command' })
    input.focus()
    // The first item is highlighted to begin with, so one press moves to the
    // second and Enter runs that one.
    await user.keyboard('{ArrowDown}{Enter}')
    expect(onSelect).toHaveBeenCalledWith('Open order')
  })

  it('keeps the highlight on something that is still on screen', async () => {
    const user = userEvent.setup()
    render(palette())
    const input = screen.getByRole('combobox', { name: 'Command' })
    input.focus()
    await user.keyboard('{ArrowDown}{ArrowDown}')
    expect(input).toHaveAttribute('aria-activedescendant', expect.stringContaining('Profile'))
    await user.type(input, 'order')
    // Profile is gone; the highlight went to the top rather than nowhere.
    expect(shownItems()).toEqual(['New order', 'Open order'])
    const active = document.querySelector('[data-command-item][data-highlighted]') as HTMLElement
    expect(active.dataset.value).toBe('New order')
  })

  it('says so when nothing matches', async () => {
    const user = userEvent.setup()
    render(palette())
    await user.type(screen.getByRole('combobox', { name: 'Command' }), 'zzz')
    expect(screen.getByText('Nothing found')).toBeInTheDocument()
    expect(shownItems()).toEqual([])
  })

  it('opens on the shortcut every application has agreed on', async () => {
    const user = userEvent.setup()
    render(
      <CommandDialog>
        <CommandInput aria-label="Command" />
        <CommandList>
          <CommandItem value="New order">New order</CommandItem>
        </CommandList>
      </CommandDialog>
    )
    expect(screen.queryByRole('dialog')).toBeNull()
    await user.keyboard('{Control>}k{/Control}')
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    // And it is a dialog with a name, not an unlabelled box.
    expect(screen.getByRole('dialog', { name: 'Command palette' })).toBeInTheDocument()
  })
})

describe('NumberInput (K-11)', () => {
  it('takes a comma where a comma is the decimal separator', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<NumberInput onChange={onChange} aria-label="Amount" />)
    await user.type(screen.getByRole('spinbutton', { name: 'Amount' }), '1,5')
    // `type="number"` reports an empty string for this and the host cannot
    // tell it from a cleared field.
    expect(onChange).toHaveBeenLastCalledWith(1.5)
  })

  it('steps with the arrows and with the buttons', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<NumberInput defaultValue={10} step={0.5} onChange={onChange} aria-label="Amount" />)
    const field = screen.getByRole('spinbutton', { name: 'Amount' })
    field.focus()
    await user.keyboard('{ArrowUp}')
    expect(onChange).toHaveBeenLastCalledWith(10.5)
    await user.click(screen.getByRole('button', { name: 'Decrease' }))
    expect(onChange).toHaveBeenLastCalledWith(10)
    expect(field).toHaveAttribute('aria-valuenow', '10')
  })

  it('applies the bounds when the field is left, not under the caret', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(
      <>
        <NumberInput min={5} max={20} onChange={onChange} aria-label="Amount" />
        <button type="button">elsewhere</button>
      </>
    )
    const field = screen.getByRole('spinbutton', { name: 'Amount' })
    await user.type(field, '1')
    // Clamping "1" on its way to "12" would fight the typing.
    expect(onChange).toHaveBeenLastCalledWith(1)
    await user.click(screen.getByRole('button', { name: 'elsewhere' }))
    expect(onChange).toHaveBeenLastCalledWith(5)
  })

  it('draws its unit and keeps the steppers off the tab order', () => {
    render(<NumberInput defaultValue={1000} unit="₽" aria-label="Amount" />)
    expect(screen.getByText('₽')).toBeInTheDocument()
    // Two extra tab stops per number is a form nobody can get out of.
    for (const stepper of screen.getAllByRole('button')) {
      expect(stepper).toHaveAttribute('tabindex', '-1')
    }
  })
})

describe('the small composites (K-11)', () => {
  it('names the modifier key the platform actually uses', () => {
    render(<KbdSequence keys={['mod', 'k']} />)
    // happy-dom is not a Mac, so it is Ctrl — and the server render says the
    // same thing, which is what keeps hydration quiet.
    expect(screen.getByText('Ctrl')).toBeInTheDocument()
    expect(screen.getByText('K')).toBeInTheDocument()
  })

  it('folds a section away and back', async () => {
    const user = userEvent.setup()
    render(
      <Collapsible>
        <CollapsibleTrigger>Advanced</CollapsibleTrigger>
        <CollapsibleContent>Rarely needed</CollapsibleContent>
      </Collapsible>
    )
    expect(screen.queryByText('Rarely needed')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Advanced' }))
    expect(screen.getByText('Rarely needed')).toBeInTheDocument()
  })

  it('opens a menu on the right button', async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()
    render(
      <ContextMenu>
        <ContextMenuTrigger>A row</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onSelect={onSelect}>Delete</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    )
    await user.pointer({ keys: '[MouseRight]', target: screen.getByText('A row') })
    await user.click(await screen.findByRole('menuitem', { name: 'Delete' }))
    expect(onSelect).toHaveBeenCalled()
  })

  it('draws an empty state out of its own parts', () => {
    render(
      <Empty>
        <EmptyTitle>No orders yet</EmptyTitle>
        <EmptyDescription>They will appear here as they come in.</EmptyDescription>
        <EmptyActions>
          <Button size="sm">New order</Button>
        </EmptyActions>
      </Empty>
    )
    expect(screen.getByText('No orders yet')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New order' })).toBeInTheDocument()
  })
})

