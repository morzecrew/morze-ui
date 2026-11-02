import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { cdp, userEvent } from 'vitest/browser'

import { Dialog, DialogContent, DialogTitle, Switch } from '../src'
import '../src/styles/index.css'

const settle = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * The reduced-motion rule used to set `transform: none !important` on every
 * hovered mz- element — and a dialog is centred, a switch's knob placed, by
 * `transform`. Under a resting pointer the dialog jumped by half its size and
 * a checked knob went back to off (#43).
 */
describe('reduced motion leaves what transform places alone', () => {
  beforeAll(async () => {
    await cdp().send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
    })
  })
  afterAll(async () => {
    await cdp().send('Emulation.setEmulatedMedia', { features: [] })
  })

  it.each(['center', 'top'] as const)('keeps a %s dialog where it is under the pointer', async (position) => {
    render(
      <Dialog defaultOpen>
        <DialogContent position={position} size="lg">
          <DialogTitle>Search</DialogTitle>
        </DialogContent>
      </Dialog>
    )
    const dialog = await screen.findByRole('dialog')
    await settle()
    const before = dialog.getBoundingClientRect()
    await userEvent.hover(dialog)
    await settle()
    const after = dialog.getBoundingClientRect()
    expect(matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true)
    expect(Math.round(after.left)).toBe(Math.round(before.left))
    expect(Math.round(after.top)).toBe(Math.round(before.top))
  })

  it('keeps a checked switch knob on', async () => {
    render(<Switch defaultChecked aria-label="Notify" />)
    const knob = screen.getByRole('switch').querySelector<HTMLElement>('[data-slot="switch-thumb"], .mz-switch__thumb')!
    await settle()
    const before = knob.getBoundingClientRect().left
    // On the knob itself: that is the element the old rule took the
    // translate from, and it slid off under the pointer to the off end.
    await userEvent.hover(knob)
    await settle()
    expect(Math.round(knob.getBoundingClientRect().left)).toBe(Math.round(before))
  })
})
