'use client'

import * as React from 'react'

import { cn } from '../lib/utils'
import { ChevronLeftIcon, ChevronRightIcon, ChevronsLeftIcon, ChevronsRightIcon } from '../lib/icons'
import { Button } from './button'
import { useLocaleLabels, useLocaleTag } from './locale-provider'
import { defaultCommonLabels } from '../locales/defaults'
import type { MorzeCommonLabels } from '../locales/types'

/* --------------------------------------------------------------------------
   Pagination (N-04) — a pager on its own: first, previous, "2 / 6", next,
   last. `DataTablePagination` is bound to the table's query and brings a
   page-size select and a row count; a list of cards, a gallery or a server
   table with its own state needs just the arrows, and sometimes twice — over
   the list and under it.
   -------------------------------------------------------------------------- */

type PaginationProps = Omit<React.ComponentProps<'nav'>, 'onChange'> & {
  /** 1-based. Clamped into `1…pageCount`. */
  page: number
  pageCount: number
  onPageChange: (page: number) => void
  /** `sm` for a footer or a panel; `md` matches a field in a toolbar. */
  size?: 'sm' | 'md'
  /** The first and last page buttons. */
  edges?: boolean
  labels?: Partial<MorzeCommonLabels>
  /** Number formatting locale; defaults to the provider's, then the browser's. */
  locale?: string
}

function Pagination({
  className,
  page,
  pageCount,
  onPageChange,
  size = 'sm',
  edges = true,
  labels: labelsProp,
  locale: localeProp,
  ...props
}: PaginationProps) {
  const labels = useLocaleLabels('common', defaultCommonLabels, labelsProp)
  const locale = useLocaleTag(localeProp)
  const total = Math.max(1, Math.floor(pageCount) || 1)
  const current = Math.min(Math.max(1, Math.floor(page) || 1), total)
  const buttonSize = size === 'md' ? 'icon' : 'icon-sm'
  const go = (next: number) => {
    const target = Math.min(Math.max(1, next), total)
    if (target !== current) onPageChange(target)
  }
  const fmt = (n: number) => n.toLocaleString(locale)
  const atStart = current <= 1
  const atEnd = current >= total

  return (
    <nav
      data-slot="pagination"
      data-size={size}
      aria-label={labels.pagination}
      className={cn('mz-pagination', className)}
      {...props}
    >
      {/* Soft-disabled, not `disabled`: Next is the button under the
          reader's finger when the last page arrives, and a natively disabled
          button drops the focus it holds to <body>. `aria-disabled` keeps it
          in place and says the way is shut; `Button` refuses the press. */}
      {edges ? (
        <Button type="button" variant="outline" size={buttonSize} aria-disabled={atStart || undefined} onClick={() => go(1)} aria-label={labels.firstPage}>
          <ChevronsLeftIcon />
        </Button>
      ) : null}
      <Button type="button" variant="outline" size={buttonSize} aria-disabled={atStart || undefined} onClick={() => go(current - 1)} aria-label={labels.previousPage}>
        <ChevronLeftIcon />
      </Button>
      {/* "2 / 6" is for the eye; the reader hears "Page 2 of 6". An
          aria-label on a span with no role is not read at all, so the words
          are text of their own, in a status region that speaks the new page
          when Next is pressed and the focus stays put. */}
      <span className="mz-pagination__page" role="status">
        <span aria-hidden="true">
          {fmt(current)} / {fmt(total)}
        </span>
        <span className="mz-sr-only">{labels.pageOf(fmt(current), fmt(total))}</span>
      </span>
      <Button type="button" variant="outline" size={buttonSize} aria-disabled={atEnd || undefined} onClick={() => go(current + 1)} aria-label={labels.nextPage}>
        <ChevronRightIcon />
      </Button>
      {edges ? (
        <Button type="button" variant="outline" size={buttonSize} aria-disabled={atEnd || undefined} onClick={() => go(total)} aria-label={labels.lastPage}>
          <ChevronsRightIcon />
        </Button>
      ) : null}
    </nav>
  )
}

export { Pagination }
export type { PaginationProps }
