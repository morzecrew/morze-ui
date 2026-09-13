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

  it('covers the fields that carry strings of their own', () => {
    expect(Object.keys(ru.combobox).sort()).toEqual(Object.keys(en.combobox).sort())
    expect(Object.keys(ru.datePicker).sort()).toEqual(Object.keys(en.datePicker).sort())
  })

  it('leaves nothing in English', () => {
    for (const key of Object.keys(defaultDataTableLabels) as (keyof DataTableLabels)[]) {
      expect(render(ru.dataTable[key]), key).not.toBe(render(defaultDataTableLabels[key]))
    }
    // `andMore` is "+3" in every language, so it is the one exemption rather
    // than a string someone forgot.
    for (const key of Object.keys(en.combobox) as (keyof typeof en.combobox)[]) {
      if (key === 'andMore') continue
      expect(render(ru.combobox[key]), key).not.toBe(render(en.combobox[key]))
    }
    for (const key of Object.keys(en.datePicker) as (keyof typeof en.datePicker)[]) {
      expect(render(ru.datePicker[key]), key).not.toBe(render(en.datePicker[key]))
    }
  })

  it('keeps the English bundle equal to the defaults', () => {
    expect(en.dataTable).toBe(defaultDataTableLabels)
  })
})
