'use client'

import * as React from 'react'

import { cn, type Tone } from '../lib/utils'

function Alert({
  className,
  tone = 'primary',
  live = false,
  role,
  ...props
}: React.ComponentProps<'div'> & {
  tone?: Tone
  /**
   * Whether this alert is news. `role="alert"` interrupts a screen-reader
   * user the moment the element renders, so a banner that is simply part of
   * the page — the usual case — announced itself on every mount and again on
   * every route change. Off, the alert is a plain region and is read in
   * document order; on, it is `role="alert"` and assertive, for something
   * that appeared in response to an action. A `role` of your own still wins.
   */
  live?: boolean
}) {
  return (
    <div
      data-slot="alert"
      data-tone={tone}
      role={role ?? (live ? 'alert' : undefined)}
      className={cn('mz-alert', className)}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="alert-title" className={cn('mz-alert-title', className)} {...props} />
}

function AlertDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-description"
      className={cn('mz-alert-description', className)}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription }
