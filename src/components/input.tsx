'use client'

import * as React from 'react'
import { cva } from 'class-variance-authority'

import { cn } from '../lib/utils'

/**
 * The field look as classes, for an element that should read as an input
 * without being one — a popover trigger that shows the chosen value. Add
 * `mz-focusable` for the focus ring a button needs; a real field draws its
 * own focus and wants none.
 */
const inputVariants = cva('mz-input', {
  variants: {
    size: {
      sm: 'mz-input--sm',
      md: '',
      lg: 'mz-input--lg',
    },
  },
  defaultVariants: {
    size: 'md',
  },
})

type InputProps = React.ComponentProps<'input'> & {
  inputSize?: 'sm' | 'md' | 'lg'
}

function Input({ className, type, inputSize = 'md', ...props }: InputProps) {
  return (
    <input
      type={type}
      data-slot="input"
      data-size={inputSize}
      className={cn(inputVariants({ size: inputSize }), className)}
      {...props}
    />
  )
}

export { Input, inputVariants }
export type { InputProps }
