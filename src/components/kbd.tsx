'use client'

import * as React from 'react'

import { cn } from '../lib/utils'

/* --------------------------------------------------------------------------
   A key, drawn as one (K-11). Menus, tooltips and empty states name shortcuts
   constantly and every host drew its own little box for them.

   `mod` is the one piece of logic in here: the same shortcut is ⌘K on a Mac
   and Ctrl+K everywhere else, and every application that prints it gets that
   wrong at least once. The platform is read on the client only — a server
   render has no platform to read, and guessing one there is how a Mac user
   ends up being shown "Ctrl" until the page hydrates.
   -------------------------------------------------------------------------- */

const APPLE = /Mac|iPhone|iPad|iPod/

/** Names one key, or the platform's own name for `mod`. */
function Kbd({
  className,
  children,
  ...props
}: React.ComponentProps<'kbd'>) {
  return (
    <kbd data-slot="kbd" className={cn('mz-kbd', className)} {...props}>
      {children}
    </kbd>
  )
}

/**
 * A shortcut as a row of keys: `<KbdSequence keys={['mod', 'k']} />`.
 * `mod` renders ⌘ on Apple hardware and Ctrl elsewhere, and `alt`, `shift`,
 * `enter`, `esc`, `up`… get their symbols too.
 */
function KbdSequence({
  keys,
  className,
  ...props
}: React.ComponentProps<'span'> & { keys: string[] }) {
  // Starts as the non-Apple spelling on both sides of the hydration boundary
  // and corrects itself once mounted, so the markup the server sent and the
  // markup React expects are the same string.
  const [apple, setApple] = React.useState(false)
  React.useEffect(() => {
    setApple(APPLE.test(navigator.platform || navigator.userAgent))
  }, [])

  return (
    <span data-slot="kbd-sequence" className={cn('mz-kbd-row', className)} {...props}>
      {keys.map((key, index) => (
        <Kbd key={`${key}-${index}`}>{symbolFor(key, apple)}</Kbd>
      ))}
    </span>
  )
}

const SYMBOLS: Record<string, string> = {
  shift: '⇧',
  alt: '⌥',
  option: '⌥',
  enter: '↵',
  return: '↵',
  tab: '⇥',
  esc: 'Esc',
  escape: 'Esc',
  backspace: '⌫',
  delete: '⌦',
  up: '↑',
  down: '↓',
  left: '←',
  right: '→',
  space: '␣',
}

function symbolFor(key: string, apple: boolean) {
  const lower = key.toLowerCase()
  if (lower === 'mod' || lower === 'cmd' || lower === 'ctrl') {
    return apple ? (lower === 'ctrl' ? '⌃' : '⌘') : lower === 'cmd' ? '⌘' : 'Ctrl'
  }
  if (lower === 'alt' || lower === 'option') return apple ? '⌥' : 'Alt'
  if (lower === 'shift') return apple ? '⇧' : 'Shift'
  return SYMBOLS[lower] ?? (key.length === 1 ? key.toUpperCase() : key)
}

export { Kbd, KbdSequence }
