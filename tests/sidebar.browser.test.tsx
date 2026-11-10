import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { userEvent } from 'vitest/browser'

import {
  Sidebar,
  SidebarContent,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from '../src'
import '../src/styles/index.css'

/**
 * A collapsed offcanvas panel is zero pixels wide, and its links were still
 * in the tab order (A-16). `inert` is what takes them out, and only a real
 * engine walks the tab order the way a keyboard does.
 */
describe('a collapsed offcanvas sidebar', () => {
  const shell = (open: boolean) => (
    <SidebarProvider storageKey={null} open={open} mobileBreakpoint={0}>
      <button type="button">Before</button>
      <Sidebar collapsible="offcanvas">
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton>Orders</SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <button type="button">After</button>
      </SidebarInset>
    </SidebarProvider>
  )

  it('is skipped by Tab while put away', async () => {
    render(shell(false))
    screen.getByRole('button', { name: 'Before' }).focus()
    await userEvent.keyboard('{Tab}')
    expect(screen.getByRole('button', { name: 'After' })).toHaveFocus()
  })

  it('is walked through again once it is open', async () => {
    render(shell(true))
    screen.getByRole('button', { name: 'Before' }).focus()
    await userEvent.keyboard('{Tab}')
    expect(screen.getByRole('button', { name: 'Orders' })).toHaveFocus()
  })
})
