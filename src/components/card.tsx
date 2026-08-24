'use client'

import * as React from 'react'

import { cn } from '../lib/utils'

function Card({
  className,
  interactive = false,
  onClick,
  onKeyDown,
  ...props
}: React.ComponentProps<'div'> & { interactive?: boolean }) {
  // An interactive card looks clickable, so it has to be reachable and
  // operable from the keyboard as well. Role and tabIndex sit before the
  // spread, so a consumer can still override them.
  const clickable = interactive && Boolean(onClick)

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
    <div
      data-slot="card"
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      className={cn(
        'mz-card',
        interactive && 'mz-card--interactive',
        clickable && 'mz-focusable',
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
