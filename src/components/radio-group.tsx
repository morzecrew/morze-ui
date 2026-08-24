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
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item> & { tone?: Tone }) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      data-tone={tone}
      className={cn('mz-radio mz-focusable', className)}
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
