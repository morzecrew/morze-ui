'use client'

import * as React from 'react'
import { Checkbox as CheckboxPrimitive } from 'radix-ui'

import { cn, type Tone } from '../lib/utils'
import { CheckIcon, MinusIcon } from '../lib/icons'

type CheckboxProps = React.ComponentProps<typeof CheckboxPrimitive.Root> & {
  size?: 'sm' | 'md' | 'lg'
  tone?: Tone
}

function Checkbox({ className, size = 'md', tone, ...props }: CheckboxProps) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      data-size={size}
      data-tone={tone}
      className={cn(
        'mz-checkbox mz-focusable',
        size === 'sm' && 'mz-checkbox--sm',
        size === 'lg' && 'mz-checkbox--lg',
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator data-slot="checkbox-indicator" className="mz-checkbox__indicator">
        {/* Both glyphs ship; CSS picks one off the root's data-state, which is
            the only source that is right for uncontrolled checkboxes too. */}
        <CheckIcon className="mz-checkbox__check" />
        <MinusIcon className="mz-checkbox__dash" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
export type { CheckboxProps }
