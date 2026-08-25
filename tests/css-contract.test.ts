import { execFileSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'

/**
 * The visual layer is plain CSS, so its regressions are cascade regressions:
 * a rule that lands later in the bundle and quietly outranks an earlier one.
 * These checks assert the contracts that were actually broken at some point.
 */
const DIST = resolve(__dirname, '../dist/morze-ui.css')
let css = ''

beforeAll(() => {
  if (!existsSync(DIST)) {
    execFileSync('node', ['scripts/build-css.mjs'], { cwd: resolve(__dirname, '..') })
  }
  css = readFileSync(DIST, 'utf8')
})

/** Index of a selector in the bundle, or -1. Later index wins on equal specificity. */
const at = (selector: string) => css.indexOf(selector)

describe('tone cascade', () => {
  it('applies [data-tone] after every component default', () => {
    const toneRule = at('[data-tone=accent]')
    expect(toneRule).toBeGreaterThan(-1)
    // tones.css is imported last on purpose.
    expect(toneRule).toBeGreaterThan(at('.mz-btn--primary'))
    expect(toneRule).toBeGreaterThan(at('.mz-badge--solid'))
  })

  it('keeps component tone defaults at zero specificity', () => {
    expect(css).toMatch(/:where\([^)]*\.mz-btn[^)]*\)\{--mz-tone-rgb/)
  })
})

describe('hover states', () => {
  it('restates the hover face for grouped toggles', () => {
    // .mz-toggle:hover alone loses to the group rules on source order.
    expect(css).toContain('.mz-toggle-group--segmented .mz-toggle:hover')
    expect(css).toContain('.mz-toggle-group--joined .mz-toggle:hover')
  })

  it('never fills the underline tab variant on hover', () => {
    expect(css).toContain(':not(.mz-tabs-list--line) .mz-tabs-trigger[data-state=active]:hover')
    // Every hover fill for an active tab must carry the :not() guard.
    const fills = css.match(/[^{}]*\.mz-tabs-trigger\[data-state=active\]:hover\{[^}]*background-color[^}]*\}/g) ?? []
    expect(fills.length).toBeGreaterThan(0)
    for (const rule of fills) expect(rule).toContain(':not(.mz-tabs-list--line)')
  })

  it('only highlights an unselected item inside a group', () => {
    // A face plus a border would make it read as its own secondary button.
    const rule = css.match(/\.mz-toggle-group--segmented \.mz-toggle:hover\{[^}]*\}/)?.[0] ?? ''
    expect(rule).toContain('background:rgba(var(--mz-text-rgb)')
    expect(rule).not.toContain('border-color')
    expect(rule).not.toContain('--mz-face-hover')
  })

  it('keeps the selected label white while hovered', () => {
    // The group hover rules outrank [data-state=on], so the colour is restated
    // at matching specificity — in the light theme it went black otherwise.
    const rules = css.match(/[^{}]*\.mz-toggle\[data-state=on\]:hover[^{]*\{[^}]*\}/g) ?? []
    const colourRule = rules.find((rule) => rule.includes('color:#fff'))
    expect(colourRule).toBeDefined()
    expect(colourRule).toContain('.mz-toggle-group--segmented .mz-toggle[data-state=on]:hover')
    expect(colourRule).toContain('.mz-toggle-group--joined .mz-toggle[data-state=on]:hover')
  })

  it('darkens only filled surfaces', () => {
    expect(css).toContain('--mz-fill-hover')
    // Neutral variants lighten through the face token instead.
    expect(css).toMatch(/\.mz-btn--secondary:hover\{[^}]*--mz-face-fill-hover/)
  })

  it('animates the neutral face instead of snapping to a new gradient', () => {
    // A gradient cannot be interpolated, so the face is split the way the tone
    // fill is: flat colour under a fixed sheen.
    expect(css).toMatch(/\.mz-btn--secondary\{[^}]*background-color:var\(--mz-face-fill\)/)
    expect(css).toMatch(/\.mz-btn--secondary\{[^}]*background-image:var\(--mz-face-sheen\)/)
    expect(css).not.toMatch(/\.mz-btn--secondary:hover\{[^}]*background-image/)
  })

  it('drops the tone glow from the neutral and outline buttons', () => {
    const secondary = css.match(/\.mz-btn--secondary:hover\{[^}]*\}/)?.[0] ?? ''
    const outline = css.match(/\.mz-btn--outline:hover\{[^}]*\}/)?.[0] ?? ''
    expect(secondary).not.toContain('box-shadow')
    // The neutral button keeps its neutral rim: only the face lifts.
    expect(secondary).not.toContain('border-color')
    expect(outline).not.toContain('box-shadow')
    // The outline picks up the tone in its own border, at full strength.
    expect(outline).toContain('border-color:rgb(var(--mz-tone-rgb))')
  })
})

describe('table rows', () => {
  it('paints hover and selection as one opaque colour for every cell', () => {
    // Pinned cells must stay opaque; a translucent wash elsewhere would render
    // a different shade and read as the pinned column highlighting on its own.
    const hover = css.match(/\.mz-dt__row:hover>\.mz-dt__td\{[^}]*\}/)?.[0] ?? ''
    expect(hover).toContain('color-mix(in srgb, var(--mz-surface)')
    // No pinned-specific override may reintroduce a second colour.
    expect(css).not.toMatch(/\.mz-dt__row:hover>\.mz-dt__td\[data-pinned\]/)
    expect(css).not.toMatch(/\.mz-dt__row\[data-selected\]>\.mz-dt__td\[data-pinned\]/)
  })

  it('does not animate the row background', () => {
    // A sticky cell and a normal one repaint on different schedules, so a fade
    // arrives at different times across the row.
    const base = css.match(/\.mz-dt__td\{height:[^}]*\}/)?.[0] ?? ''
    expect(base).not.toContain('transition')
    expect(css).not.toMatch(/\.mz-dt__row\{[^}]*transition[^}]*background/)
  })
})

describe('scoping', () => {
  it('has no descendant selector that reaches consumer markup', () => {
    expect(css).not.toMatch(/\[class\^=mz-\] \*/)
    expect(css).not.toMatch(/\[class\*=" mz-"\] \*/)
  })

  it('does not impose root typography on the host', () => {
    const root = css.slice(at('.mz-root{'), at('.mz-root{') + 200)
    expect(root).not.toContain('font-size')
    expect(root).not.toContain('line-height')
  })
})

describe('geometry', () => {
  it('is rectangular by default, with pills reserved for round things', () => {
    expect(css).toContain('--mz-radius-control:var(--mz-radius)')
    expect(css).toMatch(/--mz-radius:8px/)
    // The radio and the indicator dots stay round.
    expect(css).toMatch(/\.mz-radio\{[^}]*border-radius:var\(--mz-radius-pill\)/)
  })

  it('moves the switch thumb symmetrically', () => {
    // rail - thumb = (w - 6) - (h - 8) = w - h + 2
    expect(css).toContain('var(--mz-switch-w) - var(--mz-switch-h) + 2px')
    expect(css).not.toContain('var(--mz-switch-w) - var(--mz-switch-h) - 2px')
  })
})

describe('motion', () => {
  it('scales in place and never translates on hover', () => {
    expect(css).toContain('--mz-hover-scale')
    expect(css).not.toContain('--mz-lift')
    expect(css).not.toMatch(/:hover\{[^}]*transform:translateY/)
  })

  it('carries no shimmer sweep', () => {
    expect(css).not.toContain('skewX(-20deg)')
  })

  it('carries no pulsing dot', () => {
    // Dropped from the kit: nothing in a UI blinks on its own.
    expect(css).not.toContain('mz-pulse')
    expect(css).not.toContain('__dot')
  })

  it('respects prefers-reduced-motion', () => {
    expect(css).toContain('prefers-reduced-motion')
  })
})

describe('accessibility contracts', () => {
  it('hides a busy label without removing it from the a11y tree', () => {
    // Minifiers drop the universal selector, so match on the shape that ships.
    expect(css).toMatch(/data-loading=true\]\s*>\s*\*?:not\(\.mz-btn__spinner\)\{opacity:0/)
    expect(css).not.toMatch(/data-loading=true\]\s*>\s*\*?:not\(\.mz-btn__spinner\)\{[^}]*visibility/)
  })

  it('draws focus with an outline so it cannot fight the convex shadows', () => {
    expect(css).toMatch(/\.mz-focusable:focus-visible\{outline:/)
  })
})

describe('typography contracts', () => {
  it('inherits the application font instead of dictating a stack', () => {
    // A hardcoded stack here is what made a button label read in a different
    // face from the page around it.
    expect(css).toMatch(/\[class\^=mz-\][^{]*\{[^}]*font-family:inherit/)
    expect(css).toMatch(/--mz-label-font:\s*inherit/)
  })

  it('owns its rhythm instead of inheriting the page one', () => {
    // A landing-style body (morze.tech runs line-height 1.7) otherwise
    // inflates a dialog description and a field hint inside a dense UI.
    expect(css).toMatch(/--mz-line:\s*1\.45/)
    expect(css).toContain(':where([class^=mz-],[class*=\\ mz-]){line-height:var(--mz-line)}')
  })

  it('zeroes the UA margins on the text it renders itself', () => {
    // Without a host reset a dialog title carried h2's 14.94px margin and drifted
    // away from its description; a consumer's own <p> in a Card keeps its own.
    expect(css).toMatch(
      /:where\(\[class\^=mz-\],\[class\*=\\ mz-\]\):is\(h1,h2,h3,h4,h5,h6,p,[^)]*\)\{margin:0\}/
    )
  })

  it('keeps the label flat on a convex face', () => {
    // The landing dropped the embossed label; the token stays as the hook.
    expect(css).toMatch(/--mz-convex-text-shadow:\s*none/)
    expect(css).not.toMatch(/--mz-convex-text-shadow:\s*0 /)
  })

  it('keeps the button compact while the label still has air', () => {
    expect(css).toContain('.mz-btn--md{height:40px;padding:0 20px')
    // The height scale stays shared with the fields, or controls stop lining up.
    expect(css).toContain('.mz-input--sm{height:34px')
  })
})

