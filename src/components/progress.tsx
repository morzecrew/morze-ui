'use client'

import * as React from 'react'
import { Progress as ProgressPrimitive } from 'radix-ui'

import { cn, type Tone } from '../lib/utils'

function Progress({
  className,
  value,
  max = 100,
  tone,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root> & { tone?: Tone }) {
  // Scaled against `max` so the bar agrees with the aria-valuenow/valuemax
  // Radix emits, and clamped so an out-of-range value cannot produce a
  // malformed translate.
  const percent = max > 0 ? (Math.min(Math.max(value ?? 0, 0), max) / max) * 100 : 0

  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      data-tone={tone}
      value={value}
      max={max}
      className={cn('mz-progress', className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="mz-progress__indicator"
        style={{ transform: `translateX(-${100 - percent}%)` }}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }
