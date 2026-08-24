import type { DataTableFilters, DataTableQuery, DataTableSort, FilterValue } from './types'

/** A filter that carries no constraint should never reach the backend. */
export function isFilterActive(value: FilterValue | undefined): value is FilterValue {
  if (!value) return false
  switch (value.type) {
    case 'text':
      return value.value.trim().length > 0
    case 'select':
      return value.value.length > 0
    case 'number-range':
      return value.min !== undefined || value.max !== undefined
    case 'date-range':
      return Boolean(value.from || value.to)
    case 'boolean':
      return true
  }
}

export function activeFilters(filters: DataTableFilters): [string, FilterValue][] {
  return Object.entries(filters).filter(([, value]) => isFilterActive(value)) as [
    string,
    FilterValue,
  ][]
}

export function setFilter(
  query: DataTableQuery,
  id: string,
  value: FilterValue | undefined
): DataTableQuery {
  const filters = { ...query.filters }
  if (isFilterActive(value)) filters[id] = value
  else delete filters[id]
  // Any filter change invalidates the current offset.
  return { ...query, filters, page: 1 }
}

/**
 * Click cycles asc → desc → off. With `additive` (shift-click) the column joins
 * the existing sort instead of replacing it, which is how multi-sort is
 * expressed to the backend as an ordered list.
 */
export function toggleSort(
  query: DataTableQuery,
  id: string,
  additive = false
): DataTableQuery {
  const existing = query.sort.find((s) => s.id === id)
  const next: DataTableSort[] = additive ? query.sort.filter((s) => s.id !== id) : []

  if (!existing) next.push({ id, dir: 'asc' })
  else if (existing.dir === 'asc') next.push({ id, dir: 'desc' })
  // a third click drops the column from the sort entirely

  return { ...query, sort: next, page: 1 }
}

export function sortStateOf(query: DataTableQuery, id: string) {
  const index = query.sort.findIndex((s) => s.id === id)
  if (index < 0) return { dir: undefined, index: undefined }
  return { dir: query.sort[index]!.dir, index: query.sort.length > 1 ? index + 1 : undefined }
}

export function pageCount(total: number | undefined, pageSize: number) {
  if (!total || pageSize <= 0) return 1
  return Math.max(1, Math.ceil(total / pageSize))
}

/** Compact URL form: `-date,name` → [{date desc}, {name asc}]. */
export function serializeSort(sort: DataTableSort[]) {
  return sort.map((s) => (s.dir === 'desc' ? `-${s.id}` : s.id)).join(',')
}

export function parseSort(raw: string | null): DataTableSort[] {
  if (!raw) return []
  return raw
    .split(',')
    .filter(Boolean)
    .map((token) =>
      token.startsWith('-')
        ? { id: token.slice(1), dir: 'desc' as const }
        : { id: token, dir: 'asc' as const }
    )
}
