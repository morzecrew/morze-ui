'use client'

import * as React from 'react'

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
} from '../../lib/icons'
import { Button } from '../button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../select'
import { resolveLabels, type DataTableLabels } from './labels'
import type { DataTableQuery } from './types'
import { pageCount } from './utils'

export function DataTablePagination({
  query,
  total,
  rowsOnPage,
  pageSizeOptions = [10, 25, 50, 100],
  labels: labelsProp,
  locale,
  onQueryChange,
}: {
  query: DataTableQuery
  total?: number
  rowsOnPage: number
  pageSizeOptions?: number[]
  labels?: Partial<DataTableLabels>
  /** Number formatting locale; defaults to the browser's. */
  locale?: string
  onQueryChange: (query: DataTableQuery) => void
}) {
  const labels = resolveLabels(labelsProp)
  const pages = pageCount(total, query.pageSize)
  const from = total === 0 ? 0 : (query.page - 1) * query.pageSize + 1
  const to = total === undefined ? from + rowsOnPage - 1 : Math.min(query.page * query.pageSize, total)
  const go = (page: number) => onQueryChange({ ...query, page: Math.min(Math.max(page, 1), pages) })

  return (
    <div className="mz-dt__pagination" data-slot="data-table-pagination">
      <div className="mz-dt__pagination-info">
        {total === 0 ? (
          labels.nothingFound
        ) : (
          <>
            {from}–{to}
            {total !== undefined ? (
              <>
                {' '}
                {labels.of} {total.toLocaleString(locale)}
              </>
            ) : null}
          </>
        )}
      </div>

      <div className="mz-dt__pagination-size">
        <span>{labels.rowsPerPage}</span>
        <Select
          value={String(query.pageSize)}
          onValueChange={(value) =>
            onQueryChange({ ...query, pageSize: Number(value), page: 1 })
          }
        >
          <SelectTrigger size="sm" className="mz-dt__pagination-select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {pageSizeOptions.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mz-dt__pagination-nav">
        <span className="mz-dt__pagination-page">
          {query.page} / {pages}
        </span>
        <Button
          variant="secondary"
          size="icon-sm"
          disabled={query.page <= 1}
          onClick={() => go(1)}
          aria-label={labels.firstPage}
        >
          <ChevronsLeftIcon />
        </Button>
        <Button
          variant="secondary"
          size="icon-sm"
          disabled={query.page <= 1}
          onClick={() => go(query.page - 1)}
          aria-label={labels.previousPage}
        >
          <ChevronLeftIcon />
        </Button>
        <Button
          variant="secondary"
          size="icon-sm"
          disabled={query.page >= pages}
          onClick={() => go(query.page + 1)}
          aria-label={labels.nextPage}
        >
          <ChevronRightIcon />
        </Button>
        <Button
          variant="secondary"
          size="icon-sm"
          disabled={query.page >= pages}
          onClick={() => go(pages)}
          aria-label={labels.lastPage}
        >
          <ChevronsRightIcon />
        </Button>
      </div>
    </div>
  )
}
