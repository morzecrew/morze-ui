import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { Button, Input } from '../src'
import '../src/styles/index.css'

/**
 * A button's padding is worked out from its step, its type size and
 * --mz-line, so one line lands on the step exactly in every density (#20).
 * That arithmetic only exists in a layout engine.
 */
describe('density', () => {
  const heights = (density?: string) => {
    const { unmount } = render(
      <div data-mz-density={density}>
        <Button size="xs">xs</Button>
        <Button size="sm">sm</Button>
        <Button>md</Button>
        <Button size="lg">lg</Button>
        <Input aria-label="field" />
      </div>
    )
    const out = [
      ...['xs', 'sm', 'md', 'lg'].map((name) => screen.getByRole('button', { name }).offsetHeight),
      screen.getByRole('textbox').offsetHeight,
    ]
    unmount()
    return out
  }

  it('keeps the kit’s own scale by default', () => {
    expect(heights()).toEqual([28, 34, 40, 48, 40])
  })

  it('moves every control together', () => {
    expect(heights('comfortable')).toEqual([28, 32, 36, 44, 36])
    expect(heights('compact')).toEqual([24, 28, 32, 40, 32])
  })

  it('still grows a button whose label wraps', () => {
    render(
      <div style={{ width: 80 }}>
        <Button wrap>A label long enough to need three lines</Button>
      </div>
    )
    expect(screen.getByRole('button').offsetHeight).toBeGreaterThan(40)
  })
})
