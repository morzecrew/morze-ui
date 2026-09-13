'use client'

import * as React from 'react'
import { RadioGroup as RadioGroupPrimitive } from 'radix-ui'

import { cn, type Tone } from '../lib/utils'

function RadioGroup({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return (
    <RadioGroupPrimitive.Root
      data-slot="radio-group"
      className={cn('mz-radio-group', className)}
      {...props}
    />
  )
}

function RadioGroupItem({
  className,
  tone,
  size = 'md',
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item> & {
  tone?: Tone
  /** The same scale Checkbox and Switch run on. */
  size?: 'sm' | 'md' | 'lg'
}) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      data-tone={tone}
      data-size={size}
      className={cn(
        'mz-radio mz-focusable',
        size === 'sm' && 'mz-radio--sm',
        size === 'lg' && 'mz-radio--lg',
        className
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator
        data-slot="radio-group-indicator"
        className="mz-radio__indicator"
      />
    </RadioGroupPrimitive.Item>
  )
}

export { RadioGroup, RadioGroupItem }
