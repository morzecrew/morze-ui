import type React from 'react'
import { useState } from 'react'
import {
  Badge,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarPanel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from '@morze/ui'

const Icon = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)
const ICONS = {
  home: 'M3 11l9-8 9 8M5 10v10h14V10',
  orders: 'M4 6h16M4 12h16M4 18h10',
  clients: 'M16 20v-2a4 4 0 0 0-8 0v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  reports: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19 12a7 7 0 0 0-.1-1l2-1.6-2-3.4-2.4 1a7 7 0 0 0-1.7-1L14.5 2h-4l-.3 2.6a7 7 0 0 0-1.7 1l-2.4-1-2 3.4L6 11a7 7 0 0 0 0 2l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 1.7 1l.3 2.6h4l.3-2.6a7 7 0 0 0 1.7-1l2.4 1 2-3.4-2-1.6c.1-.3.1-.7.1-1Z',
  plus: 'M12 5v14M5 12h14',
  dots: 'M12 6h.01M12 12h.01M12 18h.01',
}

const NAV = [
  { id: 'home', label: 'Overview', icon: ICONS.home },
  { id: 'orders', label: 'Orders', icon: ICONS.orders, badge: '12' },
  { id: 'clients', label: 'Clients', icon: ICONS.clients },
  { id: 'reports', label: 'Reports', icon: ICONS.reports },
]

/**
 * On a narrow screen the sidebar is a sheet, so it takes its trigger with it
 * when it closes — that is the one case where the button has to live outside.
 */
function MobileTrigger() {
  const { isMobile } = useSidebar()
  return isMobile ? <SidebarTrigger /> : null
}

export default function SidebarDemo() {
  const [active, setActive] = useState('orders')

  return (
    <SidebarProvider
      className="mz-sidebar-layout--grid"
      style={
        {
          minHeight: 520,
          borderRadius: 12,
          overflow: 'hidden',
          border: '1px solid var(--mz-border)',
          // Embedded in a card, so the column follows the panel, not the viewport.
          '--mz-sidebar-h': '100%',
        } as React.CSSProperties
      }
    >
      <Sidebar collapsible="icon">
        <SidebarHeader>
          {/* Branding steps aside in the rail so the toggle keeps the row. */}
          <span
            aria-hidden="true"
            className="mz-sidebar-hide-collapsed"
            style={{
              display: 'grid',
              placeContent: 'center',
              width: 28,
              height: 28,
              flexShrink: 0,
              borderRadius: 8,
              background: 'linear-gradient(135deg, rgb(var(--mz-primary-rgb)), rgba(var(--mz-primary-rgb), .7))',
              color: '#fff',
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            M
          </span>
          <b className="mz-sidebar-hide-collapsed" style={{ fontSize: 14, whiteSpace: 'nowrap' }}>
            Morze ERP
          </b>
          <SidebarTrigger className="mz-sidebar-push" />
        </SidebarHeader>
        <SidebarInput placeholder="Search…" />
        <SidebarSeparator />
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Work</SidebarGroupLabel>
            <SidebarGroupAction aria-label="Add">
              <Icon d={ICONS.plus} />
            </SidebarGroupAction>
            <SidebarGroupContent>
              <SidebarMenu>
                {NAV.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      isActive={active === item.id}
                      tooltip={item.label}
                      onClick={() => setActive(item.id)}
                    >
                      <Icon d={item.icon} />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                    {item.badge ? <SidebarMenuBadge>{item.badge}</SidebarMenuBadge> : null}
                    {!item.badge ? (
                      <SidebarMenuAction showOnHover aria-label="More">
                        <Icon d={ICONS.dots} />
                      </SidebarMenuAction>
                    ) : null}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>Settings</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Preferences">
                    <Icon d={ICONS.settings} />
                    <span>Preferences</span>
                  </SidebarMenuButton>
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton href="#" isActive>
                        Profile
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton href="#">Integrations</SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <Badge className="mz-sidebar-hide-collapsed" variant="soft" tone="accent" dot>
            online
          </Badge>
          <span
            className="mz-sidebar-hide-collapsed"
            style={{ fontSize: 12, color: 'var(--mz-text-muted)', whiteSpace: 'nowrap' }}
          >
            A. Sokolov
          </span>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        {/* The top bar stays on the page background, next to the navigation. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
          <MobileTrigger />
          <b style={{ fontSize: 15 }}>{NAV.find((n) => n.id === active)?.label ?? 'Preferences'}</b>
        </div>
        <SidebarPanel>
          <div style={{ color: 'var(--mz-text-dim)', fontSize: 14 }}>
            Section content. Collapse with the button in the panel header or ⌘/Ctrl+B.
          </div>
        </SidebarPanel>
      </SidebarInset>
    </SidebarProvider>
  )
}
