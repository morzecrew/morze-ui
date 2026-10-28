'use client'

import * as React from 'react'

import { warnIfFontMissing } from '../lib/font-check'

export type MorzeTheme = 'dark' | 'light' | 'system'
export type MorzeDensity = 'default' | 'comfortable' | 'compact'

type ThemeContextValue = {
  /** What was requested — may be `system`. */
  theme: MorzeTheme
  /** What is actually painted — never `system`. */
  resolvedTheme: 'dark' | 'light'
  setTheme: (theme: MorzeTheme) => void
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null)

/** Storage can throw outright when site data is blocked, so every access is guarded. */
function readStored(key: string | null): MorzeTheme | null {
  if (!key || typeof window === 'undefined') return null
  try {
    const stored = window.localStorage.getItem(key)
    return stored === 'dark' || stored === 'light' || stored === 'system' ? stored : null
  } catch {
    return null
  }
}

function writeStored(key: string | null, theme: MorzeTheme) {
  if (!key || typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, theme)
  } catch {
    /* private mode, blocked site data — the theme just does not persist */
  }
}

function systemTheme(): 'dark' | 'light' {
  if (typeof window === 'undefined' || !window.matchMedia) return 'dark'
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

type MorzeThemeProviderProps = {
  children: React.ReactNode
  /** Initial theme. Defaults to the Morze dark palette. */
  defaultTheme?: MorzeTheme
  /**
   * The theme, owned by the application — `next-themes`' `resolvedTheme`, a
   * store of its own. Given one, the provider keeps no state and touches no
   * storage: it paints what it is told, and `setTheme` only reports through
   * `onThemeChange`.
   */
  theme?: MorzeTheme
  /** Called by `setTheme`, controlled or not. */
  onThemeChange?: (theme: MorzeTheme) => void
  /**
   * localStorage key; pass `null` to disable persistence. Never read or
   * written while `theme` is controlled.
   */
  storageKey?: string | null
  /**
   * Where the theme is written. `html` themes the whole document (and is
   * what you want when portalled dialogs and menus should follow the theme);
   * `element` scopes the theme to the wrapper this provider renders.
   */
  target?: 'html' | 'element'
  /**
   * What is written on `<html>`: `data-mz-theme="dark|light"` (default), or a
   * `dark` / `light` class — the convention of `next-themes` and Tailwind's
   * class strategy, which the kit's palettes match on `<html>` as well. An
   * `element` target always uses the data attribute.
   */
  attribute?: 'data-mz-theme' | 'class'
  /**
   * How much room controls and surfaces take, everywhere under the target:
   * `compact` (32px controls, 12px card padding), `comfortable` (36px, 16px),
   * or `default` — the kit's own 40px scale. Written as `data-mz-density`.
   */
  density?: MorzeDensity
  className?: string
}

function MorzeThemeProvider({
  children,
  defaultTheme = 'dark',
  theme: controlled,
  onThemeChange,
  storageKey = 'morze-ui-theme',
  target = 'html',
  attribute = 'data-mz-theme',
  density = 'default',
  className,
}: MorzeThemeProviderProps) {
  // Both the server and the first client render start from defaultTheme; the
  // stored/system preference is applied after mount. Reading storage during
  // render would make the markup disagree with the server and break hydration.
  const [internal, setInternal] = React.useState<MorzeTheme>(defaultTheme)
  const theme = controlled ?? internal
  const [systemResolved, setSystemResolved] = React.useState<'dark' | 'light'>('dark')
  const resolved = theme === 'system' ? systemResolved : theme

  const isControlled = controlled !== undefined
  React.useEffect(() => {
    if (isControlled) return
    const stored = readStored(storageKey)
    if (stored) setInternal(stored)
  }, [storageKey, isControlled])

  React.useEffect(() => {
    if (theme !== 'system') return
    setSystemResolved(systemTheme())
    if (typeof window.matchMedia !== 'function') return
    const mql = window.matchMedia('(prefers-color-scheme: light)')
    const onChange = () => setSystemResolved(systemTheme())
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [theme])

  React.useEffect(() => {
    if (target !== 'html' || typeof document === 'undefined') return
    const root = document.documentElement
    if (attribute === 'class') {
      root.classList.remove(resolved === 'dark' ? 'light' : 'dark')
      root.classList.add(resolved)
    } else {
      root.setAttribute('data-mz-theme', resolved)
    }
  }, [resolved, target, attribute])

  React.useEffect(() => {
    if (target !== 'html' || typeof document === 'undefined' || density === 'default') return
    const root = document.documentElement
    root.setAttribute('data-mz-density', density)
    return () => root.removeAttribute('data-mz-density')
  }, [density, target])

  // Development only, once per page: the default face is declared but only
  // the host can load it, and a missing one fails without a sound.
  const rootRef = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    if (rootRef.current) warnIfFontMissing(rootRef.current)
  }, [])

  const onThemeChangeRef = React.useRef(onThemeChange)
  onThemeChangeRef.current = onThemeChange
  const setTheme = React.useCallback(
    (next: MorzeTheme) => {
      onThemeChangeRef.current?.(next)
      // Controlled: the application owns the theme and its storage, and the
      // new value arrives back through `theme` — or does not, if it says no.
      if (isControlled) return
      setInternal(next)
      writeStored(storageKey, next)
    },
    [storageKey, isControlled]
  )

  const value = React.useMemo(
    () => ({ theme, resolvedTheme: resolved, setTheme }),
    [theme, resolved, setTheme]
  )

  return (
    <ThemeContext.Provider value={value}>
      <div
        ref={rootRef}
        data-slot="morze-root"
        data-mz-theme={target === 'element' ? resolved : undefined}
        data-mz-density={target === 'element' && density !== 'default' ? density : undefined}
        className={['mz-root', className].filter(Boolean).join(' ')}
      >
        {children}
      </div>
    </ThemeContext.Provider>
  )
}

function useMorzeTheme() {
  const context = React.useContext(ThemeContext)
  if (!context) {
    throw new Error('useMorzeTheme must be used inside <MorzeThemeProvider>')
  }
  return context
}

export { MorzeThemeProvider, useMorzeTheme }
export type { MorzeThemeProviderProps }
