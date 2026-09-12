import { afterEach, describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'

import { useTableQuery } from '../src'

/**
 * The hook mirrors the query into the address bar. What it must never do is
 * write there before the reader has changed anything, or clobber the state
 * object a router keeps in history while it does.
 */
afterEach(() => {
  window.history.replaceState(null, '', '/')
})

describe('useTableQuery and the address bar', () => {
  it('leaves the URL alone until something changes', () => {
    renderHook(() =>
      useTableQuery({ initial: { pageSize: 25, sort: [{ id: 'date', dir: 'desc' }] }, urlKey: 't.' })
    )
    // It used to write `size=25` on mount, so every table with a urlKey
    // rewrote the address bar before the reader had touched it.
    expect(window.location.search).toBe('')
  })

  it('writes only what differs from the initial query', () => {
    const { result } = renderHook(() => useTableQuery({ initial: { pageSize: 25 }, urlKey: 't.' }))
    act(() => result.current.setQuery({ ...result.current.query, page: 3 }))
    expect(window.location.search).toBe('?t.page=3')
    act(() => result.current.setQuery({ ...result.current.query, page: 1, pageSize: 50 }))
    expect(window.location.search).toBe('?t.size=50')
  })

  it('keeps the router state object across its own history writes', () => {
    // Next.js keeps its tree in history.state and React Router its index;
    // replacing it with null broke their back button.
    window.history.replaceState({ usr: { from: 'orders' }, idx: 4 }, '', '/')
    const { result } = renderHook(() => useTableQuery({ urlKey: 't.' }))
    act(() => result.current.setQuery({ ...result.current.query, page: 2 }))
    expect(window.location.search).toBe('?t.page=2')
    expect(window.history.state).toEqual({ usr: { from: 'orders' }, idx: 4 })
  })

  it('reads the URL it is mounted on without stripping it first', () => {
    window.history.replaceState(null, '', '/?t.page=2&t.sort=-date')
    const { result } = renderHook(() => useTableQuery({ urlKey: 't.' }))
    expect(result.current.query.page).toBe(2)
    expect(result.current.query.sort).toEqual([{ id: 'date', dir: 'desc' }])
    expect(window.location.search).toBe('?t.page=2&t.sort=-date')
  })

  it('survives a reload after the default sort was cleared', () => {
    // An absent key stands for the default, so a cleared sort has to be
    // written as an empty value rather than dropped.
    const initial = { sort: [{ id: 'date', dir: 'desc' as const }] }
    const first = renderHook(() => useTableQuery({ initial, urlKey: 't.' }))
    act(() => first.result.current.setQuery({ ...first.result.current.query, sort: [] }))
    expect(window.location.search).toBe('?t.sort=')
    first.unmount()
    const second = renderHook(() => useTableQuery({ initial, urlKey: 't.' }))
    expect(second.result.current.query.sort).toEqual([])
  })

  it('clamps a corrupt page and size from the URL', () => {
    window.history.replaceState(null, '', '/?t.page=-4&t.size=0')
    const { result } = renderHook(() => useTableQuery({ initial: { pageSize: 25 }, urlKey: 't.' }))
    expect(result.current.query.page).toBe(1)
    expect(result.current.query.pageSize).toBe(25)
  })

  it('does not rebuild the base query for an inline initial object', () => {
    const { result, rerender } = renderHook(() => useTableQuery({ initial: { pageSize: 50 } }))
    const reset = result.current.reset
    rerender()
    expect(result.current.reset).toBe(reset)
  })
})
