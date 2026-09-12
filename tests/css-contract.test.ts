import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
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
  // Always rebuilt, never reused: the bundle on disk is whatever the last
  // build left there, and `npm test` runs before `npm run build` in
  // prepublishOnly. Asserting on a stale bundle passes a CSS change that was
  // never compiled — a green run that means nothing. It costs ~50ms.
  execFileSync('node', ['scripts/build-css.mjs'], { cwd: resolve(__dirname, '..'), stdio: 'ignore' })
  css = readFileSync(DIST, 'utf8')
})

/** Index of a selector in the bundle, or -1. Later index wins on equal specificity. */
const at = (selector: string) => css.indexOf(selector)

/**
 * The token blocks, one per theme: the declarations sitting alongside
 * --mz-tint. Reading tokens per block instead of counting them across the
 * bundle is what keeps these checks honest now that components re-point a
 * token for themselves — a bundle-wide count cannot tell a theme's
 * declaration from a one-component override.
 */
const themeBlocks = () => [...css.matchAll(/([^{}]*--mz-tint:[^{}]*)\}/g)].map((m) => m[1]!)

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

  it('keeps the selected label on the tone foreground while hovered', () => {
    // The group hover rules outrank [data-state=on], so the colour is restated
    // at matching specificity — in the light theme it went black otherwise.
    const rules = css.match(/[^{}]*\.mz-toggle\[data-state=on\]:hover[^{]*\{[^}]*\}/g) ?? []
    const colourRule = rules.find((rule) => rule.includes('color:var(--mz-tone-fg)'))
    expect(colourRule).toBeDefined()
    expect(colourRule).toContain('.mz-toggle-group--segmented .mz-toggle[data-state=on]:hover')
    expect(colourRule).toContain('.mz-toggle-group--joined .mz-toggle[data-state=on]:hover')
  })

  it('darkens only filled surfaces', () => {
    expect(css).toContain('--mz-fill-hover')
    // Neutral variants lighten through the face token instead.
    expect(css).toMatch(/\.mz-btn--secondary:hover\{[^}]*--mz-face-hover/)
  })

  it('animates the neutral face instead of snapping to a new one', () => {
    // The face used to be split in two (--mz-face-fill under --mz-face-sheen)
    // purely so hover had a plain colour to interpolate: browsers cannot
    // tween a gradient, and swapping one sweep for another jumped. The fill is
    // flat now, so the split has collapsed back into one token — and the sheen
    // above it, the `none` hook, must stay put through the hover.
    expect(css).toMatch(/\.mz-btn--secondary\{[^}]*background-color:var\(--mz-face\)/)
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

describe('tone defaults reach every toned component', () => {
  /**
   * A component that reads --mz-tone-rgb without a default gets an invalid
   * var() substitution, and the browser drops the whole declaration — the
   * border simply vanishes rather than falling back to something. Each of
   * these has to appear in the :where() list in base.css.
   */
  // Read inside the test, not in the describe body: the bundle is loaded in
  // beforeAll, and a describe body runs before that.
  const tonedRoot = () => css.match(/:where\(([^)]*)\)\{--mz-tone-rgb/)?.[1] ?? ''

  it.each([
    ['.mz-toast', '.mz-toast'],
    ['.mz-calendar', '.mz-calendar'],
    ['.mz-table', '.mz-table'],
    ['.mz-menubar', '.mz-menubar'],
    ['.mz-navmenu', '.mz-navmenu'],
    ['.mz-scroll-area', '.mz-scroll-area'],
    ['.mz-chart', '.mz-chart'],
  ])('gives %s a tone to fall back on', (_name, selector) => {
    expect(tonedRoot()).toContain(selector)
  })

  it('still applies an explicit tone after the new defaults', () => {
    // tones.css is imported last so [data-tone] outranks a component default.
    expect(at('[data-tone=accent]')).toBeGreaterThan(at('.mz-toast'))
    expect(at('[data-tone=accent]')).toBeGreaterThan(at('.mz-calendar__day'))
  })
})

describe('backdrop blur survives the build', () => {
  it('keeps the unprefixed property Firefox needs', () => {
    // Given a literal, lightningcss decided the -webkit- form covered every
    // target and dropped the unprefixed one — the only spelling Firefox knows.
    // The value goes through --mz-overlay-filter so it cannot make that call.
    const rule = css.match(/\.mz-dialog-overlay\{[^}]*\}/)?.[0] ?? ''
    // Anchored on a boundary: a bare toContain would match the unprefixed
    // spelling inside the -webkit- one and pass with the bug still there.
    expect(rule).toMatch(/[;{]backdrop-filter:var\(--mz-overlay-filter\)/)
    expect(rule).toMatch(/[;{]-webkit-backdrop-filter:var\(--mz-overlay-filter\)/)
  })

  it('keeps both spellings on the glass panel too', () => {
    const rule = css.match(/\.mz-panel\{[^}]*\}/)?.[0] ?? ''
    expect(rule).toMatch(/[;{]backdrop-filter:var\(--mz-glass-filter\)/)
    expect(rule).toMatch(/[;{]-webkit-backdrop-filter:var\(--mz-glass-filter\)/)
  })
})

describe('calendar', () => {
  it('rings today instead of filling it', () => {
    // A fill would be indistinguishable from the selection on the day the two
    // coincide, which is the most common day to be looking at.
    const today = css.match(/\.mz-calendar__day\[data-today\]\{[^}]*\}/)?.[0] ?? ''
    expect(today).toContain('border-color')
    expect(today).not.toContain('background')
  })

  it('keeps the tentative range visually apart from a chosen one', () => {
    const preview = css.match(/\.mz-calendar__day\[data-preview\]\{[^}]*\}/)?.[0] ?? ''
    expect(preview).toContain('background:rgba(var(--mz-tone-rgb)')
    // No convex fill and no glow: those belong to a committed selection.
    expect(preview).toContain('box-shadow:none')
  })
})

describe('toast', () => {
  it('reveals the close button for keyboards, not only for pointers', () => {
    // A control that exists only on hover is a control a keyboard never finds.
    expect(css).toContain('.mz-toast__close:focus-visible')
    expect(css).toMatch(/\.mz-toast__close:focus-visible\{opacity:1|,\s*\.mz-toast__close:focus-visible\{opacity:1/)
  })
})

describe('table', () => {
  it('makes the component scroll rather than the page', () => {
    expect(css).toMatch(/\.mz-table-wrap\{[^}]*overflow-x:auto/)
  })

  it('keeps borders separate so the header rule survives a sticky header', () => {
    expect(css).toMatch(/\.mz-table\{[^}]*border-collapse:separate/)
  })
})

describe('scoping', () => {
  it('confines the chart library selectors to the chart container', () => {
    // The kit reaches into foreign SVG in exactly one place, and it may never
    // do so from the document root.
    for (const match of css.matchAll(/([^{}]*\.recharts-[^{}]*)\{/g)) {
      expect(match[1]).toContain('.mz-chart')
    }
  })

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

  it('never scales a frosted panel open', () => {
    // A scale on a backdrop-filtered surface makes the engine re-blur its
    // backdrop every frame at a fractional factor, and a centre-scale walked
    // a 240px popover's left edge nearly 5px on the way in. The glass rises
    // and fades; only opaque marks keep the pop.
    expect(css).toMatch(/@keyframes mz-panel-in\{[^@]*?\}/)
    const glassIn = css.match(/@keyframes mz-panel-in\{.*?to\{[^}]*\}\}/)?.[0] ?? ''
    expect(glassIn).not.toContain('scale')
    for (const panel of ['.mz-popover-content', '.mz-menu-content', '.mz-select-content']) {
      expect(css).toContain(`${panel}[data-state=open]{animation:mz-panel-in`)
    }
  })

  it('anchors what still scales to the corner Radix measured', () => {
    // The tooltip is the one popper surface that keeps the pop, so it is the
    // one that needs the origin — without it the bubble grows from its own
    // centre and drifts away from the trigger.
    expect(css).toMatch(
      /\.mz-tooltip-content\{[^}]*transform-origin:var\(--radix-popper-transform-origin/
    )
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

describe('the night ramp', () => {
  // History, because this contract has flipped once in each direction: the
  // kit launched on the landing's violet-tinted darks, was neutralised to
  // graphite when the fixed violet leaked into every host, and the graphite
  // then read as one flat grey sheet — a card was indistinguishable from the
  // page. The current contract keeps the good half of each: the literals
  // carry the landing's *cold* cast (blue a step above red/green, never a
  // nameable colour), and every drop of actual brand hue still comes from
  // one place — --mz-tint, following --mz-primary-rgb — so a re-branded host
  // gets its own night, not Morze's violet.

  /** Every hex the token is declared as, expanded to r/g/b. */
  const channelsOf = (token: string) =>
    [...css.matchAll(new RegExp(`\\${token}:([^;}]+)`, 'g'))]
      .flatMap((m) => [...m[1]!.matchAll(/#([0-9a-f]{3}|[0-9a-f]{6})\b/g)])
      .map((m) => {
        const hex = m[1]!
        const full = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex
        return [full.slice(0, 2), full.slice(2, 4), full.slice(4, 6)]
      })

  it('keeps the text base grey so its hue comes from the tint alone', () => {
    // Text is tinted by mixing the brand into a grey literal at use — the
    // literal itself stays neutral, so contrast is calibrated in one axis.
    for (const token of ['--mz-text', '--mz-text-dim', '--mz-text-muted']) {
      const values = channelsOf(token)
      expect(values.length, token).toBeGreaterThan(0)
      for (const [r, g, b] of values) expect([token, r, g, b].join(' ')).toBe([token, r, r, r].join(' '))
      expect(css, token).toMatch(new RegExp(`\\${token}:color-mix\\([^;}]*var\\(--mz-tint\\)`))
    }
  })

  it('builds the surfaces from a cold base plus the brand tint', () => {
    expect(css).toContain('--mz-tint:rgb(var(--mz-primary-rgb))')
    // --mz-well is deliberately absent: it is a control face, not a step of
    // the ramp, and is cut from the ink in both themes — see the test below.
    for (const token of ['--mz-bg', '--mz-surface', '--mz-elevated', '--mz-cap']) {
      expect(css, token).toMatch(new RegExp(`\\${token}:[^;}]*var\\(--mz-tint\\)`))
      // Cold or neutral only: r and g stay equal and b never falls below
      // them. A base that leans red or green is a second hue source.
      for (const [r, g, b] of channelsOf(token)) {
        expect(r, `${token} r/g`).toBe(g)
        expect(parseInt(b, 16), `${token} blue channel`).toBeGreaterThanOrEqual(parseInt(r, 16))
      }
    }
  })

  it('keeps the tint a tint', () => {
    // Past ~6% the brand mixed into a surface stops reading as temperature
    // and starts reading as a colour of its own.
    const strengths = [...css.matchAll(/--mz-tint-strength:([\d.]+)%/g)]
    expect(strengths.length).toBeGreaterThan(0)
    for (const m of strengths) expect(Number(m[1])).toBeLessThanOrEqual(6)
  })

  it('turns the field face over instead of digging it darker', () => {
    // The well is the convex face mirrored: the same mean level, lit from the
    // far side, with --mz-well-inset moving the shadow to the top edge. An
    // input and a select trigger share a form row, and a field a full step off
    // its neighbour read as switched off in dark and as a grey slab in light.
    // Both were the same defect — a fixed literal instead of a cut of the ink
    // — so every theme's well is an ink cut and a hex here is the regression.
    // Read per theme, not across the bundle: the control layer re-points
    // --mz-well at its untinted twin, and that override is not a theme's
    // declaration of the token — the twin is checked by the night-ramp block.
    const themes = themeBlocks()
    expect(themes.length, 'one token block per theme').toBe(2)
    for (const theme of themes) {
      const well = /--mz-well:([^;}]+)/.exec(theme)?.[1] ?? ''
      expect(well).toContain('var(--mz-ink)')
      expect(well, 'a literal cannot track the surface it lies on').not.toMatch(/#[0-9a-f]{3}/)
    }
    // The inversion itself: shadow on the top edge, highlight on the bottom.
    expect(css).toMatch(/--mz-well-inset:inset 0 1px 2px[^;}]*inset 0 -1px 0/)
  })

  it('cuts every white and grey line from one ink', () => {
    // Alpha'd pure white over a tinted ramp drifts back toward grey; the
    // hairlines, borders and sheens all derive from --mz-ink instead, so the
    // lines sit in the same temperature as the surfaces under them.
    expect(css).toMatch(/--mz-ink:color-mix\([^;}]*var\(--mz-tint\)/)
    for (const token of ['--mz-border', '--mz-border-strong', '--mz-convex-hairline', '--mz-face-top']) {
      expect(css, token).toMatch(new RegExp(`\\${token}:color-mix\\([^;}]*var\\(--mz-ink\\)`))
    }
  })

  it('keeps one untinted face for the controls that must not carry the brand', () => {
    // The counterpart to the rule above. A face cut from the ink is right for
    // anything that has to sit in the temperature of the night around it, and
    // wrong for the hardware: at 5.5% the brand still read, and a secondary
    // button beside a primary one looked like a pale wash of the same hue —
    // as did every checkbox, switch, tab strip, track and field on the page.
    // The plain family is the same cuts with the tint left out, applied to the
    // control layer in base.css.
    //
    // Followed through every var() inside its own theme block, so a plain token
    // quietly aliasing a tinted one fails here — an alias two hops from
    // --mz-ink is exactly how this would come back. It is the chain of token
    // names that gets checked, not the expanded value: expand far enough and
    // --mz-primary-rgb turns into its own digits and the evidence is gone.
    const chainOf = (theme: string, token: string) => {
      const declared = (name: string) => new RegExp(`\\${name}:([^;}]+)`).exec(theme)?.[1]
      const reached = new Set<string>()
      let value = declared(token) ?? ''
      for (let hop = 0; hop < 8 && /var\(--mz-/.test(value); hop++) {
        value = value.replace(/var\((--mz-[a-z0-9-]+)\)/g, (whole, ref) => {
          reached.add(ref)
          return declared(ref) ?? whole
        })
      }
      return { value, reached }
    }
    const themes = themeBlocks()
    expect(themes.length, 'one token block per theme').toBe(2)
    for (const theme of themes) {
      for (const token of [
        '--mz-face-plain',
        '--mz-face-plain-hover',
        '--mz-face-plain-top',
        '--mz-face-plain-bottom',
        '--mz-border-plain',
        '--mz-well-plain',
        '--mz-well-plain-inset',
        '--mz-cap-plain',
        '--mz-cap-plain-edge',
      ]) {
        const { value, reached } = chainOf(theme, token)
        expect(value, `${token} is missing from a theme`).not.toBe('')
        // --mz-tint and the --mz-primary-rgb it follows are the kit's one
        // source of hue, and the one thing a plain cut may not reach.
        expect([...reached], token).not.toContain('--mz-tint')
        expect([...reached], token).not.toContain('--mz-primary-rgb')
      }
    }
  })

  it('carries no fixed violet that would bypass the tint', () => {
    // The one leak the neutralisation was for: hue hardcoded outside
    // --mz-primary-rgb / --mz-tint, which a re-branded host cannot override.
    expect(css).not.toContain('16,12,40')
    expect(css).not.toContain('#17162a')
  })
})

describe('the glass layer', () => {
  // Glassmorphism joined the kit without displacing the convex language:
  // controls stay raised and opaque, and the frost goes only where other
  // content actually passes behind a surface — floating panels, the sheet,
  // the sidebar chrome, a sticky table header.

  it('cuts every glass fill from the live ramp, never a hue of its own', () => {
    // A glass token with its own colour would be a second hue source the
    // night-ramp contract exists to prevent; the fills are transparency cuts
    // of the ramp steps, so a re-branded host frosts its own night.
    expect(css).toMatch(/--mz-glass:color-mix\(in srgb, ?var\(--mz-elevated\)/)
    expect(css).toMatch(/--mz-glass-chrome:color-mix\(in srgb, ?var\(--mz-surface-2\)/)
    // The light theme's well twin carries the one glass literal; it must stay
    // cold (r = g, b ≥ r) and take its hue from the tint alone.
    for (const m of [...css.matchAll(/--mz-glass-well:([^;}]+)/g)]) {
      for (const hex of [...m[1]!.matchAll(/#([0-9a-f]{6})\b/g)]) {
        const [r, g, b] = [hex[1]!.slice(0, 2), hex[1]!.slice(2, 4), hex[1]!.slice(4, 6)]
        expect(r, '--mz-glass-well r/g').toBe(g)
        expect(parseInt(b!, 16), '--mz-glass-well blue').toBeGreaterThanOrEqual(parseInt(r!, 16))
      }
    }
  })

  it('frosts the floating surfaces and the chrome', () => {
    expect(css).toMatch(/\.mz-panel\{[^}]*backdrop-filter:var\(--mz-glass-filter\)/)
    expect(css).toMatch(/\.mz-sheet\{[^}]*backdrop-filter:var\(--mz-glass-filter\)/)
    expect(css).toMatch(/\.mz-sidebar\{[^}]*backdrop-filter:var\(--mz-glass-filter\)/)
  })

  it('blurs a table header only where rows or columns pass behind it', () => {
    expect(css).toMatch(/\.mz-dt__th\{[^}]*background:var\(--mz-glass-well\)/)
    expect(css).toMatch(/\.mz-dt__table\[data-sticky\] \.mz-dt__th[^{]*\{[^}]*backdrop-filter/)
    expect(css).toMatch(/\.mz-dt__th\[data-pinned\][^{]*\{[^}]*backdrop-filter/)
  })

  it('keeps the panel frost off the controls', () => {
    // Glass is for what things float over, not for what you press: a control
    // face borrowing --mz-glass* would dissolve the convex recipe. The one
    // control with any frost — the outline button — keeps its own constant
    // blur(8px), which predates the glass layer; it deliberately does not
    // reference the panel tokens.
    for (const control of ['.mz-btn', '.mz-input', '.mz-card', '.mz-toggle', '.mz-tabs-list']) {
      expect(css, control).not.toMatch(
        new RegExp(`\\${control}[^,{]*\\{[^}]*--mz-glass`)
      )
    }
  })

  it('falls back to the opaque ramp without backdrop support or on request', () => {
    // A see-through fill with nothing frosting behind it is just a leak.
    expect(css).toContain('prefers-reduced-transparency')
    expect(css).toMatch(/@supports not/)
    expect(css).toMatch(/--mz-glass:var\(--mz-elevated\)/)
    expect(css).toMatch(/--mz-glass-filter:none/)
  })

  it('paints the aurora behind the frosted sidebar', () => {
    // The layout's opaque background used to hide the root halo; the glass
    // rail needs light behind it to have anything to frost.
    expect(css).toMatch(/\.mz-sidebar-layout\{[^}]*var\(--mz-halo\)/)
  })
})

describe('flat fills', () => {
  // 2026-09-04: the gloss came off. Every fill in the kit — a toned control, a
  // neutral face, a field well, a frosted panel — is one flat colour now, and
  // the volume that used to be washed across a face is drawn on its edges
  // instead: --mz-convex-top / --mz-convex-bottom on a raised control,
  // --mz-well-inset turned over on a sunken one, --mz-glass-edge on glass.
  // The sheens survive as `none` hooks, the way --mz-convex-text-shadow does,
  // so a host that wants the gloss back re-points one token per family.

  /** The four places a gradient still earns its keep, and why. */
  const ALLOWED = [
    '.mz-root', // the page aurora: ambient light over the whole page, not a fill
    '.mz-sidebar-layout', // the same aurora, repeated so the glass rail has something to frost
    '.mz-skeleton', // the shimmer: the gradient *is* the animation
    '.mz-dt__loading-bar', // the refetch sweep, same reason
  ]

  /** Every value a custom property is declared as, across both themes. */
  const valuesOf = (token: string) =>
    [...css.matchAll(new RegExp(`\\${token}:([^;}]+)`, 'g'))].map((m) => m[1]!)

  it('keeps every sheen token off', () => {
    for (const token of ['--mz-fill-sheen', '--mz-face-sheen', '--mz-glass-sheen']) {
      const values = valuesOf(token)
      expect(values.length, token).toBeGreaterThan(0)
      for (const value of values) expect(value.trim(), token).toBe('none')
    }
  })

  it('cuts the faces and the well as flat colours', () => {
    // Flat is also what makes them animate: a hover that swaps one plain
    // colour for another interpolates, which is why the split pair existed.
    for (const token of ['--mz-face', '--mz-face-hover', '--mz-well']) {
      const values = valuesOf(token)
      expect(values.length, token).toBeGreaterThan(0)
      for (const value of values) expect(value, token).not.toContain('gradient')
    }
  })

  it('keeps the split face tokens as aliases so a host override still lands', () => {
    // --mz-face-fill / --mz-face-fill-hover were public; nothing in the kit
    // reads them any more, but re-pointing them must not silently do nothing.
    for (const value of valuesOf('--mz-face-fill')) expect(value.trim()).toBe('var(--mz-face)')
    for (const value of valuesOf('--mz-face-fill-hover')) {
      expect(value.trim()).toBe('var(--mz-face-hover)')
    }
  })

  it('carries no gradient outside the aurora and the two sweeps', () => {
    // A rule-level scan of the shipped bundle, so a gradient reintroduced
    // anywhere in the kit fails here under its own selector.
    const offenders: string[] = []
    for (const m of css.matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
      if (!m[2]!.includes('gradient')) continue
      const selector = m[1]!.trim()
      if (!ALLOWED.some((allowed) => selector.includes(allowed))) offenders.push(selector)
    }
    expect(offenders).toEqual([])
  })

  it('draws the top edge of every glass surface with the glass hairline', () => {
    // --mz-face-top is the raised-*control* highlight. On a frosted surface it
    // used to double with the sheen into a bright rim, and with the sheen gone
    // it is simply the wrong light — --mz-glass-edge exists for exactly this,
    // and the table header was already the only surface using it.
    for (const surface of ['.mz-panel', '.mz-sheet', '.mz-dt__bulkbar']) {
      const rule = css.match(new RegExp(`\\${surface}\\{[^}]*\\}`))?.[0] ?? ''
      expect(rule, surface).toContain('var(--mz-glass-edge)')
      expect(rule, surface).not.toContain('var(--mz-face-top)')
    }
    expect(css).toMatch(/\.mz-sidebar\[data-variant=floating\]\{[^}]*var\(--mz-glass-edge\)/)
  })

  it('leaves the convex volume on the edges of a filled control', () => {
    // What replaced the 135° sweep: light on the top edge, shade on the
    // bottom, the tone glow underneath. Losing these would flatten the kit
    // outright rather than un-gloss it.
    const primary = css.match(/\.mz-btn--primary\{[^}]*\}/)?.[0] ?? ''
    expect(primary).toContain('inset 0 1px 0 var(--mz-convex-top)')
    expect(primary).toContain('inset 0 -1px 0 var(--mz-convex-bottom)')
    expect(primary).toContain('background-color:var(--mz-fill)')
  })

  it('keeps the sunken read on the well inset alone', () => {
    // The well and the face still hold the same value in each theme; the only
    // thing telling an input from a select trigger is where the light falls.
    // Paired inside the theme block, because --mz-face is declared a third and
    // fourth time further down the bundle — the secondary button and the select
    // trigger re-point it at the untinted twin — and counting the two tokens
    // across the bundle reads those overrides as themes that lost their well.
    const themes = themeBlocks()
    expect(themes.length, 'one token block per theme').toBe(2)
    for (const theme of themes) {
      expect(theme, 'the raised face').toMatch(/--mz-face:/)
      expect(theme, 'its sunken twin').toMatch(/--mz-well:/)
    }
    expect(css).toMatch(/--mz-well-inset:inset 0 1px 2px[^;}]*inset 0 -1px 0/)
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


describe('tone foregrounds', () => {
  it('names a label colour for every tone in both themes', () => {
    for (const theme of themeBlocks()) {
      // The shipped value is white on every tone — one label colour across a
      // toolbar — and the token is the hook a host with a pale tone re-points.
      for (const tone of ['primary', 'accent', 'success', 'danger', 'warning', 'info']) {
        expect(theme, tone).toMatch(new RegExp(`--mz-${tone}-fg:#fff\\b`))
      }
    }
  })

  it('switches the foreground together with the tone', () => {
    for (const tone of ['accent', 'danger', 'warning', 'info', 'success']) {
      expect(css, tone).toMatch(
        new RegExp(`\\[data-tone=${tone}\\]\\{[^}]*--mz-tone-fg:var\\(--mz-${tone}-fg\\)`)
      )
    }
    // The default, and the one variant that re-tones itself.
    expect(css).toMatch(/--mz-tone-fg:var\(--mz-primary-fg\)/)
    expect(css).toMatch(/\.mz-btn--destructive\{[^}]*--mz-tone-fg:var\(--mz-danger-fg\)/)
  })

  it('never paints a label with literal white', () => {
    // Every filled control reads the tone's foreground. A literal here is how
    // the amber button ended up with a label nobody could read.
    expect(css).not.toMatch(/[;{]color:#fff[;}]/)
    for (const selector of [
      '.mz-btn--primary{',
      '.mz-badge--solid{',
      '.mz-toggle[data-state=on]{',
      '.mz-tabs-trigger[data-state=active]{',
      '.mz-tooltip-content{',
      '.mz-sidebar__menu-button[data-active]{',
      '.mz-calendar__day[data-selected]{',
    ]) {
      const start = css.indexOf(selector)
      expect(start, selector).toBeGreaterThan(-1)
      const rule = css.slice(start, css.indexOf('}', start))
      expect(rule, selector).toContain('color:var(--mz-tone-fg)')
    }
  })
})

describe('field focus', () => {
  it('gives the select trigger one focus indicator, the same as the input', () => {
    // The trigger used to carry mz-focusable on top of its own glow, and was
    // the one control in a form row with two rings.
    expect(css).toMatch(/\.mz-select-trigger:focus-visible[^{]*\{[^}]*box-shadow/)
    expect(css).toMatch(/\.mz-select-trigger\{[^}]*outline:none/)
  })
})
