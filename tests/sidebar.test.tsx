import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
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
