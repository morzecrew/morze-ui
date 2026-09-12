'use client'

import * as React from 'react'

import { cn } from '../lib/utils'

type TextareaProps = React.ComponentProps<'textarea'> & {
  /**
   * Type scale and opening height. Named like `Input`'s for the same reason:
   * `size` is already a native attribute on a form control.
   */
  inputSize?: 'sm' | 'md' | 'lg'
}

function Textarea({ className, inputSize = 'md', ...props }: TextareaProps) {
  return (
    <textarea
      data-slot="textarea"
      data-size={inputSize}
      className={cn(
        'mz-textarea',
        inputSize === 'sm' && 'mz-textarea--sm',
        inputSize === 'lg' && 'mz-textarea--lg',
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
export type { TextareaProps }
