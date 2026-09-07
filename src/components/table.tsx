'use client'

import * as React from 'react'

import { cn } from '../lib/utils'

/**
 * Plain table primitives — the markup layer under a data grid, not a grid
 * itself. `DataTable` is the batteries-included component; these are for the
 * tables an application lays out by hand.
 *
 * The scroll container is part of `Table` rather than something the host wraps
 * around it: a bare `<table>` with a `min-width` pushes the page into a
 * horizontal scroll instead of scrolling itself, which is the single most
 * common way a table breaks a layout.
 */
function Table({
  className,
  containerClassName,
  containerRef,
  ...props
}: React.ComponentProps<'table'> & {
  containerClassName?: string
  /**
   * The scrolling element itself. Reach for it when something outside the
   * table has to follow the scroll — a synchronised header, a virtualiser,
   * restoring the position after a refetch. Owning the container would
   * otherwise put it out of the caller's reach entirely.
   */
  containerRef?: React.Ref<HTMLDivElement>
}) {
  return (
    <div
      ref={containerRef}
      data-slot="table-container"
      className={cn('mz-table-wrap', containerClassName)}
    >
      <table data-slot="table" className={cn('mz-table', className)} {...props} />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
  return <thead data-slot="table-header" className={cn('mz-table__head', className)} {...props} />
}

function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return <tbody data-slot="table-body" className={cn('mz-table__body', className)} {...props} />
}

function TableFooter({ className, ...props }: React.ComponentProps<'tfoot'>) {
  return <tfoot data-slot="table-footer" className={cn('mz-table__foot', className)} {...props} />
}

function TableRow({ className, ...props }: React.ComponentProps<'tr'>) {
  return <tr data-slot="table-row" className={cn('mz-table__row', className)} {...props} />
}

function TableHead({ className, ...props }: React.ComponentProps<'th'>) {
  return <th data-slot="table-head" className={cn('mz-table__th', className)} {...props} />
}

function TableCell({ className, ...props }: React.ComponentProps<'td'>) {
  return <td data-slot="table-cell" className={cn('mz-table__td', className)} {...props} />
}

function TableCaption({ className, ...props }: React.ComponentProps<'caption'>) {
  return (
    <caption data-slot="table-caption" className={cn('mz-table__caption', className)} {...props} />
  )
}

export { Table, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell, TableCaption }
