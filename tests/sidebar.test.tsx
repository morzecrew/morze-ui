import { describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { hydrateRoot } from 'react-dom/client'
import userEvent from '@testing-library/user-event'

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarPanel,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '../src'

function Shell({
  onState,
  ...providerProps
}: { onState?: (state: string) => void } & React.ComponentProps<typeof SidebarProvider>) {
  return (
    <SidebarProvider {...providerProps}>
      <Sidebar>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Work</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton isActive tooltip="Orders">
                  <span>Orders</span>
                </SidebarMenuButton>
                <SidebarMenuBadge>12</SidebarMenuBadge>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <SidebarTrigger />
        <SidebarPanel>
          <Probe onState={onState} />
        </SidebarPanel>
      </SidebarInset>
    </SidebarProvider>
  )
}

function Probe({ onState }: { onState?: (state: string) => void }) {
  const { state } = useSidebar()
  onState?.(state)
  return <span data-testid="state">{state}</span>
}

describe('Sidebar', () => {
  it('renders expanded by default and marks the active item', () => {
    render(<Shell storageKey={null} />)
    expect(screen.getByTestId('state')).toHaveTextContent('expanded')
    expect(screen.getByRole('button', { name: /Orders/ })).toHaveAttribute('data-active', 'true')
    expect(screen.getByText('12')).toBeTruthy()
  })

  it('collapses and expands from the trigger', async () => {
    render(<Shell storageKey={null} />)
    const trigger = screen.getByRole('button', { name: /Toggle sidebar/ })
    await userEvent.click(trigger)
    expect(screen.getByTestId('state')).toHaveTextContent('collapsed')
    await userEvent.click(trigger)
    expect(screen.getByTestId('state')).toHaveTextContent('expanded')
  })

  it('toggles on the keyboard shortcut', async () => {
    render(<Shell storageKey={null} />)
    await userEvent.keyboard('{Control>}b{/Control}')
    expect(screen.getByTestId('state')).toHaveTextContent('collapsed')
  })

  it('remembers the collapsed state', async () => {
    const key = 'test-sidebar'
    window.localStorage.removeItem(key)
    const first = render(<Shell storageKey={key} />)
    await userEvent.click(screen.getByRole('button', { name: /Toggle sidebar/ }))
    expect(window.localStorage.getItem(key)).toBe('false')
    first.unmount()

    // A fresh mount starts from defaultOpen and adopts the stored value after,
    // so server and client markup agree.
    render(<Shell storageKey={key} />)
    expect(await screen.findByText('collapsed')).toBeTruthy()
    window.localStorage.removeItem(key)
  })

  it('can be driven from outside', async () => {
    const onOpenChange = vi.fn()
    render(<Shell storageKey={null} open={false} onOpenChange={onOpenChange} />)
    expect(screen.getByTestId('state')).toHaveTextContent('collapsed')
    await userEvent.click(screen.getByRole('button', { name: /Toggle sidebar/ }))
    expect(onOpenChange).toHaveBeenCalledWith(true)
    // Still controlled by the prop until the parent says otherwise.
    expect(screen.getByTestId('state')).toHaveTextContent('collapsed')
  })

  it('survives blocked storage', () => {
    const original = Object.getOwnPropertyDescriptor(window, 'localStorage')
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('site data blocked')
      },
    })
    expect(() => render(<Shell />)).not.toThrow()
    if (original) Object.defineProperty(window, 'localStorage', original)
  })

  it('refuses to work outside a provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<SidebarTrigger />)).toThrow(/SidebarProvider/)
    spy.mockRestore()
  })
})

describe('Sidebar layout', () => {
  it('puts the navigation on the background and the content on the surface', () => {
    const { container } = render(<Shell storageKey={null} />)
    // inset is the default: nav on the page background, content raised.
    expect(container.querySelector('[data-slot="sidebar"]')).toHaveAttribute('data-variant', 'inset')
    expect(container.querySelector('[data-slot="sidebar-panel"]')).toHaveClass('mz-sidebar-panel')
  })

  it('still supports the surfaced and floating variants', () => {
    const { container } = render(
      <SidebarProvider storageKey={null}>
        <Sidebar variant="floating">
          <SidebarContent />
        </Sidebar>
      </SidebarProvider>
    )
    expect(container.querySelector('[data-slot="sidebar"]')).toHaveAttribute('data-variant', 'floating')
  })
})

// Layout outside the sidebar that lines up with its edge used to work the
// width out itself, with the kit's numbers hardcoded (#9).
describe('Sidebar width variable', () => {
  const wrapperWidth = (container: HTMLElement) =>
    (container.querySelector('[data-slot="sidebar-wrapper"]') as HTMLElement).style.getPropertyValue(
      '--mz-sidebar-width'
    )
  const htmlWidth = () => document.documentElement.style.getPropertyValue('--mz-sidebar-width')

  function Layout(props: React.ComponentProps<typeof Sidebar> & { open?: boolean }) {
    const { open, ...sidebar } = props
    return (
      <SidebarProvider storageKey={null} open={open}>
        <Sidebar {...sidebar}>
          <SidebarContent />
        </Sidebar>
      </SidebarProvider>
    )
  }

  it('follows the panel through expanded and the icon rail', async () => {
    const { container } = render(<Shell storageKey={null} />)
    expect(wrapperWidth(container)).toBe('var(--mz-sidebar-w)')
    expect(htmlWidth()).not.toBe('')
    await userEvent.click(screen.getByRole('button', { name: /Toggle sidebar/ }))
    expect(wrapperWidth(container)).toBe('var(--mz-sidebar-w-icon)')
  })

  it('is zero for a panel put away off-canvas', () => {
    const { container } = render(<Layout collapsible="offcanvas" open={false} />)
    expect(wrapperWidth(container)).toBe('0px')
  })

  it('counts the margin round a floating panel', () => {
    const { container } = render(<Layout variant="floating" />)
    expect(wrapperWidth(container)).toBe('calc(var(--mz-sidebar-w) + 16px)')
  })

  it('stays the full width for a panel that cannot collapse', () => {
    const { container } = render(<Layout collapsible="none" open={false} />)
    expect(wrapperWidth(container)).toBe('var(--mz-sidebar-w)')
  })

  it('assumes the default sidebar until one reports in, so the server is right', () => {
    const { container } = render(
      <SidebarProvider storageKey={null}>
        <main />
      </SidebarProvider>
    )
    expect(wrapperWidth(container)).toBe('var(--mz-sidebar-w)')
  })

  it('drops to zero when the sidebar goes, and leaves <html> clean on unmount', () => {
    const shell = (withSidebar: boolean) => (
      <SidebarProvider storageKey={null}>{withSidebar ? <Sidebar /> : null}</SidebarProvider>
    )
    const { container, rerender, unmount } = render(shell(true))
    rerender(shell(false))
    expect(wrapperWidth(container)).toBe('0px')
    unmount()
    expect(htmlWidth()).toBe('')
  })

  it('lets the host override it on the provider', () => {
    const { container } = render(
      <SidebarProvider storageKey={null} style={{ ['--mz-sidebar-width' as string]: '10px' }}>
        <Sidebar />
      </SidebarProvider>
    )
    expect(wrapperWidth(container)).toBe('10px')
  })
})

// A chevron reads as "back"; on a phone the trigger is the only way into the
// navigation (#22).
describe('SidebarTrigger icon', () => {
  const glyph = () => screen.getByRole('button', { name: /Toggle sidebar/ }).querySelector('svg path')?.getAttribute('d')

  it('folds an open panel with a chevron and opens a closed one with the panel', async () => {
    render(<Shell storageKey={null} />)
    const open = glyph()
    await userEvent.click(screen.getByRole('button', { name: /Toggle sidebar/ }))
    expect(glyph()).not.toBe(open)
    expect(screen.getByRole('button', { name: /Toggle sidebar/ })).toHaveAttribute('aria-expanded', 'false')
  })

  it('is the menu on a phone', () => {
    const original = window.matchMedia
    window.matchMedia = ((query: string) => ({
      matches: true,
      media: query,
      addEventListener() {},
      removeEventListener() {},
    })) as unknown as typeof window.matchMedia
    try {
      render(<Shell storageKey={null} />)
      const trigger = screen.getByRole('button', { name: /Toggle sidebar/ })
      expect(trigger).toHaveAttribute('data-mobile', 'true')
      expect(trigger.querySelector('svg path')?.getAttribute('d')).toBe('M4 6h16M4 12h16M4 18h16')
    } finally {
      window.matchMedia = original
    }
  })

  it('takes an icon of the host’s', () => {
    render(
      <SidebarProvider storageKey={null}>
        <SidebarTrigger icon={<i data-testid="own" />} />
      </SidebarProvider>
    )
    expect(screen.getByTestId('own')).toBeInTheDocument()
  })
})

describe('a collapsed offcanvas panel is out of reach (A-16)', () => {
  function Nav({ collapsible, open }: { collapsible: 'offcanvas' | 'icon'; open: boolean }) {
    return (
      <SidebarProvider storageKey={null} open={open}>
        <Sidebar collapsible={collapsible}>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton>Orders</SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
      </SidebarProvider>
    )
  }
  const panel = (container: HTMLElement) => container.querySelector('[data-slot="sidebar"]')!

  it('is inert while put away, so Tab cannot walk through it', () => {
    const { container, rerender } = render(<Nav collapsible="offcanvas" open={false} />)
    // happy-dom keeps an inert subtree focusable; the tab order itself is checked
    // in a real browser, in sidebar.browser.test.tsx.
    expect(panel(container)).toHaveAttribute('inert')

    rerender(<Nav collapsible="offcanvas" open />)
    expect(panel(container)).not.toHaveAttribute('inert')
  })

  it('leaves the icon rail live, since its icons are on screen', () => {
    const { container } = render(<Nav collapsible="icon" open={false} />)
    expect(panel(container)).not.toHaveAttribute('inert')
  })
})

describe('SidebarMenuButton says which page is current (A-29)', () => {
  it('sets aria-current="page" on the active item only', () => {
    render(
      <SidebarProvider storageKey={null}>
        <SidebarMenuButton isActive>Orders</SidebarMenuButton>
        <SidebarMenuButton>Plans</SidebarMenuButton>
        <SidebarMenuButton isActive aria-current="step">
          Review
        </SidebarMenuButton>
      </SidebarProvider>
    )
    expect(screen.getByRole('button', { name: 'Orders' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: 'Plans' })).not.toHaveAttribute('aria-current')
    // A host that says what kind of "current" it is keeps its word.
    expect(screen.getByRole('button', { name: 'Review' })).toHaveAttribute('aria-current', 'step')
  })
})

describe('SidebarMenuSkeleton hydrates without a mismatch (A-28)', () => {
  it('draws the same width on the server and the client', async () => {
    const tree = (
      <SidebarProvider storageKey={null}>
        <SidebarMenuSkeleton />
        <SidebarMenuSkeleton showIcon />
      </SidebarProvider>
    )
    // Deterministic: the same tree is the same markup, render after render.
    expect(renderToString(tree)).toBe(renderToString(tree))

    // React does not patch a mismatched attribute on hydration; it keeps the
    // server's and says so on the console, which is what is watched here.
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const host = document.createElement('div')
    host.innerHTML = renderToString(tree)
    document.body.appendChild(host)
    const widths = () =>
      Array.from(host.querySelectorAll<HTMLElement>('.mz-sidebar__menu-skeleton-text')).map((el) => el.style.width)
    const server = widths()
    server.forEach((width) => {
      const percent = Number.parseInt(width, 10)
      expect(percent).toBeGreaterThanOrEqual(50)
      expect(percent).toBeLessThan(90)
    })

    const errors: unknown[] = []
    const root = await act(async () => hydrateRoot(host, tree, { onRecoverableError: (e) => errors.push(e) }))
    expect(errors).toEqual([])
    expect(consoleError).not.toHaveBeenCalled()
    expect(widths()).toEqual(server)
    consoleError.mockRestore()
    act(() => root.unmount())
    host.remove()
  })
})
