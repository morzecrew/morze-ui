'use client'

import * as React from 'react'

import { cn } from '../lib/utils'

type InputProps = React.ComponentProps<'input'> & {
  inputSize?: 'sm' | 'md' | 'lg'
}

function Input({ className, type, inputSize = 'md', ...props }: InputProps) {
  return (
    <input
      type={type}
      data-slot="input"
      data-size={inputSize}
      className={cn(
        'mz-input',
        inputSize === 'sm' && 'mz-input--sm',
        inputSize === 'lg' && 'mz-input--lg',
        className
      )}
      {...props}
    />
  )
}

export { Input }
export type { InputProps }
