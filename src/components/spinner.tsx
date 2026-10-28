'use client'

import * as React from 'react'

import { cn } from '../lib/utils'
import { SpinnerIcon } from '../lib/icons'
import { defaultCommonLabels } from '../locales/defaults'
import { useLocaleLabels } from './locale-provider'

type SpinnerProps = React.ComponentProps<'span'> & {
  /** Announced by screen readers; pass `null` for a purely decorative spinner. */
  label?: string | null
}

function Spinner({ className, label: labelProp, children, ...props }: SpinnerProps) {
  const common = useLocaleLabels('common', defaultCommonLabels)
  const label = labelProp === undefined ? common.loading : labelProp
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
