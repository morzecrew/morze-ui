'use client'

import * as React from 'react'
import { Tooltip as TooltipPrimitive } from 'radix-ui'

import { cn } from '../lib/utils'

// Radix requires a provider above every Tooltip.Root, so one is created on
// demand — but only when the app has not supplied its own, otherwise the
// app-level delayDuration and skipDelayDuration grouping would be shadowed.
const TooltipProviderPresence = React.createContext(false)

function TooltipProvider({
  delayDuration = 200,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipProviderPresence.Provider value={true}>
      <TooltipPrimitive.Provider
        data-slot="tooltip-provider"
        delayDuration={delayDuration}
        {...props}
      >
        {children}
      </TooltipPrimitive.Provider>
    </TooltipProviderPresence.Provider>
  )
}

function Tooltip({ ...props }: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  const hasProvider = React.useContext(TooltipProviderPresence)
  const root = <TooltipPrimitive.Root data-slot="tooltip" {...props} />

  return hasProvider ? root : <TooltipProvider>{root}</TooltipProvider>
}

function TooltipTrigger({ ...props }: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />
}

function TooltipContent({
  className,
  sideOffset = 6,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn('mz-tooltip-content', className)}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow className="mz-tooltip-arrow" width={10} height={5} />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
