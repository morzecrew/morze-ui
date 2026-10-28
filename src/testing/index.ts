/**
 * jsdom stand-ins for the browser APIs the kit — and the libraries around it —
 * reach for. jsdom implements none of these, so a test that mounts a screen
 * built on the kit threw ("ResizeObserver is not defined") before its first
 * assertion, and every host carried its own copy of the same stubs (#10).
 *
 *   // vitest.config.ts
 *   test: { environment: 'jsdom', setupFiles: ['@morze/ui/testing/setup'] }
 *
 * or, to keep the teardown:
 *
 *   import { setupJsdom } from '@morze/ui/testing'
 *   const restore = setupJsdom()
 *
 * Every stub is installed only where the environment has nothing of its own,
 * so the same setup is harmless under happy-dom or in a real browser. None of
 * them measure anything: an observer never fires, a media query never
 * matches (the layout is the desktop one), a scroll goes nowhere.
 *
 * Plain functions, no test runner and no React: it works under vitest, jest
 * or anything else that gives it a `window`.
 */

class NoopResizeObserver {
  constructor(_callback: unknown) {}
  observe() {}
  unobserve() {}
  disconnect() {}
}

class NoopIntersectionObserver {
  readonly root: Element | Document | null
  readonly rootMargin: string
  readonly thresholds: ReadonlyArray<number>
  constructor(_callback: unknown, options: { root?: Element | Document | null; rootMargin?: string; threshold?: number | number[] } = {}) {
    this.root = options.root ?? null
    this.rootMargin = options.rootMargin ?? '0px'
    this.thresholds = [options.threshold ?? 0].flat()
  }
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
}

function noopMatchMedia(query: string) {
  return {
    matches: false,
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    // The deprecated pair, for libraries that never moved off it.
    addListener() {},
    removeListener() {},
    dispatchEvent() {
      return false
    },
  }
}

/**
 * Installs whatever of the stubs the environment is missing and returns a
 * function that takes them away again. Safe to call more than once.
 */
export function setupJsdom(): () => void {
  if (typeof window === 'undefined') return () => {}
  const undo: (() => void)[] = []

  const define = (target: object, key: string, value: unknown) => {
    if (key in target && (target as Record<string, unknown>)[key] !== undefined) return
    const had = Object.getOwnPropertyDescriptor(target, key)
    Object.defineProperty(target, key, { configurable: true, writable: true, value })
    undo.push(() => {
      if (had) Object.defineProperty(target, key, had)
      else delete (target as Record<string, unknown>)[key]
    })
  }

  // Tabs' overflow, DataTable's fit and edge shadows, Radix's own sizing of a
  // popper or a slider, and the charting library under `ChartContainer`.
  define(globalThis, 'ResizeObserver', NoopResizeObserver)
  define(window, 'ResizeObserver', NoopResizeObserver)
  // DataTable's load-more sentinel.
  define(globalThis, 'IntersectionObserver', NoopIntersectionObserver)
  define(window, 'IntersectionObserver', NoopIntersectionObserver)
  // `useIsMobile` (the sidebar), the `system` theme.
  define(window, 'matchMedia', noopMatchMedia)

  const element = window.Element?.prototype
  if (element) {
    // The highlighted row in Combobox and Command, Radix Select's open list.
    define(element, 'scrollIntoView', function scrollIntoView() {})
    // Radix Select and Slider capture the pointer on press.
    define(element, 'hasPointerCapture', function hasPointerCapture() {
      return false
    })
    define(element, 'setPointerCapture', function setPointerCapture() {})
    define(element, 'releasePointerCapture', function releasePointerCapture() {})
  }

  return () => {
    for (const step of undo.reverse()) step()
  }
}
