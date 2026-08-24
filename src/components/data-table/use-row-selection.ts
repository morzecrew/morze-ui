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

  const toggle = (key: string, event?: { shiftKey?: boolean }) => {
    // Shift extends from the last clicked row, matching file-manager behaviour.
    if (event?.shiftKey && anchor.current) {
      const from = pageKeys.indexOf(anchor.current)
      const to = pageKeys.indexOf(key)
      if (from >= 0 && to >= 0) {
        const range = pageKeys.slice(Math.min(from, to), Math.max(from, to) + 1)
        const next = new Set(selected)
        const turningOn = !selected.has(key)
        range.forEach((id) => (turningOn ? next.add(id) : next.delete(id)))
        setKeys([...next])
        return
      }
    }
    anchor.current = key
    const next = new Set(selected)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    setKeys([...next])
  }

  const pageSelected = pageKeys.length > 0 && pageKeys.every((key) => selected.has(key))
  const pagePartial = !pageSelected && pageKeys.some((key) => selected.has(key))

  const togglePage = () => {
    const next = new Set(selected)
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
