'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Toggle as TogglePrimitive } from 'radix-ui'

import { cn, type Tone } from '../lib/utils'

const toggleVariants = cva('mz-toggle', {
  variants: {
    variant: {
      default: '',
      outline: 'mz-toggle--outline',
    },
    size: {
      xs: 'mz-toggle--xs',
      sm: 'mz-toggle--sm',
      md: 'mz-toggle--md',
      lg: 'mz-toggle--lg',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'md',
  },
})

function Toggle({
  className,
  variant = 'default',
  size = 'md',
  tone,
  ...props
}: React.ComponentProps<typeof TogglePrimitive.Root> &
  VariantProps<typeof toggleVariants> & { tone?: Tone }) {
  return (
    <TogglePrimitive.Root
      data-slot="toggle"
      data-variant={variant}
      data-size={size}
      data-tone={tone}
      className={cn(toggleVariants({ variant, size }), 'mz-focusable', className)}
      {...props}
    />
  )
}

export { Toggle, toggleVariants }
