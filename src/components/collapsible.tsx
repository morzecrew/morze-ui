'use client'

import * as React from 'react'
import { Collapsible as CollapsiblePrimitive } from 'radix-ui'

import { cn } from '../lib/utils'

/* --------------------------------------------------------------------------
   One section that opens and closes (K-11). The accordion is a set of these
   that agree on how many may be open at once; on its own it is a filter panel
   folded away above a table, an advanced block in a form, a long log.

   The content animates on the same height variable and the same curve as the
   accordion's, so two folds on one page open at the same speed.
   -------------------------------------------------------------------------- */

function Collapsible({ ...props }: React.ComponentProps<typeof CollapsiblePrimitive.Root>) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />
}

function CollapsibleTrigger({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleTrigger>) {
  return <CollapsiblePrimitive.CollapsibleTrigger data-slot="collapsible-trigger" {...props} />
}

function CollapsibleContent({
  className,
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleContent>) {
  return (
    <CollapsiblePrimitive.CollapsibleContent
      data-slot="collapsible-content"
      className={cn('mz-collapsible-content', className)}
      {...props}
    />
  )
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
