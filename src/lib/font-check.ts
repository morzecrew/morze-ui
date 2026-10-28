/**
 * A development-only warning for a face that never arrived (#24).
 *
 * `--mz-font-sans` starts with "Golos Text", and nothing loads it unless the
 * host does — `@morze/ui/fonts.css`, or its own webfont. Missing, it falls
 * back without a word to whatever the OS has, and the host learns about it
 * from a screenshot taken on somebody else's machine. This says so once, in
 * the console, while there is still a developer looking.
 */

declare const process: { env: { NODE_ENV?: string } }

/** Bundlers replace `process.env.NODE_ENV`; anywhere they did not, stay quiet. */
function isDevelopment() {
  try {
    return process.env.NODE_ENV !== 'production'
  } catch {
    return false
  }
}

const GENERIC = new Set([
  'serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui', 'ui-sans-serif',
  'ui-serif', 'ui-monospace', 'ui-rounded', 'math', 'emoji', 'fangsong', '-apple-system',
  'inherit', 'initial',
])

let warned = false

/**
 * Whether `family` is drawn at all: text set in it, with each generic family
 * behind it in turn, measures exactly as the generic alone when the face is
 * missing. `null` where there is nothing to measure with.
 */
export function isFontAvailable(family: string, doc: Document = document): boolean | null {
  const context = doc.createElement('canvas').getContext?.('2d')
  if (!context) return null
  const sample = 'mmmmmmmmmmlli1WWW@0123456789йцукен'
  const width = (font: string) => {
    context.font = font
    return context.measureText(sample).width
  }
  return ['monospace', 'serif', 'sans-serif'].some(
    (generic) => width(`72px "${family}", ${generic}`) !== width(`72px ${generic}`)
  )
}

/** The first family `element` asks for, unless it is a generic keyword. */
export function firstFamily(element: Element): string | null {
  const first = getComputedStyle(element).fontFamily.split(',')[0]?.trim().replace(/^["']|["']$/g, '')
  return first && !GENERIC.has(first.toLowerCase()) ? first : null
}

export function warnIfFontMissing(element: Element) {
  if (warned || !isDevelopment() || typeof document === 'undefined') return
  const family = firstFamily(element)
  if (!family) return
  // Measured once the fonts the page asked for have settled, or a face that
  // is merely still downloading would be reported as missing.
  const ready: Promise<unknown> = document.fonts?.ready ?? Promise.resolve()
  void ready.then(() => {
    if (warned || isFontAvailable(family) !== false) return
    warned = true
    console.warn(
      `[@morze/ui] "${family}", the first face in this page's font stack, is not available, ` +
        'so the browser fell back to whatever the system has — and its digits decide whether ' +
        "tables line up. Import '@morze/ui/fonts.css' once to ship Golos Text with the app, " +
        'load the face yourself, or point --mz-font-sans at one you do load.'
    )
  })
}

/** For tests: forget that the warning has been given. */
export function resetFontWarning() {
  warned = false
}
