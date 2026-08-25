import type * as React from 'react'

import type { DataTableLabels } from './labels'

/* ==========================================================================
   The table is fully controlled: it never sorts, filters or paginates data
   itself. Every interaction produces a new DataTableQuery, and the consumer
   turns that into one request. On server-driven data any client-side
   processing would disagree with what the backend actually returned.
   ========================================================================== */

export type SortDir = 'asc' | 'desc'
export type DataTableSort = { id: string; dir: SortDir }

export type FilterValue =
  | { type: 'text'; value: string }
  | { type: 'select'; value: string[] }
  | { type: 'number-range'; min?: number; max?: number }
  | { type: 'date-range'; from?: string; to?: string }
  | { type: 'boolean'; value: boolean }
  /**
   * Whatever a host's own filter widget produces. The value travels into
   * `query.filters` untouched — its shape is the host's business — and `label`
   * is what the chip above the table shows.
   */
  | { type: 'custom'; value: unknown; label?: string }

export type DataTableFilters = Record<string, FilterValue>

export type DataTableQuery = {
  sort: DataTableSort[]
  filters: DataTableFilters
  page: number
  pageSize: number
}

export type SelectOptionDef = { value: string; label: string }

/** What a `custom` filter's `render` gets to work with. */
export type CustomFilterContext = {
  /** The staged value — the popover's draft, not what the query carries yet. */
  value: unknown
  label?: string
  /** Stages a value; it reaches the query when Apply is pressed. */
  onChange: (value: unknown, label?: string) => void
  /** Stages and applies in one step, then closes the popover. */
  commit: (value: unknown, label?: string) => void
  /** The table's resolved strings, so a host widget stays translated with it. */
  labels: DataTableLabels
}

/** Declares which control the header popover shows and what it sends back. */
export type ColumnFilterDef =
  | { type: 'text'; placeholder?: string }
  | { type: 'select'; options: SelectOptionDef[]; multiple?: boolean }
  | { type: 'number-range'; step?: number; unit?: string }
  | { type: 'date-range' }
  | { type: 'boolean'; trueLabel?: string; falseLabel?: string }
  /**
   * A host-supplied control — async multiselect, range slider, presence
   * toggle — rendered inside the kit's popover so it looks like the built-in
   * filters and, unlike a widget smuggled into `column.header`, takes part in
   * `query.filters`.
   */
  | {
      type: 'custom'
      render: (context: CustomFilterContext) => React.ReactNode
      /** Chip text for a value; falls back to the label the widget supplied. */
      describe?: (value: unknown) => string
      /** `false` drops the Apply/Reset footer — for a widget that commits itself. */
      actions?: boolean
    }

export type EditableDef<T> = {
  type: 'text' | 'number' | 'select'
  options?: SelectOptionDef[]
  /** Resolves the current editable value out of the row. */
  value: (row: T) => string
  /** Rejected promises roll the cell back and surface the message. */
  onSave: (row: T, value: string) => void | Promise<void>
}

export type DataTableColumn<T> = {
  id: string
  header: React.ReactNode
  /** Short label used where the header may be a node — column manager, cards. */
  label?: string
  /** Plain value renderer. Ignored when `cell` is given. */
  accessor?: (row: T) => React.ReactNode
  cell?: (row: T, context: { rowIndex: number }) => React.ReactNode
  width?: number
  minWidth?: number
  maxWidth?: number
  align?: 'left' | 'center' | 'right'
  sortable?: boolean
  filter?: ColumnFilterDef
  /** Sticks the column to an edge while the body scrolls sideways. */
  pinned?: 'left' | 'right'
  resizable?: boolean
  /**
   * `false` keeps the column at exactly `width` when the table stretches its
   * columns to fill the container — for icon or action columns.
   */
  flex?: boolean
  /** `false` keeps the column out of the visibility menu (and always visible). */
  hideable?: boolean
  editable?: EditableDef<T>
  headerTitle?: string
}

/** Anything valid on a `<tr>`, plus `data-*` — the row-level escape hatch. */
export type RowAttributes = React.ComponentPropsWithoutRef<'tr'> & {
  [key: `data-${string}`]: string | number | boolean | undefined
}

/** Column layout is UI state, not query state — it never reaches the backend. */
export type ColumnLayout = {
  order: string[]
  hidden: string[]
  widths: Record<string, number>
  pinned: Record<string, 'left' | 'right' | undefined>
  /** Columns the user resized by hand; auto-fit leaves these alone. */
  sized: string[]
}

export type SavedView = {
  id: string
  name: string
  query: DataTableQuery
  layout?: Partial<ColumnLayout>
}

export type RowSelectionState = {
  /** Explicitly ticked row keys on the current page. */
  keys: string[]
  /**
   * "Everything the current filter matches", including rows never fetched.
   * Bulk actions must send the query instead of the key list in this mode.
   */
  allMatching: boolean
}

export const emptyQuery: DataTableQuery = {
  sort: [],
  filters: {},
  page: 1,
  pageSize: 25,
}
