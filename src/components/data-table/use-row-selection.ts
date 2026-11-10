'use client'

import * as React from 'react'

import type { RowSelectionState } from './types'

/**
 * Selection is controlled from the outside so bulk actions can live anywhere,
 * but the shift-range anchor is local UI state.
 */
export function useRowSelection(options: {
  value: RowSelectionState
  onChange: (next: RowSelectionState) => void
  pageKeys: string[]
}) {
  const { value, onChange, pageKeys } = options
  const anchor = React.useRef<string | null>(null)
  const selected = React.useMemo(() => new Set(value.keys), [value.keys])

  const setKeys = (keys: string[], allMatching = false) => onChange({ keys, allMatching })

  // "Everything the filter matches" draws every row ticked, but `keys` only
  // holds the rows that were on screen when it was chosen. A change from that
  // state starts from what the reader sees — this page, all ticked — or
  // unticking one row on page 2 left that row as the only one ticked.
  const base = () => (value.allMatching ? new Set(pageKeys) : new Set(selected))
  const isOn = (key: string) => value.allMatching || selected.has(key)

  const toggle = (key: string, event?: { shiftKey?: boolean }) => {
    // Shift extends from the last clicked row, matching file-manager behaviour.
    if (event?.shiftKey && anchor.current) {
      const from = pageKeys.indexOf(anchor.current)
      const to = pageKeys.indexOf(key)
      if (from >= 0 && to >= 0) {
        const range = pageKeys.slice(Math.min(from, to), Math.max(from, to) + 1)
        const next = base()
        const turningOn = !isOn(key)
        range.forEach((id) => (turningOn ? next.add(id) : next.delete(id)))
        setKeys([...next])
        return
      }
    }
    anchor.current = key
    const next = base()
    if (next.has(key)) next.delete(key)
    else next.add(key)
    setKeys([...next])
  }

  const pageSelected = pageKeys.length > 0 && pageKeys.every(isOn)
  const pagePartial = !pageSelected && pageKeys.some(isOn)

  const togglePage = () => {
    const next = base()
    if (pageSelected) pageKeys.forEach((key) => next.delete(key))
    else pageKeys.forEach((key) => next.add(key))
    setKeys([...next])
  }

  return {
    selected,
    count: value.allMatching ? undefined : value.keys.length,
    allMatching: value.allMatching,
    pageSelected,
    pagePartial,
    toggle,
    togglePage,
    /** Escalates from "this page" to "everything the filter matches". */
    selectAllMatching: () => onChange({ keys: value.keys, allMatching: true }),
    clear: () => {
      anchor.current = null
      onChange({ keys: [], allMatching: false })
    },
  }
}
