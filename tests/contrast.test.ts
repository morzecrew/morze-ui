import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Text contrast, computed from the tokens themselves (#14, #15, #16).
 *
 * The pairs below used to be checked by eye, once, when a value changed — and
 * the light muted grey shipped at 4.33:1, white sat on a 3.04:1 primary, and
 * the emerald was used as text at 2.82:1. Here every token is resolved the
 * way the browser resolves it (var() through the theme block, color-mix() in
 * sRGB), and every text / ground pair the kit actually draws is held to WCAG
 * AA: 4.5:1.
 */
const source = readFileSync(resolve(__dirname, '../src/styles/tokens.css'), 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  ''
)

/** The declarations of the first rule whose selector list contains `selector`. */
function block(selector: string): Record<string, string> {
  const rule = [...source.matchAll(/([^{}]+)\{([^{}]*)\}/g)].find((m) =>
    m[1]!.split(',').some((s) => s.trim() === selector)
  )
  if (!rule) throw new Error(`no rule for ${selector}`)
  const out: Record<string, string> = {}
  for (const declaration of rule[2]!.split(';')) {
    const at = declaration.indexOf(':')
    if (at < 0) continue
    out[declaration.slice(0, at).trim()] = declaration.slice(at + 1).trim().replace(/\s+/g, ' ')
  }
  return out
}

type RGBA = [number, number, number, number]

/** Split on the commas at the top level of a function's arguments. */
function args(inner: string): string[] {
  const parts: string[] = []
  let depth = 0
  let start = 0
  for (let i = 0; i < inner.length; i++) {
    if (inner[i] === '(') depth++
    else if (inner[i] === ')') depth--
    else if (inner[i] === ',' && depth === 0) {
      parts.push(inner.slice(start, i).trim())
      start = i + 1
    }
  }
  parts.push(inner.slice(start).trim())
  return parts
}

function resolver(tokens: Record<string, string>) {
  const color = (value: string): RGBA => {
    value = value.trim()
    if (value === 'transparent') return [0, 0, 0, 0]
    const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value)?.[1]
    if (hex) {
      const full = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex
      return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)).concat(1) as RGBA
    }
    const variable = /^var\((--[\w-]+)(?:,.*)?\)$/.exec(value)?.[1]
    if (variable) {
      const next = tokens[variable]
      if (next === undefined) throw new Error(`undeclared ${variable}`)
      return color(next)
    }
    const rgb = /^rgb\((.*)\)$/.exec(value)?.[1]
    if (rgb) {
      const expanded = rgb.replace(/var\((--[\w-]+)\)/g, (_, name: string) => tokens[name] ?? '')
      const [r, g, b] = expanded.split(/[\s,]+/).filter(Boolean).map(Number)
      return [r!, g!, b!, 1]
    }
    const mix = /^color-mix\(in srgb,(.*)\)$/.exec(value)?.[1]
    if (mix) {
      const [a, b] = args(mix).map((part) => {
        // The share is a literal or a token holding one (--mz-tint-strength).
        const pct = /\s(\d+(?:\.\d+)?%|var\(--[\w-]+\))$/.exec(part)
        const share = pct ? pct[1]!.replace(/var\((--[\w-]+)\)/, (_, n: string) => tokens[n] ?? '') : ''
        return { c: color(pct ? part.slice(0, pct.index) : part), p: pct ? parseFloat(share) / 100 : undefined }
      })
      const pa = a!.p ?? (b!.p === undefined ? 0.5 : 1 - b!.p)
      // Premultiplied, as CSS mixes: a colour mixed with `transparent` keeps
      // its hue and only loses alpha.
      const alpha = a!.c[3] * pa + b!.c[3] * (1 - pa)
      const ch = (i: number) =>
        alpha === 0 ? 0 : (a!.c[i]! * a!.c[3] * pa + b!.c[i]! * b!.c[3] * (1 - pa)) / alpha
      return [ch(0), ch(1), ch(2), alpha]
    }
    throw new Error(`cannot resolve ${value}`)
  }
  return (name: string) => color(`var(${name})`)
}

/** `top` laid over `under`, the way a wash or a translucent cut is painted. */
const over = (top: RGBA, under: RGBA): RGBA => [
  ...[0, 1, 2].map((i) => top[i]! * top[3] + under[i]! * (1 - top[3])),
  1,
] as RGBA
const wash = (tone: RGBA, share: number, under: RGBA) => over([tone[0], tone[1], tone[2], share], under)

function luminance([r, g, b]: RGBA) {
  const ch = (v: number) => {
    const s = Math.round(v) / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b)
}
const ratio = (a: RGBA, b: RGBA) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi! + 0.05) / (lo! + 0.05)
}

const dark = block(':root:where(.dark)')
// <html data-mz-theme="light"> matches both blocks; the light one wins.
const themes = { dark, light: { ...dark, ...block(':root:where(.light)') } }
const TONES = ['primary', 'accent', 'success', 'danger', 'warning', 'info']
const GROUNDS = ['--mz-bg', '--mz-bg-2', '--mz-surface', '--mz-surface-2', '--mz-elevated']
const AA = 4.5

describe.each(Object.entries(themes))('contrast — %s theme', (_name, tokens) => {
  const get = resolver(tokens)

  it.each(['--mz-text', '--mz-text-dim', '--mz-text-muted'])('%s reads on every ground', (text) => {
    for (const ground of GROUNDS) {
      expect(ratio(get(text), get(ground)), `${text} on ${ground}`).toBeGreaterThanOrEqual(AA)
    }
  })

  it.each(TONES)('the %s fill carries its label', (tone) => {
    expect(ratio(get(`--mz-${tone}-fg`), get(`--mz-${tone}`))).toBeGreaterThanOrEqual(AA)
  })

  // A heatmap's text sits on the step it labels (#37).
  it.each([1, 2, 3, 4, 5, 6, 7])('sequential step %i carries its ink', (step) => {
    expect(ratio(get(`--mz-seq-ink-${step}`), get(`--mz-seq-${step}`))).toBeGreaterThanOrEqual(AA)
  })

  it('climbs the sequential ramp in one direction', () => {
    // Away from the card, step by step: a ramp that turned back on itself
    // would put "more" and "less" on one colour.
    const card = luminance(get('--mz-surface'))
    const steps = [1, 2, 3, 4, 5, 6, 7].map((step) => Math.abs(luminance(get(`--mz-seq-${step}`)) - card))
    for (let i = 1; i < steps.length; i++) expect(steps[i]!).toBeGreaterThan(steps[i - 1]!)
  })

  it.each(TONES)('%s text reads on the page and on its own wash', (tone) => {
    const text = get(`--mz-${tone}-text`)
    for (const ground of ['--mz-bg', '--mz-surface', '--mz-elevated']) {
      expect(ratio(text, get(ground)), `on ${ground}`).toBeGreaterThanOrEqual(AA)
      // 22% is the deepest wash text sits on — a table filter chip; a soft
      // badge is 14%.
      for (const share of [0.14, 0.22]) {
        const soft = wash(get(`--mz-${tone}`), share, get(ground))
        expect(ratio(text, soft), `on ${share * 100}% over ${ground}`).toBeGreaterThanOrEqual(AA)
      }
    }
  })
})
