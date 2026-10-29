'use client'

import * as React from 'react'
import { Slot } from 'radix-ui'

import { cn } from '../lib/utils'

type CardProps = React.ComponentProps<'div'> & {
  interactive?: boolean
  /**
   * Renders the card's look onto its only child — a router `Link`, an `<a>` —
   * so a card that opens a page is the link itself: one box, link semantics,
   * and the hover and focus ring on the element that has the focus (#32).
   */
  asChild?: boolean
  /**
   * A card that is chosen: a filter, a segment, one cell of a matrix. Drawn
   * with the tone rim; announced as `aria-pressed` on a clickable card.
   */
  pressed?: boolean
}

function Card({
  className,
  interactive = false,
  asChild = false,
  pressed,
  onClick,
  onKeyDown,
  ...props
}: CardProps) {
  // An interactive card looks clickable, so it has to be reachable and
  // operable from the keyboard as well. Role and tabIndex sit before the
  // spread, so a consumer can still override them. A slotted link is
  // reachable and operable already, and keeps its own role.
  const clickable = interactive && Boolean(onClick) && !asChild
  const Comp = asChild ? Slot.Root : 'div'

  const handleKeyDown = clickable
    ? (event: React.KeyboardEvent<HTMLDivElement>) => {
        onKeyDown?.(event)
        if (event.defaultPrevented) return
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          event.currentTarget.click()
        }
      }
    : onKeyDown

  return (
    <Comp
      data-slot="card"
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      aria-pressed={clickable && pressed !== undefined ? pressed : undefined}
      data-state={pressed && !clickable ? 'on' : undefined}
      className={cn(
        'mz-card',
        interactive && 'mz-card--interactive',
        (clickable || (interactive && asChild)) && 'mz-focusable',
        className
      )}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-header" className={cn('mz-card-header', className)} {...props} />
}

function CardTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-title" className={cn('mz-card-title', className)} {...props} />
}

function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div data-slot="card-description" className={cn('mz-card-description', className)} {...props} />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-action" className={cn('mz-card-action', className)} {...props} />
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-content" className={cn('mz-card-content', className)} {...props} />
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-footer" className={cn('mz-card-footer', className)} {...props} />
}

export { Card, CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardContent }
export type { CardProps }
