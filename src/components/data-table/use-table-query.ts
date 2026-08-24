'use client'

import * as React from 'react'

import type { DataTableFilters, DataTableQuery, SavedView } from './types'
import { emptyQuery } from './types'
import { parseSort, serializeSort } from './utils'

/* --------------------------------------------------------------------------
   Query state, optionally mirrored into the URL so a filtered table survives
   a reload and can be shared as a link.
   -------------------------------------------------------------------------- */

function encode(query: DataTableQuery, prefix: string) {
  const params = new URLSearchParams(window.location.search)
  const set = (key: string, value: string | undefined) => {
    if (value) params.set(prefix + key, value)
    else params.delete(prefix + key)
  }
  set('sort', serializeSort(query.sort) || undefined)
  set('page', query.page > 1 ? String(query.page) : undefined)
  set('size', String(query.pageSize))
  set('f', Object.keys(query.filters).length ? JSON.stringify(query.filters) : undefined)
  return params
}

function decode(prefix: string, fallback: DataTableQuery): DataTableQuery {
  const params = new URLSearchParams(window.location.search)
  const get = (key: string) => params.get(prefix + key)
  let filters: DataTableFilters = fallback.filters
  const rawFilters = get('f')
  if (rawFilters) {
    try {
      filters = JSON.parse(rawFilters) as DataTableFilters
    } catch {
      filters = {}
    }
  }
  return {
    sort: get('sort') ? parseSort(get('sort')) : fallback.sort,
    filters,
    page: Number(get('page') ?? fallback.page) || 1,
    pageSize: Number(get('size') ?? fallback.pageSize) || fallback.pageSize,
  }
}

export type UseTableQueryOptions = {
  initial?: Partial<DataTableQuery>
  /** Mirrors the query into the query-string under this prefix. */
  urlKey?: string | null
  /** `replace` keeps table interactions out of the back-button history. */
  history?: 'replace' | 'push'
}

export function useTableQuery({
  initial,
  urlKey = null,
  history = 'replace',
}: UseTableQueryOptions = {}) {
  const base = React.useMemo<DataTableQuery>(() => ({ ...emptyQuery, ...initial }), [initial])
  // The URL is read after mount, so server and first client render agree.
  const [query, setQuery] = React.useState<DataTableQuery>(base)

  React.useEffect(() => {
    if (urlKey === null || typeof window === 'undefined') return
    setQuery(decode(urlKey, base))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlKey])

  React.useEffect(() => {
    if (urlKey === null || typeof window === 'undefined') return
    const params = encode(query, urlKey)
    const search = params.toString()
    const next = `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`
    if (next === `${window.location.pathname}${window.location.search}${window.location.hash}`) return
    window.history[history === 'push' ? 'pushState' : 'replaceState'](null, '', next)
  }, [query, urlKey, history])

  // Back/forward must move the table, not just the address bar.
  React.useEffect(() => {
    if (urlKey === null || typeof window === 'undefined') return
    const onPop = () => setQuery(decode(urlKey, base))
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [urlKey, base])

  const reset = React.useCallback(() => setQuery(base), [base])

  return { query, setQuery, reset }
}

/* --------------------------------------------------------------------------
   Saved views — a named query (and optionally a column layout) the user can
   come back to. Stored locally unless the host passes its own list.
   -------------------------------------------------------------------------- */

export type UseSavedViewsOptions = {
  storageKey?: string | null
  views?: SavedView[]
  onViewsChange?: (views: SavedView[]) => void
}

export function useSavedViews({
  storageKey = null,
  views: controlled,
  onViewsChange,
}: UseSavedViewsOptions = {}) {
  const [internal, setInternal] = React.useState<SavedView[]>([])

  React.useEffect(() => {
    if (!storageKey || typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem(storageKey)
      if (raw) setInternal(JSON.parse(raw) as SavedView[])
    } catch {
      /* blocked storage — views just do not persist */
    }
  }, [storageKey])

  const views = controlled ?? internal

  const persist = React.useCallback(
    (next: SavedView[]) => {
      setInternal(next)
      onViewsChange?.(next)
      if (!storageKey || typeof window === 'undefined') return
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next))
      } catch {
        /* ignore */
      }
    },
    [storageKey, onViewsChange]
  )

  return {
    views,
    save: (view: SavedView) => persist([...views.filter((v) => v.id !== view.id), view]),
    remove: (id: string) => persist(views.filter((v) => v.id !== id)),
  }
}
