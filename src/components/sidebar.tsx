'use client'

import * as React from 'react'
import { Slot } from 'radix-ui'

import { cn } from '../lib/utils'
import { ChevronLeftIcon, MenuIcon, PanelLeftIcon } from '../lib/icons'
import { defaultCommonLabels } from '../locales/defaults'
import { useLocaleLabels } from './locale-provider'
import { useIsMobile } from '../lib/use-is-mobile'
import { Input } from './input'
import { Separator } from './separator'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from './sheet'
import { Skeleton } from './skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip'

const STORAGE_KEY = 'morze-ui-sidebar'
const SHORTCUT = 'b'
const WIDTH_VAR = '--mz-sidebar-width'

type SidebarContextValue = {
  /** `expanded` | `collapsed` — what is painted, mobile aside. */
  state: 'expanded' | 'collapsed'
  open: boolean
  setOpen: (open: boolean) => void
  openMobile: boolean
  setOpenMobile: (open: boolean) => void
  isMobile: boolean
  toggleSidebar: () => void
  /** How the mounted `Sidebar` collapses and sits — see `sidebarWidth`. */
  registerSidebar: (shape: SidebarShape | null) => void
}

type SidebarShape = {
  collapsible: 'offcanvas' | 'icon' | 'none'
  variant: 'sidebar' | 'floating' | 'inset'
}

/** `Sidebar`'s own defaults: what the provider assumes before one mounts. */
const DEFAULT_SHAPE: SidebarShape = { collapsible: 'icon', variant: 'inset' }

/**
 * The room the sidebar takes in the layout, as a CSS length, mirroring the
 * widths sidebar.css draws: the full panel, the icon rail, or nothing (an
 * offcanvas panel put away, a mobile sheet, no sidebar at all). A floating
 * panel adds the 8px margin either side of it.
 */
function sidebarWidth(shape: SidebarShape | null, open: boolean, isMobile: boolean) {
  if (!shape) return '0px'
  let width: string
  if (shape.collapsible === 'none' || (!isMobile && open)) width = 'var(--mz-sidebar-w)'
  else if (!isMobile && shape.collapsible === 'icon') width = 'var(--mz-sidebar-w-icon)'
  else return '0px'
  return shape.variant === 'floating' ? `calc(${width} + 16px)` : width
}

const SidebarContext = React.createContext<SidebarContextValue | null>(null)

function useSidebar() {
  const context = React.useContext(SidebarContext)
  if (!context) throw new Error('useSidebar must be used inside <SidebarProvider>')
  return context
}

function readStored(key: string | null): boolean | null {
  if (!key || typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(key)
    return raw === null ? null : raw === 'true'
  } catch {
    return null
  }
}

type SidebarProviderProps = React.ComponentProps<'div'> & {
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** localStorage key for the collapsed state; `null` disables persistence. */
  storageKey?: string | null
  /** Width below which the sidebar becomes an overlay sheet. */
  mobileBreakpoint?: number
  /**
   * The key that toggles the panel, with Ctrl or ⌘. `null` turns the shortcut
   * off — Ctrl/⌘+B is Firefox's bookmarks sidebar and bold in every editor,
   * and the provider used to take it from the whole document with no way to
   * decline.
   */
  shortcut?: string | null
}

function SidebarProvider({
  defaultOpen = true,
  open: openProp,
  onOpenChange,
  storageKey = STORAGE_KEY,
  mobileBreakpoint = 768,
  shortcut = SHORTCUT,
  className,
  style,
  children,
  ref,
  ...props
}: SidebarProviderProps) {
  const isMobile = useIsMobile(mobileBreakpoint)
  // `undefined` until a Sidebar reports in — assumed to be the default one, so
  // the server markup already carries the right width — and `null` once the
  // only one has gone.
  const [shape, setShape] = React.useState<SidebarShape | null | undefined>(undefined)
  const [openMobile, setOpenMobile] = React.useState(false)
  // Server and first client render both start from defaultOpen; the stored
  // preference lands in an effect so hydration cannot mismatch.
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen)

  React.useEffect(() => {
    const stored = readStored(storageKey)
    if (stored !== null) setInternalOpen(stored)
  }, [storageKey])

  const open = openProp ?? internalOpen

  const setOpen = React.useCallback(
    (next: boolean) => {
      if (openProp === undefined) setInternalOpen(next)
      onOpenChange?.(next)
      if (!storageKey || typeof window === 'undefined') return
      try {
        window.localStorage.setItem(storageKey, String(next))
      } catch {
        /* blocked storage — the state just does not persist */
      }
    },
    [openProp, onOpenChange, storageKey]
  )

  const toggleSidebar = React.useCallback(() => {
    if (isMobile) setOpenMobile((current) => !current)
    else setOpen(!open)
  }, [isMobile, open, setOpen])

  React.useEffect(() => {
    if (!shortcut) return
    const key = shortcut.toLowerCase()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== key || !(event.metaKey || event.ctrlKey)) return
      event.preventDefault()
      toggleSidebar()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [toggleSidebar, shortcut])

  const value = React.useMemo<SidebarContextValue>(
    () => ({
      state: open ? 'expanded' : 'collapsed',
      open,
      setOpen,
      openMobile,
      setOpenMobile,
      isMobile,
      toggleSidebar,
      registerSidebar: setShape,
    }),
    [open, setOpen, openMobile, isMobile, toggleSidebar]
  )

  // The sidebar's current width, for layout outside it that has to line up
  // with its edge — a fixed overlay, a sticky scrollbar, a toast region. On
  // the wrapper it is an expression over the kit's own width tokens, so a
  // host that re-sizes the panel moves this with it. Portalled content does
  // not sit under the wrapper, so <html> gets the resolved length as well.
  const width = sidebarWidth(shape === undefined ? DEFAULT_SHAPE : shape, open, isMobile)
  const wrapperRef = React.useRef<HTMLDivElement>(null)
  React.useLayoutEffect(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) return
    const root = document.documentElement
    const resolved = getComputedStyle(wrapper).getPropertyValue(WIDTH_VAR).trim()
    root.style.setProperty(WIDTH_VAR, resolved || width)
    return () => {
      root.style.removeProperty(WIDTH_VAR)
    }
  })

  return (
    <SidebarContext.Provider value={value}>
      <div
        data-slot="sidebar-wrapper"
        data-state={value.state}
        className={cn('mz-sidebar-layout', className)}
        style={{ [WIDTH_VAR]: width, ...style } as React.CSSProperties}
        ref={(node) => {
          wrapperRef.current = node
          if (typeof ref === 'function') return ref(node)
          if (ref) ref.current = node
        }}
        {...props}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  )
}

type SidebarProps = React.ComponentProps<'div'> & {
  side?: 'left' | 'right'
  /** Announced to screen readers when the panel opens as a sheet on mobile. */
  mobileTitle?: string
  mobileDescription?: string
  /**
   * `inset` (default) leaves the navigation on the page background and raises
   * the content in a `SidebarPanel`; `sidebar` gives the navigation its own
   * surface; `floating` lifts it off the edge as a card.
   */
  variant?: 'sidebar' | 'floating' | 'inset'
  /**
   * `icon` keeps a rail of icons, `offcanvas` slides the panel away entirely,
   * `none` pins it open.
   */
  collapsible?: 'offcanvas' | 'icon' | 'none'
}

function Sidebar({
  side = 'left',
  variant = 'inset',
  collapsible = 'icon',
  mobileTitle,
  mobileDescription,
  className,
  children,
  ...props
}: SidebarProps) {
  const { isMobile, state, openMobile, setOpenMobile, registerSidebar } = useSidebar()
  const common = useLocaleLabels('common', defaultCommonLabels)

  React.useLayoutEffect(() => {
    registerSidebar({ collapsible, variant })
    return () => registerSidebar(null)
  }, [registerSidebar, collapsible, variant])

  // On a narrow screen the sidebar is an overlay, not a column: collapsing to
  // a rail would eat the little width that is left.
  if (isMobile && collapsible !== 'none') {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile}>
        <SheetContent
          side={side}
          showCloseButton={false}
          data-slot="sidebar"
          data-mobile="true"
          // Deliberately without `mz-sidebar`: that class positions a sticky
          // column and would override the sheet's fixed placement.
          className={cn('mz-sidebar--mobile', className)}
        >
          <SheetHeader className="mz-sr-only">
            <SheetTitle>{mobileTitle ?? common.sidebarNavigation}</SheetTitle>
            <SheetDescription>{mobileDescription ?? common.sidebarSections}</SheetDescription>
          </SheetHeader>
          <div className="mz-sidebar__inner">{children}</div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <div
      data-slot="sidebar"
      data-state={state}
      data-side={side}
      data-variant={variant}
      data-collapsible={collapsible === 'none' ? undefined : collapsible}
      className={cn('mz-sidebar', className)}
      {...props}
    >
      <div className="mz-sidebar__inner">{children}</div>
    </div>
  )
}

/**
 * The icon says what a press does. A chevron reads as "back", which is right
 * for folding an open panel away and wrong everywhere else (#22): on a phone
 * the trigger is the only way into the navigation, so it is the menu; with the
 * panel collapsed it is the panel, to be opened. `icon` replaces all three.
 */
function SidebarTrigger({
  className,
  onClick,
  label: labelProp,
  icon,
  ...props
}: React.ComponentProps<'button'> & { label?: string; icon?: React.ReactNode }) {
  const { toggleSidebar, state, isMobile } = useSidebar()
  const common = useLocaleLabels('common', defaultCommonLabels)
  const label = labelProp ?? common.toggleSidebar
  const Glyph = isMobile ? MenuIcon : state === 'collapsed' ? PanelLeftIcon : ChevronLeftIcon
  return (
    <button
      type="button"
      data-slot="sidebar-trigger"
      data-state={state}
      data-mobile={isMobile || undefined}
      aria-label={label}
      aria-expanded={isMobile ? undefined : state === 'expanded'}
      title={label}
      className={cn('mz-sidebar__trigger mz-focusable', className)}
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented) toggleSidebar()
      }}
      {...props}
    >
      {icon ?? <Glyph className="mz-sidebar__trigger-icon" />}
    </button>
  )
}

/** Thin strip along the sidebar edge — click anywhere on it to toggle. */
function SidebarRail({
  className,
  label,
  ...props
}: React.ComponentProps<'button'> & { label?: string }) {
  const { toggleSidebar } = useSidebar()
  const common = useLocaleLabels('common', defaultCommonLabels)
  return (
    <button
      type="button"
      data-slot="sidebar-rail"
      aria-label={label ?? common.toggleSidebar}
      tabIndex={-1}
      className={cn('mz-sidebar__rail', className)}
      onClick={toggleSidebar}
      {...props}
    />
  )
}

function SidebarInset({ className, ...props }: React.ComponentProps<'main'>) {
  return <main data-slot="sidebar-inset" className={cn('mz-sidebar-inset', className)} {...props} />
}

/**
 * The raised content surface next to the navigation. Anything that belongs on
 * the page background — a top bar, breadcrumbs — goes in `SidebarInset` above
 * it, not inside.
 */
function SidebarPanel({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sidebar-panel" className={cn('mz-sidebar-panel', className)} {...props} />
}

function SidebarInput({ className, ...props }: React.ComponentProps<typeof Input>) {
  return (
    <Input data-slot="sidebar-input" inputSize="sm" className={cn('mz-sidebar__input', className)} {...props} />
  )
}

function SidebarHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sidebar-header" className={cn('mz-sidebar__header', className)} {...props} />
}

function SidebarFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sidebar-footer" className={cn('mz-sidebar__footer', className)} {...props} />
}

function SidebarSeparator({ className, ...props }: React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      data-slot="sidebar-separator"
      className={cn('mz-sidebar__separator', className)}
      {...props}
    />
  )
}

function SidebarContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sidebar-content" className={cn('mz-sidebar__content', className)} {...props} />
}

function SidebarGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sidebar-group" className={cn('mz-sidebar__group', className)} {...props} />
}

function SidebarGroupLabel({
  className,
  asChild = false,
  ...props
}: React.ComponentProps<'div'> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'div'
  return (
    <Comp data-slot="sidebar-group-label" className={cn('mz-sidebar__group-label', className)} {...props} />
  )
}

function SidebarGroupAction({
  className,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'button'
  return (
    <Comp
      data-slot="sidebar-group-action"
      className={cn('mz-sidebar__group-action mz-focusable', className)}
      {...props}
    />
  )
}

function SidebarGroupContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div data-slot="sidebar-group-content" className={cn('mz-sidebar__group-content', className)} {...props} />
  )
}

function SidebarMenu({ className, ...props }: React.ComponentProps<'ul'>) {
  return <ul data-slot="sidebar-menu" className={cn('mz-sidebar__menu', className)} {...props} />
}

function SidebarMenuItem({ className, ...props }: React.ComponentProps<'li'>) {
  return <li data-slot="sidebar-menu-item" className={cn('mz-sidebar__menu-item', className)} {...props} />
}

type SidebarMenuButtonProps = React.ComponentProps<'button'> & {
  asChild?: boolean
  isActive?: boolean
  size?: 'sm' | 'md' | 'lg'
  /** Shown as a tooltip while the sidebar is collapsed to icons. */
  tooltip?: React.ReactNode
}

function SidebarMenuButton({
  asChild = false,
  isActive = false,
  size = 'md',
  tooltip,
  className,
  ...props
}: SidebarMenuButtonProps) {
  const Comp = asChild ? Slot.Root : 'button'
  const { isMobile, state } = useSidebar()

  const button = (
    <Comp
      data-slot="sidebar-menu-button"
      data-size={size}
      data-active={isActive || undefined}
      className={cn('mz-sidebar__menu-button mz-focusable', className)}
      {...props}
    />
  )

  // The label is clipped in the rail, so it is offered as a tooltip instead.
  if (!tooltip || state !== 'collapsed' || isMobile) return button

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="right" align="center">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  )
}

function SidebarMenuAction({
  className,
  asChild = false,
  showOnHover = false,
  ...props
}: React.ComponentProps<'button'> & { asChild?: boolean; showOnHover?: boolean }) {
  const Comp = asChild ? Slot.Root : 'button'
  return (
    <Comp
      data-slot="sidebar-menu-action"
      data-hover-only={showOnHover || undefined}
      className={cn('mz-sidebar__menu-action mz-focusable', className)}
      {...props}
    />
  )
}

function SidebarMenuBadge({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div data-slot="sidebar-menu-badge" className={cn('mz-sidebar__menu-badge', className)} {...props} />
  )
}

function SidebarMenuSkeleton({
  className,
  showIcon = false,
  ...props
}: React.ComponentProps<'div'> & { showIcon?: boolean }) {
  // A stable pseudo-random width keeps the placeholder from re-flowing.
  const width = React.useMemo(() => `${Math.floor(Math.random() * 40) + 50}%`, [])
  return (
    <div
      data-slot="sidebar-menu-skeleton"
      className={cn('mz-sidebar__menu-skeleton', className)}
      {...props}
    >
      {showIcon ? <Skeleton className="mz-sidebar__menu-skeleton-icon" /> : null}
      <Skeleton className="mz-sidebar__menu-skeleton-text" style={{ width }} />
    </div>
  )
}

function SidebarMenuSub({ className, ...props }: React.ComponentProps<'ul'>) {
  return <ul data-slot="sidebar-menu-sub" className={cn('mz-sidebar__menu-sub', className)} {...props} />
}

function SidebarMenuSubItem({ className, ...props }: React.ComponentProps<'li'>) {
  return (
    <li data-slot="sidebar-menu-sub-item" className={cn('mz-sidebar__menu-sub-item', className)} {...props} />
  )
}

function SidebarMenuSubButton({
  asChild = false,
  isActive = false,
  size = 'md',
  className,
  ...props
}: React.ComponentProps<'a'> & {
  asChild?: boolean
  isActive?: boolean
  size?: 'sm' | 'md'
}) {
  const Comp = asChild ? Slot.Root : 'a'
  return (
    <Comp
      data-slot="sidebar-menu-sub-button"
      data-size={size}
      data-active={isActive || undefined}
      className={cn('mz-sidebar__menu-sub-button mz-focusable', className)}
      {...props}
    />
  )
}

export {
  useSidebar,
  SidebarProvider,
  Sidebar,
  SidebarTrigger,
  SidebarRail,
  SidebarInset,
  SidebarPanel,
  SidebarInput,
  SidebarHeader,
  SidebarFooter,
  SidebarSeparator,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
}
export type { SidebarProps, SidebarProviderProps, SidebarMenuButtonProps }
