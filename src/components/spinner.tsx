'use client'

import * as React from 'react'

import { cn } from '../lib/utils'
import { SpinnerIcon } from '../lib/icons'

type SpinnerProps = React.ComponentProps<'span'> & {
  /** Announced by screen readers; pass `null` for a purely decorative spinner. */
  label?: string | null
}

function Spinner({ className, label = 'Loading', children, ...props }: SpinnerProps) {
  return (
    <span
      data-slot="spinner"
      role={label === null ? undefined : 'status'}
      aria-hidden={label === null ? true : undefined}
      className={cn('mz-spinner', className)}
      {...props}
    >
      <SpinnerIcon />
      {label === null ? null : <span className="mz-sr-only">{label}</span>}
      {children}
    </span>
  )
}

export { Spinner }
export type { SpinnerProps }
