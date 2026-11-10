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

/*
 * A tooltip answers hover and focus, and a phone has neither: Radix ignores a
 * touch pointer on purpose, so a tap on the «?» showed nothing, and a mouse
 * click on a tip already open from hovering closed it. The «?» is a button
 * and a reader presses it to read, so the open state is held here and a press
 * toggles it: a press opens a closed tip, or keeps one open that hover or
 * focus opened; the next press puts it away. Hover, focus, leaving, Escape and
 * a tap elsewhere still close and open it the way Radix does.
 */
function InfoTip({ children, label, about, size = 'md', side, className }: InfoTipProps) {
  const labels = useLocaleLabels('common', defaultCommonLabels)
  const [open, setOpen] = React.useState(false)
  // Opened by a press, so the next press closes it.
  const pinned = React.useRef(false)
  // Radix closes an open tip on pointerdown, before the click this component
  // answers; that one close is skipped, or a press on a hovered tip would
  // close it and the click would open it again.
  const pressing = React.useRef(false)
  const triggerRef = React.useRef<HTMLButtonElement>(null)

  const onOpenChange = (next: boolean) => {
    if (!next && pressing.current) {
      pressing.current = false
      return
    }
    if (!next) pinned.current = false
    setOpen(next)
  }

  return (
    <Tooltip open={open} onOpenChange={onOpenChange}>
      <TooltipTrigger asChild>
        <button
          ref={triggerRef}
          type="button"
          data-slot="info-tip"
          data-size={size}
          aria-label={label ?? (about ? `${labels.moreInfo}: ${about}` : labels.moreInfo)}
          className={cn('mz-info-tip mz-focusable', className)}
          onPointerDown={() => {
            if (open) pressing.current = true
          }}
          onClick={(event) => {
            // Keeps Radix's own click handler, which only closes, out of it.
            event.preventDefault()
            pressing.current = false
            if (open && pinned.current) {
              pinned.current = false
              setOpen(false)
            } else {
              pinned.current = true
              setOpen(true)
            }
          }}
        >
          <HelpCircleIcon />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side={side}
        className="mz-info-tip__content"
        // The «?» is outside the tip, so a press on it was also a press
        // outside, and dismissed the tip the click was about to pin. The
        // trigger's presses are this component's to answer.
        onPointerDownOutside={(event) => {
          if (triggerRef.current?.contains(event.target as Node)) event.preventDefault()
        }}
      >
        {children}
      </TooltipContent>
    </Tooltip>
  )
}

export { InfoTip }
export type { InfoTipProps }
