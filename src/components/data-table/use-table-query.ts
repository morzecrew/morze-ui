'use client'

import * as React from 'react'

import type { DataTableFilters, DataTableQuery, SavedView } from './types'
import { emptyQuery } from './types'
import { parseSort, serializeSort } from './utils'

/* --------------------------------------------------------------------------
   Query state, optionally mirrored into the URL so a filtered table survives
   a reload and can be shared as a link.
   -------------------------------------------------------------------------- */

function encode(query: DataTableQuery, base: DataTableQuery, prefix: string) {
  const params = new URLSearchParams(window.location.search)
  // `null` removes the key. An empty string is a value in its own right: a
  // sort the reader cleared has to survive a reload as "no sort", where the
  // key's absence would put the default back.
  const set = (key: string, value: string | null) => {
    if (value === null) params.delete(prefix + key)
    else params.set(prefix + key, value)
  }
  // Only what differs from the initial query is written. The address bar
  // stays untouched until something actually changes — it used to pick up
  // `size=25` on mount — and a shared link carries the choices, not the
  // defaults, so a later change to the defaults reaches old links too.
  const sort = serializeSort(query.sort)
  set('sort', sort === serializeSort(base.sort) ? null : sort)
  set('page', query.page > 1 ? String(query.page) : null)
  set('size', query.pageSize === base.pageSize ? null : String(query.pageSize))
  const filters = JSON.stringify(query.filters)
  set('f', filters === JSON.stringify(base.filters) ? null : filters)
  return params
}

function decode(prefix: string, fallback: DataTableQuery): DataTableQuery {
  const params = new URLSearchParams(window.location.search)
  const get = (key: string) => params.get(prefix + key)
  const rawSort = get('sort')
  const rawFilters = get('f')
  let filters: DataTableFilters = fallback.filters
  if (rawFilters !== null) {
    try {
      filters = JSON.parse(rawFilters) as DataTableFilters
    } catch {
      filters = {}
    }
  }
  // A hand-edited or truncated URL must not put the table on page -4.
  const page = Number(get('page') ?? fallback.page)
  const pageSize = Number(get('size') ?? fallback.pageSize)
  return {
    sort: rawSort === null ? fallback.sort : parseSort(rawSort),
    filters,
    page: Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1,
    pageSize: Number.isFinite(pageSize) && pageSize > 0 ? Math.floor(pageSize) : fallback.pageSize,
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
  // Compared by value: a host writes `initial` inline more often than not, and
  // a fresh object on every render used to remake `base` — and with it `reset`
  // and the popstate subscription — every time.
  const initialKey = JSON.stringify(initial ?? null)
  const base = React.useMemo<DataTableQuery>(
    () => ({ ...emptyQuery, ...initial }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [initialKey]
  )
  // The URL is read after mount, so server and first client render agree.
  const [query, setQuery] = React.useState<DataTableQuery>(base)

  // The write-back effect below runs in the same commit as the read, with the
  // query still at `base`; left alone it would strip the very parameters the
  // read has just decoded, and put them back a render later.
  const skipWrite = React.useRef(false)

  React.useEffect(() => {
    if (urlKey === null || typeof window === 'undefined') return
    skipWrite.current = true
    setQuery(decode(urlKey, base))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlKey])

  React.useEffect(() => {
    if (urlKey === null || typeof window === 'undefined') return
    if (skipWrite.current) {
      skipWrite.current = false
      return
    }
    const params = encode(query, base, urlKey)
    const search = params.toString()
    const next = `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`
    if (next === `${window.location.pathname}${window.location.search}${window.location.hash}`) return
    // The state object stays the router's: Next.js keeps its tree there and
    // React Router its index, and replacing it with null broke their back
    // button for every table with a urlKey.
    window.history[history === 'push' ? 'pushState' : 'replaceState'](
      window.history.state,
      '',
      next
    )
  }, [query, base, urlKey, history])

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
