'use client'

import * as React from 'react'

import { cn } from '../lib/utils'
import { observeResize } from '../lib/observe-resize'
import { useLocaleLabels } from './locale-provider'
import { defaultCommonLabels } from '../locales/defaults'
import type { MorzeCommonLabels } from '../locales/types'

/* --------------------------------------------------------------------------
   ClampText (N-08) — a description cut to N lines with "Show more". The
   toggle appears only when the text actually overflows, and overflow is
   measured on an invisible probe that stays clamped: measuring the visible
   text stops working the moment it is expanded.
   -------------------------------------------------------------------------- */

type ClampTextProps = Omit<React.ComponentProps<'div'>, 'children'> & {
  children: string
  /** Lines while collapsed. */
  lines?: number
  labels?: Partial<MorzeCommonLabels>
}

function ClampText({ className, children, lines = 2, labels: labelsProp, style, ...props }: ClampTextProps) {
  const labels = useLocaleLabels('common', defaultCommonLabels, labelsProp)
  const probeRef = React.useRef<HTMLParagraphElement>(null)
  const textId = React.useId()
  const [expanded, setExpanded] = React.useState(false)
  const [overflows, setOverflows] = React.useState(false)

  React.useLayoutEffect(() => {
    const probe = probeRef.current
    if (!probe) return
    const check = () => setOverflows(probe.scrollHeight > probe.clientHeight + 1)
    check()
    return observeResize(probe, check)
  }, [children, lines])

  if (!children) return null

  return (
    <div
      data-slot="clamp-text"
      className={cn('mz-clamp-text', className)}
      style={{ ['--mz-clamp-lines' as string]: lines, ...style }}
      {...props}
    >
      <p id={textId} className="mz-clamp-text__text" data-clamped={!expanded || undefined}>
        {children}
      </p>
      <p ref={probeRef} aria-hidden="true" className="mz-clamp-text__text mz-clamp-text__probe" data-clamped="">
        {children}
      </p>
      {overflows ? (
        <button
          type="button"
          className="mz-clamp-text__toggle mz-focusable"
          aria-expanded={expanded}
          aria-controls={textId}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? labels.showLess : labels.showMore}
        </button>
      ) : null}
    </div>
  )
}

export { ClampText }
export type { ClampTextProps }
