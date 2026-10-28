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
import { defaultDataTableLabels, type DataTableLabels } from './labels'
import type { DataTableQuery } from './types'
import { pageCount } from './utils'
import { useLocaleLabels, useLocaleTag } from '../locale-provider'

export function DataTablePagination({
  query,
  total,
  rowsOnPage,
  pageSizeOptions = [10, 25, 50, 100],
  labels: labelsProp,
  locale: localeProp,
  nav = 'auto',
  onQueryChange,
}: {
  query: DataTableQuery
  total?: number
  rowsOnPage: number
  /**
   * `false` — or a single option — hides the control: a host whose backend
   * fixes the page size would otherwise show a select that changes nothing.
   */
  pageSizeOptions?: number[] | false
  labels?: Partial<DataTableLabels>
  /** Number formatting locale; defaults to the browser's. */
  locale?: string
  /**
   * `auto` drops the page counter and the four buttons while there is nowhere
   * to go — one page, nothing before it — and keeps the count. `always` keeps
   * them, disabled.
   */
  nav?: 'auto' | 'always'
  onQueryChange: (query: DataTableQuery) => void
}) {
  const labels = useLocaleLabels('dataTable', defaultDataTableLabels, labelsProp)
  const locale = useLocaleTag(localeProp)
  const sizes = pageSizeOptions === false ? [] : pageSizeOptions
  /**
   * `total` is optional — a cursor-paged backend, or one where `COUNT(*)` is
   * too expensive, simply does not know it. There is no last page to compute
   * then, and `pageCount` says 1, so clamping to it used to leave every
   * forward control permanently disabled: the reader could not get off page
   * one. All that can honestly be said without a total is whether the page
   * that arrived was full — if it was, there is probably another behind it.
   */
  const unknownTotal = total === undefined
  const pages = pageCount(total, query.pageSize)
  const canPrevious = query.page > 1
  const canNext = unknownTotal ? rowsOnPage >= query.pageSize : query.page < pages
  const empty = total === 0 || (unknownTotal && rowsOnPage === 0)
  const from = total === 0 ? 0 : (query.page - 1) * query.pageSize + 1
  const to = unknownTotal ? from + rowsOnPage - 1 : Math.min(query.page * query.pageSize, total)
  // Four disabled buttons and "1 / 1" under three rows say nothing the count
  // has not said already (#23).
  const showNav = nav === 'always' || canPrevious || canNext
  const go = (page: number) =>
    onQueryChange({
      ...query,
      page: unknownTotal ? Math.max(page, 1) : Math.min(Math.max(page, 1), pages),
    })

  return (
    <div className="mz-dt__pagination" data-slot="data-table-pagination">
      <div className="mz-dt__pagination-info">
        {empty ? (
          labels.nothingFound
        ) : (
          <>
            {/* All three numbers go through the locale. Only `total` did,
                so a Russian table read “1–25 из 13 659”: two bare numerals
                and one grouped one, in the same sentence. */}
            {from.toLocaleString(locale)}–{to.toLocaleString(locale)}
            {total !== undefined ? (
              <>
                {' '}
                {labels.of} {total.toLocaleString(locale)}
              </>
            ) : null}
          </>
        )}
      </div>

      {sizes.length > 1 ? (
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
              {sizes.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {showNav ? (
        <div className="mz-dt__pagination-nav">
          <span className="mz-dt__pagination-page">
            {query.page.toLocaleString(locale)}
            {unknownTotal ? null : ` / ${pages.toLocaleString(locale)}`}
          </span>
          <Button type="button"
            variant="secondary"
            size="icon-sm"
            disabled={!canPrevious}
            onClick={() => go(1)}
            aria-label={labels.firstPage}
          >
            <ChevronsLeftIcon />
          </Button>
          <Button type="button"
            variant="secondary"
            size="icon-sm"
            disabled={!canPrevious}
            onClick={() => go(query.page - 1)}
            aria-label={labels.previousPage}
          >
            <ChevronLeftIcon />
          </Button>
          <Button type="button"
            variant="secondary"
            size="icon-sm"
            disabled={!canNext}
            onClick={() => go(query.page + 1)}
            aria-label={labels.nextPage}
          >
            <ChevronRightIcon />
          </Button>
          {/* Nothing to jump to when the last page is unknown. */}
          {unknownTotal ? null : (
            <Button type="button"
              variant="secondary"
              size="icon-sm"
              disabled={query.page >= pages}
              onClick={() => go(pages)}
              aria-label={labels.lastPage}
            >
              <ChevronsRightIcon />
            </Button>
          )}
        </div>
      ) : null}
    </div>
  )
}
