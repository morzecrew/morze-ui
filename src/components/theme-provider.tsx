'use client'

import * as React from 'react'

export type MorzeTheme = 'dark' | 'light' | 'system'

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
  /** localStorage key; pass `null` to disable persistence. */
  storageKey?: string | null
  /**
   * Where `data-mz-theme` is written. `html` themes the whole document (and is
   * what you want when portalled dialogs and menus should follow the theme);
   * `element` scopes the theme to the wrapper this provider renders.
   */
  target?: 'html' | 'element'
  className?: string
}

function MorzeThemeProvider({
  children,
  defaultTheme = 'dark',
  storageKey = 'morze-ui-theme',
  target = 'html',
  className,
}: MorzeThemeProviderProps) {
  // Both the server and the first client render start from defaultTheme; the
  // stored/system preference is applied after mount. Reading storage during
  // render would make the markup disagree with the server and break hydration.
  const [theme, setThemeState] = React.useState<MorzeTheme>(defaultTheme)
  const [resolved, setResolved] = React.useState<'dark' | 'light'>(
    defaultTheme === 'system' ? 'dark' : defaultTheme
  )

  React.useEffect(() => {
    const stored = readStored(storageKey)
    if (stored) setThemeState(stored)
  }, [storageKey])

  React.useEffect(() => {
    if (theme !== 'system') {
      setResolved(theme)
      return
    }
    setResolved(systemTheme())
    const mql = window.matchMedia('(prefers-color-scheme: light)')
    const onChange = () => setResolved(systemTheme())
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [theme])

  React.useEffect(() => {
    if (target !== 'html' || typeof document === 'undefined') return
    document.documentElement.setAttribute('data-mz-theme', resolved)
  }, [resolved, target])

  const setTheme = React.useCallback(
    (next: MorzeTheme) => {
      setThemeState(next)
      writeStored(storageKey, next)
    },
    [storageKey]
  )

  const value = React.useMemo(
    () => ({ theme, resolvedTheme: resolved, setTheme }),
    [theme, resolved, setTheme]
  )

  return (
    <ThemeContext.Provider value={value}>
      <div
        data-slot="morze-root"
        data-mz-theme={target === 'element' ? resolved : undefined}
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
