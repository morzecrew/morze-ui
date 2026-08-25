/**
 * Every visible string the table owns, in one place. Defaults are English;
 * pass a partial `labels` object to translate or reword any of them.
 */
export type DataTableLabels = {
  filter: string
  filterFor: (column: string) => string
  filterActive: string
  contains: string
  apply: string
  reset: string
  resetAll: string
  resetFilters: string
  clearFilter: string
  rangeFrom: string
  rangeTo: string
  dateFrom: string
  dateTo: string
  yes: string
  no: string

  columns: string
  moveUp: (column: string) => string
  moveDown: (column: string) => string
  pinning: (column: string, side: string) => string
  pinnedLeft: string
  pinnedRight: string
  notPinned: string
  show: (column: string) => string
  hide: (column: string) => string

  sortBy: (column: string) => string
  columnWidth: (column: string) => string
  selectPage: string
  selectRow: string
  expandRow: string
  collapseRow: string
  details: string

  empty: string
  retry: string

  rowsPerPage: string
  nothingFound: string
  of: string
  firstPage: string
  previousPage: string
  nextPage: string
  lastPage: string
  loadMore: string
  loadingMore: string

  selectedCount: (count: string) => string
  allMatchingSuffix: string
  selectAllMatching: (total: string) => string
  clearSelection: string
  bulkActions: string
}

export const defaultDataTableLabels: DataTableLabels = {
  filter: 'Filter',
  filterFor: (column) => `Filter: ${column}`,
  filterActive: 'active',
  contains: 'Contains…',
  apply: 'Apply',
  reset: 'Reset',
  resetAll: 'Reset all',
  resetFilters: 'Reset filters',
  clearFilter: 'Clear filter',
  rangeFrom: 'from',
  rangeTo: 'to',
  dateFrom: 'From',
  dateTo: 'To',
  yes: 'Yes',
  no: 'No',

  columns: 'Columns',
  moveUp: (column) => `Move “${column}” up`,
  moveDown: (column) => `Move “${column}” down`,
  pinning: (column, side) => `Pinning for “${column}”: ${side}`,
  pinnedLeft: 'Left',
  pinnedRight: 'Right',
  notPinned: 'Not pinned',
  show: (column) => `Show “${column}”`,
  hide: (column) => `Hide “${column}”`,

  sortBy: (column) => `Sort by “${column}” (Shift to add to the sort)`,
  columnWidth: (column) => `Width of column “${column}”`,
  selectPage: 'Select page',
  selectRow: 'Select row',
  expandRow: 'Expand',
  collapseRow: 'Collapse',
  details: 'Details',

  empty: 'Nothing found',
  retry: 'Retry',

  rowsPerPage: 'Rows per page',
  nothingFound: 'Nothing found',
  of: 'of',
  firstPage: 'First page',
  previousPage: 'Previous page',
  nextPage: 'Next page',
  lastPage: 'Last page',
  loadMore: 'Load more',
  loadingMore: 'Loading…',

  selectedCount: (count) => `Selected: ${count}`,
  allMatchingSuffix: ' (all matching)',
  selectAllMatching: (total) => `Select all ${total}`,
  clearSelection: 'Clear selection',
  bulkActions: 'Actions for the selected rows',
}

export function resolveLabels(labels?: Partial<DataTableLabels>): DataTableLabels {
  return labels ? { ...defaultDataTableLabels, ...labels } : defaultDataTableLabels
}
