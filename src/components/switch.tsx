'use client'

import * as React from 'react'
import { Switch as SwitchPrimitive } from 'radix-ui'

import { cn, type Tone } from '../lib/utils'

type SwitchProps = React.ComponentProps<typeof SwitchPrimitive.Root> & {
  size?: 'sm' | 'md' | 'lg'
  tone?: Tone
}

function Switch({ className, size = 'md', tone, ...props }: SwitchProps) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      data-tone={tone}
      className={cn(
        'mz-switch mz-focusable',
        size === 'sm' && 'mz-switch--sm',
        size === 'lg' && 'mz-switch--lg',
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb data-slot="switch-thumb" className="mz-switch__thumb" />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
export type { SwitchProps }
