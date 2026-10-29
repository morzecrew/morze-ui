import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { userEvent } from 'vitest/browser'

import { NumberInput } from '../src'
import '../src/styles/index.css'

/**
 * Regrouping rewrites the field's text on every keystroke, and a rewritten
 * value puts the caret at the end. The field puts it back after the same
 * digits (#40) — which only a real editing engine, driven by real key
 * presses, can show.
 */
describe('NumberInput caret', () => {
  it('stays beside the digits the reader is typing in the middle', async () => {
    render(<NumberInput locale="ru-RU" defaultValue={123000000} aria-label="Amount" />)
    const field = screen.getByRole('spinbutton', { name: 'Amount' }) as HTMLInputElement
    await userEvent.click(field)
    // After «123»: the first digit fills the leading group and every space
    // moves, so the second only lands beside it if the caret was put back.
    field.setSelectionRange(3, 3)
    await userEvent.keyboard('45')
    expect(field.value.replace(/[  ]/g, ' ')).toBe('12 345 000 000')
  })
})
