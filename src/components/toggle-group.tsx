'use client'

import * as React from 'react'
import { type VariantProps } from 'class-variance-authority'
import { ToggleGroup as ToggleGroupPrimitive } from 'radix-ui'

import { cn, type Tone } from '../lib/utils'
import { toggleVariants } from './toggle'

type ToggleGroupContextValue = VariantProps<typeof toggleVariants> & { tone?: Tone }

const ToggleGroupContext = React.createContext<ToggleGroupContextValue>({
  size: 'md',
  variant: 'default',
})

type ToggleGroupProps = React.ComponentProps<typeof ToggleGroupPrimitive.Root> &
  VariantProps<typeof toggleVariants> & {
    tone?: Tone
    /**
     * `segmented` — items sit in one sunken well and the active one pops out.
     * `joined`    — items share edges as a single convex bar.
     * `spaced`    — free-standing toggles with a gap.
     */
    appearance?: 'segmented' | 'joined' | 'spaced'
  }

function ToggleGroup({
  className,
  variant = 'default',
  size = 'md',
  tone,
  appearance = 'segmented',
  style,
  children,
  ...props
}: ToggleGroupProps) {
  return (
    <ToggleGroupPrimitive.Root
      data-slot="toggle-group"
      data-variant={variant}
      data-size={size}
      data-tone={tone}
      data-appearance={appearance}
      className={cn(
        'mz-toggle-group',
        appearance === 'segmented' && 'mz-toggle-group--segmented',
        appearance === 'joined' && 'mz-toggle-group--joined',
        className
      )}
      style={
        appearance === 'spaced'
          ? ({ '--mz-toggle-group-gap': '8px', ...style } as React.CSSProperties)
          : style
      }
      {...props}
    >
      <ToggleGroupContext.Provider value={{ variant, size, tone }}>
        {children}
      </ToggleGroupContext.Provider>
    </ToggleGroupPrimitive.Root>
  )
}

function ToggleGroupItem({
  className,
  children,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Item> &
  VariantProps<typeof toggleVariants>) {
  // The item's own props win; the group only supplies the default. The other
  // way round the context defaults would always short-circuit and per-item
  // variant/size would be silently dropped.
  const context = React.useContext(ToggleGroupContext)
  const resolvedVariant = variant ?? context.variant
  const resolvedSize = size ?? context.size

  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      data-variant={resolvedVariant}
      data-size={resolvedSize}
      // Each item declares its own tone default, so the group's tone is
      // forwarded explicitly rather than left to inheritance.
      data-tone={context.tone}
      className={cn(
        toggleVariants({ variant: resolvedVariant, size: resolvedSize }),
        'mz-focusable',
        className
      )}
      {...props}
    >
      {children}
    </ToggleGroupPrimitive.Item>
  )
}

export { ToggleGroup, ToggleGroupItem }
