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
  /**
   * Inside the field, at its start: an icon (search, currency). Decorative
   * unless it is a control — an icon is hidden from assistive tech by the kit.
   */
  start?: React.ReactNode
  /** Inside the field, at its end: a unit, or a small button (clear, reveal). */
  end?: React.ReactNode
}

/*
 * With `start` or `end` the field is wrapped in `.mz-input-group` and
 * `className` goes to the wrapper — the width is the wrapper's to take, or
 * an end slot would sit at the wrapper's edge, not the field's. Without them
 * the markup is the bare `<input>` it always was.
 */
function Input({ className, type, inputSize = 'md', start, end, ...props }: InputProps) {
  const field = (
    <input
      type={type}
      data-slot="input"
      data-size={inputSize}
      className={cn(inputVariants({ size: inputSize }), start || end ? undefined : className)}
      {...props}
    />
  )
  if (!start && !end) return field
  return (
    <div
      data-slot="input-group"
      data-size={inputSize}
      data-start={start ? '' : undefined}
      data-end={end ? '' : undefined}
      className={cn('mz-input-group', className)}
    >
      {start ? <span className="mz-input-group__start">{start}</span> : null}
      {field}
      {end ? <span className="mz-input-group__end">{end}</span> : null}
    </div>
  )
}

export { Input, inputVariants }
export type { InputProps }
