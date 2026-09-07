'use client'

import * as React from 'react'
import { Slot } from 'radix-ui'

import { cn } from '../lib/utils'
import { ChevronRightIcon, EllipsisIcon } from '../lib/icons'

function Breadcrumb({ className, ...props }: React.ComponentProps<'nav'>) {
  return (
    <nav
      data-slot="breadcrumb"
      aria-label="breadcrumb"
      className={cn('mz-breadcrumb', className)}
      {...props}
    />
  )
}

function BreadcrumbList({ className, ...props }: React.ComponentProps<'ol'>) {
  return <ol data-slot="breadcrumb-list" className={cn('mz-breadcrumb__list', className)} {...props} />
}

function BreadcrumbItem({ className, ...props }: React.ComponentProps<'li'>) {
  return <li data-slot="breadcrumb-item" className={cn('mz-breadcrumb__item', className)} {...props} />
}

function BreadcrumbLink({
  className,
  asChild = false,
  ...props
}: React.ComponentProps<'a'> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'a'

  return (
    <Comp
      data-slot="breadcrumb-link"
      className={cn('mz-breadcrumb__link mz-focusable', className)}
      {...props}
    />
  )
}

/**
 * The trail's last crumb. It is not a link, but it is the page you are on —
 * `aria-current` is what tells a screen reader that, and `role="link"` keeps
 * it in the same list of link roles as its siblings.
 */
function BreadcrumbPage({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="breadcrumb-page"
      role="link"
      aria-disabled="true"
      aria-current="page"
      className={cn('mz-breadcrumb__page', className)}
      {...props}
    />
  )
}

function BreadcrumbSeparator({ children, className, ...props }: React.ComponentProps<'li'>) {
  return (
    <li
      data-slot="breadcrumb-separator"
      role="presentation"
      aria-hidden="true"
      className={cn('mz-breadcrumb__separator', className)}
      {...props}
    >
      {children ?? <ChevronRightIcon />}
    </li>
  )
}

/** Collapsed middle of a long trail. Pair it with a menu to reveal the rest. */
function BreadcrumbEllipsis({
  className,
  label = 'More',
  ...props
}: React.ComponentProps<'span'> & { label?: string }) {
  return (
    <span
      data-slot="breadcrumb-ellipsis"
      role="presentation"
      className={cn('mz-breadcrumb__ellipsis', className)}
      {...props}
    >
      <EllipsisIcon />
      <span className="mz-sr-only">{label}</span>
    </span>
  )
}

export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
}
