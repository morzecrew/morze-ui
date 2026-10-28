'use client'

import * as React from 'react'

import { warnIfFontMissing } from '../lib/font-check'
import { DEFAULT_THEME_STORAGE_KEY } from '../theme-script'

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

/**
 * What the system asks for. Without `matchMedia` to ask, whatever <html>
 * already says — a pre-paint script, a server-rendered attribute — and only
 * then the dark default (#26).
 */
function systemTheme(): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'dark'
  if (typeof window.matchMedia === 'function') {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  }
  const root = document.documentElement
  const said = root.getAttribute('data-mz-theme')
  if (said === 'light' || said === 'dark') return said
  return root.classList.contains('light') ? 'light' : 'dark'
}

/**
 * Layout effects on the client: the stored and the system theme settle, and
 * <html> is written, before the browser paints the mounted tree — not one
 * frame after it, which is the dark flash. A plain effect on the server,
 * where neither runs.
 */
const useBeforePaint = typeof window === 'undefined' ? React.useEffect : React.useLayoutEffect

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
  storageKey = DEFAULT_THEME_STORAGE_KEY,
  target = 'html',
  attribute = 'data-mz-theme',
  density = 'default',
  className,
}: MorzeThemeProviderProps) {
  // Both the server and the first client render start from defaultTheme; the
  // stored/system preference is applied after mount — before paint, in a
  // layout effect. Reading storage during render would make the markup
  // disagree with the server and break hydration.
  const [internal, setInternal] = React.useState<MorzeTheme>(defaultTheme)
  const theme = controlled ?? internal
  const [systemResolved, setSystemResolved] = React.useState<'dark' | 'light'>('dark')
  const resolved = theme === 'system' ? systemResolved : theme

  const isControlled = controlled !== undefined
  useBeforePaint(() => {
    if (isControlled) return
    const stored = readStored(storageKey)
    if (stored) setInternal(stored)
  }, [storageKey, isControlled])

  useBeforePaint(() => {
    if (theme !== 'system') return
    setSystemResolved(systemTheme())
    if (typeof window.matchMedia !== 'function') return
    const mql = window.matchMedia('(prefers-color-scheme: light)')
    const onChange = () => setSystemResolved(systemTheme())
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [theme])

  // What lands on <html> is worked out from the sources, not from state: on
  // the mount pass the state still holds defaultTheme and a 'dark' guess for
  // `system`, and writing those overwrote what a pre-paint script had just
  // set — the flash this was meant to prevent (#26). Uncontrolled, storage
  // is the source: every setTheme writes it, so it only differs from
  // `internal` on that first pass.
  useBeforePaint(() => {
    if (target !== 'html' || typeof document === 'undefined') return
    const current = isControlled ? theme : (readStored(storageKey) ?? theme)
    const painted = current === 'system' ? systemTheme() : current
    const root = document.documentElement
    if (attribute === 'class') {
      root.classList.remove(painted === 'dark' ? 'light' : 'dark')
      root.classList.add(painted)
    } else {
      root.setAttribute('data-mz-theme', painted)
    }
  }, [resolved, theme, isControlled, storageKey, target, attribute])

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
