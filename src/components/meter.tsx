'use client'

import * as React from 'react'

import { cn, type Tone } from '../lib/utils'

/* --------------------------------------------------------------------------
   Meter (N-05) — a thin bar for a share in a table cell or beside a figure:
   "received 3 of 5", "late by 8 of 30 days", "a unit 70% full". Not a
   `Progress`: that is a task under way (`progressbar`, control height,
   motion); this is a quantity (`meter`, a hairline bar, no motion).

   The host names it (`aria-label`) or hides it (`aria-hidden`) when the
   figure beside it already says the same.
   -------------------------------------------------------------------------- */

type MeterProps = Omit<React.ComponentProps<'span'>, 'children'> & {
  value: number
  /** The whole; `value / max` is the filled share. */
  max?: number
  /** No tone — a neutral fill. */
  tone?: Tone
  size?: 'sm' | 'md'
}

function Meter({ className, value, max = 1, tone, size = 'md', ...props }: MeterProps) {
  const safeMax = max > 0 ? max : 1
  const clamped = Math.min(Math.max(Number.isFinite(value) ? value : 0, 0), safeMax)
  const percent = (clamped / safeMax) * 100

  return (
    <span
      role="meter"
      aria-valuemin={0}
      aria-valuemax={safeMax}
      aria-valuenow={clamped}
      data-slot="meter"
      data-size={size}
      data-tone={tone}
      className={cn('mz-meter', className)}
      {...props}
    >
      <span className="mz-meter__fill" style={{ width: `${percent}%` }} />
    </span>
  )
}

export { Meter }
export type { MeterProps }
