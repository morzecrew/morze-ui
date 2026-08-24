'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'

import { cn, type Tone } from '../lib/utils'

const badgeVariants = cva('mz-badge', {
  variants: {
    variant: {
      solid: 'mz-badge--solid',
      soft: 'mz-badge--soft',
      outline: 'mz-badge--outline',
    },
  },
  defaultVariants: {
    variant: 'solid',
  },
})

function Badge({
  className,
  variant = 'solid',
  tone,
  dot = false,
  asChild = false,
  children,
  ...props
}: React.ComponentProps<'span'> &
  VariantProps<typeof badgeVariants> & {
    asChild?: boolean
    tone?: Tone
    dot?: boolean
  }) {
  const Comp = asChild ? Slot.Root : 'span'

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      data-tone={tone}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {dot ? <span className="mz-badge__dot" aria-hidden="true" /> : null}
          {children}
        </>
      )}
    </Comp>
  )
}

export { Badge, badgeVariants }
