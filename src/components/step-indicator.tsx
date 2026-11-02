'use client'

import * as React from 'react'

import { cn } from '../lib/utils'
import { useLocaleLabels } from './locale-provider'
import { defaultCommonLabels } from '../locales/defaults'

/* --------------------------------------------------------------------------
   StepIndicator (N-06) — where a record stands on its way: dots for the
   steps, the passed ones muted, the current one in the tone, the ones ahead
   empty, and the step's name beside them. An order, an application, an
   onboarding, a ticket — every pipeline status in a table row.
   -------------------------------------------------------------------------- */

type StepIndicatorProps = Omit<React.ComponentProps<'span'>, 'children'> & {
  /** How many steps there are. */
  total: number
  /** 0-based; `-1` — not started, every dot empty. */
  current: number
  /** The current step's name, beside the dots. */
  label?: React.ReactNode
}

function StepIndicator({ className, total, current, label, ...props }: StepIndicatorProps) {
  const common = useLocaleLabels('common', defaultCommonLabels)
  const count = Math.max(0, Math.floor(total))
  const at = Math.min(Math.floor(current), count - 1)

  return (
    <span data-slot="step-indicator" className={cn('mz-steps', className)} {...props}>
      <span
        role="img"
        className="mz-steps__track"
        aria-label={at >= 0 ? common.stepOf(String(at + 1), String(count)) : undefined}
        aria-hidden={at < 0 || undefined}
      >
        {Array.from({ length: count }, (_, i) => (
          <span
            key={i}
            className="mz-steps__pip"
            data-state={i < at ? 'done' : i === at ? 'current' : 'todo'}
          />
        ))}
      </span>
      {label ? <span className="mz-steps__label">{label}</span> : null}
    </span>
  )
}

export { StepIndicator }
export type { StepIndicatorProps }
