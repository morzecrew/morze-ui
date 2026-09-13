'use client'

import * as React from 'react'

import { cn } from '../lib/utils'

/* --------------------------------------------------------------------------
   The empty state (K-11). Every list, panel and search result needs one, and
   until now only `DataTable` had it — so each host wrote the same centred
   stack of icon, line, sentence and button again, at a different size each
   time. This is that stack, and the table's own state is drawn to match.

   Composed rather than configured: an empty state is one place where the
   wording, the illustration and the way out are all the host's own.
   -------------------------------------------------------------------------- */

function Empty({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="empty" className={cn('mz-empty', className)} {...props} />
}

/** The icon or illustration over the title. */
function EmptyMedia({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div data-slot="empty-media" aria-hidden="true" className={cn('mz-empty__media', className)} {...props} />
  )
}

function EmptyTitle({ className, ...props }: React.ComponentProps<'p'>) {
  return <p data-slot="empty-title" className={cn('mz-empty__title', className)} {...props} />
}

function EmptyDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p data-slot="empty-description" className={cn('mz-empty__description', className)} {...props} />
  )
}

/** The way out: one primary action, sometimes a secondary beside it. */
function EmptyActions({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div data-slot="empty-actions" className={cn('mz-empty__actions', className)} {...props} />
  )
}

export { Empty, EmptyMedia, EmptyTitle, EmptyDescription, EmptyActions }
