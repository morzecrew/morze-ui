'use client'

import * as React from 'react'

import { cn } from '../lib/utils'
import { SearchIcon } from '../lib/icons'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './dialog'

/* --------------------------------------------------------------------------
   The command palette (K-11) — ⌘K.

   Hand-written rather than cmdk-shaped-around-cmdk, for the same reason the
   Calendar has no date library behind it: the whole of it is a filtered list
   with one highlight, and the parts that are actually hard — where the
   highlight goes when the list changes under it, what Enter runs — are the
   parts a dependency would not settle for us anyway.

   Which item is on screen is read from the DOM rather than from a registry of
   children: the list is what the reader sees, so the list is the source of
   truth for where the arrows can go and for whether there is anything left.
   -------------------------------------------------------------------------- */

type CommandContextValue = {
  query: string
  setQuery: (query: string) => void
  active: string | null
  setActive: (value: string | null) => void
  matches: (value: string, keywords?: string[]) => boolean
  /** Bumped by every item that mounts or unmounts, so the root recounts. */
  version: number
  bump: () => void
  empty: boolean
  listId: string
  inputId: string
}

const CommandContext = React.createContext<CommandContextValue | null>(null)

function useCommand(part: string) {
  const context = React.useContext(CommandContext)
  if (!context) throw new Error(`${part} must be rendered inside <Command>`)
  return context
}

export type CommandFilter = (value: string, query: string, keywords?: string[]) => boolean

/** Substring, over the value and anything the item was tagged with. */
const defaultFilter: CommandFilter = (value, query, keywords) => {
  const needle = query.trim().toLocaleLowerCase()
  if (!needle) return true
  const haystack = [value, ...(keywords ?? [])].join(' ').toLocaleLowerCase()
  return haystack.includes(needle)
}

function Command({
  className,
  filter = defaultFilter,
  children,
  ...props
}: React.ComponentProps<'div'> & {
  /** Replaces the substring match — for fuzzy scoring, or a synonym table. */
  filter?: CommandFilter
}) {
  const [query, setQuery] = React.useState('')
  const [active, setActive] = React.useState<string | null>(null)
  const [version, setVersion] = React.useState(0)
  const [empty, setEmpty] = React.useState(false)
  const listRef = React.useRef<HTMLDivElement>(null)
  const rootRef = React.useRef<HTMLDivElement>(null)

  const bump = React.useCallback(() => setVersion((v) => v + 1), [])
  const matches = React.useCallback(
    (value: string, keywords?: string[]) => filter(value, query, keywords),
    [filter, query]
  )

  /** The items the reader can actually see, in the order they are drawn. */
  const visibleItems = React.useCallback(
    () =>
      Array.from(
        rootRef.current?.querySelectorAll<HTMLElement>('[data-command-item]:not([hidden])') ?? []
      ),
    []
  )

  // The highlight belongs to a list, and the list changes with every keystroke:
  // an item that has just been filtered away must not keep it, and a list that
  // has just gained one must not be left with nothing highlighted.
  React.useEffect(() => {
    const items = visibleItems()
    setEmpty(items.length === 0)
    const stillThere = items.some((item) => item.dataset.value === active)
    if (!stillThere) setActive(items[0]?.dataset.value ?? null)
  }, [query, version, active, visibleItems])

  const move = (delta: number) => {
    const items = visibleItems()
    if (items.length === 0) return
    const index = items.findIndex((item) => item.dataset.value === active)
    const next = items[(index + delta + items.length) % items.length]
    setActive(next?.dataset.value ?? null)
    next?.scrollIntoView?.({ block: 'nearest' })
  }

  const run = () => {
    // Through the item's own click, so a host that put an `onClick` on it —
    // or wrapped it in a link — gets exactly what a pointer would have done.
    const items = visibleItems()
    items.find((item) => item.dataset.value === active)?.click()
  }

  const listId = React.useId()
  const inputId = React.useId()

  return (
    <CommandContext.Provider
      value={{ query, setQuery, active, setActive, matches, version, bump, empty, listId, inputId }}
    >
      <div
        ref={rootRef}
        data-slot="command"
        className={cn('mz-command', className)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault()
            move(1)
          } else if (event.key === 'ArrowUp') {
            event.preventDefault()
            move(-1)
          } else if (event.key === 'Enter' && active) {
            event.preventDefault()
            run()
          } else if (event.key === 'Home' || event.key === 'End') {
            const items = visibleItems()
            if (items.length === 0) return
            event.preventDefault()
            const target = event.key === 'Home' ? items[0] : items[items.length - 1]
            setActive(target?.dataset.value ?? null)
          }
        }}
        {...props}
      >
        <div ref={listRef} className="mz-command__inner">
          {children}
        </div>
      </div>
    </CommandContext.Provider>
  )
}

function CommandInput({
  className,
  ...props
}: Omit<React.ComponentProps<'input'>, 'value' | 'onChange'>) {
  const command = useCommand('CommandInput')
  return (
    <div className="mz-command__search">
      <SearchIcon className="mz-command__search-icon" />
      <input
        id={command.inputId}
        data-slot="command-input"
        // The box holds the focus and the list holds the highlight, which is
        // what `aria-activedescendant` is for: the arrows never move the caret
        // out of the field.
        role="combobox"
        aria-expanded
        aria-controls={command.listId}
        aria-activedescendant={
          command.active ? `${command.listId}-${cssId(command.active)}` : undefined
        }
        autoComplete="off"
        className={cn('mz-command__input', className)}
        value={command.query}
        onChange={(event) => command.setQuery(event.target.value)}
        {...props}
      />
    </div>
  )
}

function CommandList({ className, ...props }: React.ComponentProps<'div'>) {
  const command = useCommand('CommandList')
  return (
    <div
      id={command.listId}
      role="listbox"
      data-slot="command-list"
      className={cn('mz-command__list', className)}
      {...props}
    />
  )
}

/** Shown only while nothing matches — the list's own answer, not a state flag. */
function CommandEmpty({ className, children, ...props }: React.ComponentProps<'div'>) {
  const command = useCommand('CommandEmpty')
  if (!command.empty) return null
  return (
    <div data-slot="command-empty" className={cn('mz-command__empty', className)} {...props}>
      {children}
    </div>
  )
}

function CommandGroup({
  heading,
  className,
  children,
  ...props
}: React.ComponentProps<'div'> & { heading?: React.ReactNode }) {
  const command = useCommand('CommandGroup')
  const ref = React.useRef<HTMLDivElement>(null)
  const [hasItems, setHasItems] = React.useState(true)

  // A heading over nothing is worse than no heading: the group asks its own
  // subtree, after the children have decided whether they are drawn.
  React.useEffect(() => {
    setHasItems(Boolean(ref.current?.querySelector('[data-command-item]:not([hidden])')))
  }, [command.query, command.version])

  return (
    <div
      ref={ref}
      data-slot="command-group"
      role="group"
      hidden={!hasItems || undefined}
      className={cn('mz-command__group', className)}
      {...props}
    >
      {heading ? <div className="mz-menu-label">{heading}</div> : null}
      {children}
    </div>
  )
}

function CommandItem({
  value,
  keywords,
  onSelect,
  disabled,
  className,
  children,
  onClick,
  ...props
}: Omit<React.ComponentProps<'div'>, 'onSelect'> & {
  /** What the item is filtered and reported by. */
  value: string
  /** Extra words it should also be findable under. */
  keywords?: string[]
  onSelect?: (value: string) => void
  disabled?: boolean
}) {
  const command = useCommand('CommandItem')
  const { bump, listId } = command
  const visible = command.matches(value, keywords)
  const active = command.active === value

  // Mounting and unmounting change what the arrows can reach, and the root
  // cannot see that from its own render.
  React.useEffect(() => {
    bump()
    return bump
  }, [bump, value])

  return (
    <div
      id={`${listId}-${cssId(value)}`}
      data-slot="command-item"
      data-command-item=""
      data-value={value}
      data-highlighted={active ? '' : undefined}
      data-disabled={disabled ? '' : undefined}
      role="option"
      aria-selected={active}
      aria-disabled={disabled || undefined}
      hidden={!visible || undefined}
      className={cn('mz-item mz-item--plain mz-command__item', className)}
      onPointerMove={() => !disabled && !active && command.setActive(value)}
      onClick={(event) => {
        if (disabled) return
        onClick?.(event)
        onSelect?.(value)
      }}
      {...props}
    >
      {children}
    </div>
  )
}

function CommandSeparator({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div data-slot="command-separator" className={cn('mz-menu-separator', className)} {...props} />
  )
}

function CommandShortcut({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span data-slot="command-shortcut" className={cn('mz-menu-shortcut', className)} {...props} />
  )
}

/** An id that survives being put in a DOM id and read back out of one. */
const cssId = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, (c) => `_${c.charCodeAt(0)}_`)

export type CommandDialogProps = React.ComponentProps<typeof Dialog> & {
  /** Accessible name for the palette; hidden unless `showTitle`. */
  title?: string
  description?: string
  showTitle?: boolean
  /**
   * The key that opens it, with Ctrl or ⌘ — `'k'` is the one every
   * application has agreed on. `null` leaves the shortcut to the host.
   */
  shortcut?: string | null
  className?: string
  filter?: CommandFilter
  children: React.ReactNode
}

function CommandDialog({
  title = 'Command palette',
  description = 'Search for a command to run',
  showTitle = false,
  shortcut = 'k',
  open: controlled,
  onOpenChange,
  className,
  filter,
  children,
  ...props
}: CommandDialogProps) {
  const [internal, setInternal] = React.useState(false)
  const open = controlled ?? internal
  const setOpen = (next: boolean) => {
    if (controlled === undefined) setInternal(next)
    onOpenChange?.(next)
  }

  // Kept in a ref so the listener below is subscribed once rather than on
  // every render of a host that re-renders on every keystroke of its own.
  const setOpenRef = React.useRef(setOpen)
  setOpenRef.current = setOpen
  const isOpen = React.useRef(open)
  isOpen.current = open

  React.useEffect(() => {
    if (!shortcut) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== shortcut.toLowerCase()) return
      if (!event.metaKey && !event.ctrlKey) return
      // The browser has its own ⌘K in some builds, and the page's palette is
      // what the reader meant by it.
      event.preventDefault()
      setOpenRef.current(!isOpen.current)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [shortcut])

  return (
    <Dialog open={open} onOpenChange={setOpen} {...props}>
      <DialogContent size="lg" className={cn('mz-command-dialog', className)}>
        <DialogTitle className={showTitle ? undefined : 'mz-sr-only'}>{title}</DialogTitle>
        <DialogDescription className="mz-sr-only">{description}</DialogDescription>
        <Command filter={filter}>{children}</Command>
      </DialogContent>
    </Dialog>
  )
}

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
}
