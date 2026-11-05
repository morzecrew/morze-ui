import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'

import { InlineEdit } from '../src'
import '../src/styles/index.css'

/**
 * A property row (#45): label at the start, value at the end, the pencil in a
 * column of its own — which a read-only row keeps, so the values of a list of
 * rows line up. Geometry, so a real engine.
 */
describe('InlineEdit row', () => {
  it('puts label, value and pencil on one line, and lines values up with a read-only row', () => {
    const { container } = render(
      <div style={{ width: 360 }}>
        <InlineEdit layout="row" label="Unit" view="pcs" editor={null} onSave={() => {}} />
        <InlineEdit layout="row" label="Origin" view="import" editor={null} onSave={() => {}} readOnly />
      </div>
    )
    const [editable, readOnly] = [...container.querySelectorAll<HTMLElement>('[data-slot="inline-edit"]')]
    const part = (root: HTMLElement, name: string) =>
      root.querySelector<HTMLElement>(name)!.getBoundingClientRect()
    const label = part(editable!, '.mz-inline-edit__label')
    const value = part(editable!, '.mz-inline-edit__view')
    const pencil = part(editable!, '.mz-inline-edit__pencil')
    // One line: every part overlaps the others vertically.
    for (const box of [value, pencil]) {
      expect(box.top).toBeLessThan(label.bottom)
      expect(box.bottom).toBeGreaterThan(label.top)
    }
    expect(label.right).toBeLessThanOrEqual(value.left)
    expect(value.right).toBeLessThanOrEqual(pencil.left)
    // The read-only row has no pencil, and its value still ends where the
    // editable row's does.
    expect(readOnly!.querySelector('.mz-inline-edit__pencil')).toBeNull()
    expect(Math.round(part(readOnly!, '.mz-inline-edit__view').right)).toBe(Math.round(value.right))
  })
})
