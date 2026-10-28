import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

import { MorzeThemeProvider, themeScript, useMorzeTheme } from '../src'

/**
 * With `system` the provider used to resolve to 'dark' first and write that
 * to <html> on mount — over whatever a pre-paint script had set, one frame
 * after paint. A light-system user saw a dark flash (#26).
 */
const root = document.documentElement

/** Undone after every spec, failed or not, so one failure cannot cascade. */
const cleanups: (() => void)[] = []

function systemIs(scheme: 'light' | 'dark') {
  const original = window.matchMedia
  window.matchMedia = ((query: string) => ({
    matches: query.includes(scheme),
    media: query,
    addEventListener() {},
    removeEventListener() {},
  })) as unknown as typeof window.matchMedia
  cleanups.push(() => {
    window.matchMedia = original
  })
}

/** Every value the provider writes to <html>, in order. */
function recordWrites() {
  const writes: string[] = []
  const original = root.setAttribute.bind(root)
  const spy = vi.spyOn(root, 'setAttribute').mockImplementation((name, value) => {
    if (name === 'data-mz-theme') writes.push(value)
    original(name, value)
  })
  cleanups.push(() => spy.mockRestore())
  return writes
}

afterEach(() => {
  while (cleanups.length) cleanups.pop()!()
  root.removeAttribute('data-mz-theme')
  root.classList.remove('dark', 'light')
  window.localStorage.removeItem('morze-ui-theme')
})

function Probe() {
  const { resolvedTheme } = useMorzeTheme()
  return <span data-testid="resolved">{resolvedTheme}</span>
}

describe('MorzeThemeProvider before paint', () => {
  it('never writes dark for a light system', () => {
    systemIs('light')
    const writes = recordWrites()
    render(
      <MorzeThemeProvider defaultTheme="system">
        <Probe />
      </MorzeThemeProvider>
    )
    expect(writes).not.toContain('dark')
    expect(root).toHaveAttribute('data-mz-theme', 'light')
    expect(screen.getByTestId('resolved')).toHaveTextContent('light')
  })

  it('never writes the default over a stored choice', () => {
    window.localStorage.setItem('morze-ui-theme', 'light')
    const writes = recordWrites()
    render(
      <MorzeThemeProvider defaultTheme="dark">
        <Probe />
      </MorzeThemeProvider>
    )
    // It may write twice — the mount pass and the synced state — but only ever
    // the stored value.
    expect(writes.length).toBeGreaterThan(0)
    expect(new Set(writes)).toEqual(new Set(['light']))
  })

  it('keeps what <html> already says when there is no system to ask', () => {
    const original = window.matchMedia
    cleanups.push(() => {
      window.matchMedia = original
    })
    // @ts-expect-error — the API is missing, as in jsdom
    delete window.matchMedia
    root.setAttribute('data-mz-theme', 'light')
    render(
      <MorzeThemeProvider defaultTheme="system">
        <Probe />
      </MorzeThemeProvider>
    )
    expect(root).toHaveAttribute('data-mz-theme', 'light')
  })
})

describe('themeScript', () => {
  const run = (script: string) => new Function(script)()

  it('agrees with the provider from the first frame', () => {
    systemIs('light')
    run(themeScript({ defaultTheme: 'system' }))
    expect(root).toHaveAttribute('data-mz-theme', 'light')

    window.localStorage.setItem('morze-ui-theme', 'dark')
    run(themeScript({ defaultTheme: 'system' }))
    expect(root).toHaveAttribute('data-mz-theme', 'dark')
  })

  it('falls back to the default for a value it does not know', () => {
    window.localStorage.setItem('custom', 'purple')
    run(themeScript({ storageKey: 'custom', defaultTheme: 'light' }))
    expect(root).toHaveAttribute('data-mz-theme', 'light')
    window.localStorage.removeItem('custom')
  })

  it('writes the class when the provider does', () => {
    root.classList.add('dark')
    run(themeScript({ defaultTheme: 'light', attribute: 'class', storageKey: null }))
    expect(root).toHaveClass('light')
    expect(root).not.toHaveClass('dark')
  })

  it('cannot be closed from inside by a storage key', () => {
    expect(themeScript({ storageKey: '</script><script>alert(1)' })).not.toContain('</script>')
  })
})
