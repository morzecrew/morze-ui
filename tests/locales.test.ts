import { describe, expect, it } from 'vitest'

import { defaultDataTableLabels, type DataTableLabels } from '../src'
import en from '../src/locales/en'
import ru from '../src/locales/ru'

/**
 * The point of shipping locale bundles is that a host stops copy-pasting a
 * label block that silently drifts as the kit adds strings. These checks are
 * that promise: a new label has to be translated, not just declared.
 */
const render = (value: unknown) =>
  typeof value === 'function' ? String((value as (...args: string[]) => string)('X', 'Y')) : String(value)

describe('locale bundles', () => {
  it('covers every string the table owns', () => {
    expect(Object.keys(ru.dataTable).sort()).toEqual(Object.keys(defaultDataTableLabels).sort())
    expect(Object.keys(ru.common).sort()).toEqual(Object.keys(en.common).sort())
  })

  it('leaves nothing in English', () => {
    for (const key of Object.keys(defaultDataTableLabels) as (keyof DataTableLabels)[]) {
      expect(render(ru.dataTable[key]), key).not.toBe(render(defaultDataTableLabels[key]))
    }
  })

  it('keeps the English bundle equal to the defaults', () => {
    expect(en.dataTable).toBe(defaultDataTableLabels)
  })
})
