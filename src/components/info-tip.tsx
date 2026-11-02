'use client'

import * as React from 'react'

import { cn } from '../lib/utils'
import { HelpCircleIcon } from '../lib/icons'
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip'
import { useLocaleLabels } from './locale-provider'
import { defaultCommonLabels } from '../locales/defaults'

/* --------------------------------------------------------------------------
   InfoTip (N-02) — a «?» beside a label that explains it. The long text lives
   here and not as a paragraph over the table: whoever needs it hovers or tabs
   to it. Every host built this from `Tooltip` and an icon, and each copy
   dropped something — `type="button"` (a form submitted), the accessible name
   (a screen reader heard "button"), the keyboard focus.
   -------------------------------------------------------------------------- */

type InfoTipProps = {
  children: React.ReactNode
  /** Accessible name of the trigger; wins over `about`. */
  label?: string
  /**
   * What the tip explains — the name becomes "More info: Overdue". Beside a
   * label that is itself a control (a selectable `Stat`), a bare "Overdue"
   * would name two buttons the same.
   */
  about?: string
  /** `sm` sits in an `xs` line (a tile label, a badge); `md` beside body text. */
  size?: 'sm' | 'md'
  side?: React.ComponentProps<typeof TooltipContent>['side']
  className?: string
}

function InfoTip({ children, label, about, size = 'md', side, className }: InfoTipProps) {
  const labels = useLocaleLabels('common', defaultCommonLabels)
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          data-slot="info-tip"
          data-size={size}
          aria-label={label ?? (about ? `${labels.moreInfo}: ${about}` : labels.moreInfo)}
          className={cn('mz-info-tip mz-focusable', className)}
        >
          <HelpCircleIcon />
        </button>
      </TooltipTrigger>
      <TooltipContent side={side} className="mz-info-tip__content">
        {children}
      </TooltipContent>
    </Tooltip>
  )
}

export { InfoTip }
export type { InfoTipProps }
