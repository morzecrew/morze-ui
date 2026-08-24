'use client'

import * as React from 'react'

import { cn, type Tone } from '../lib/utils'

function Alert({
  className,
  tone = 'primary',
  ...props
}: React.ComponentProps<'div'> & { tone?: Tone }) {
  return (
    <div
      data-slot="alert"
      data-tone={tone}
      role="alert"
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
