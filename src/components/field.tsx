'use client'

import * as React from 'react'

import { cn } from '../lib/utils'

/** Vertical label + control + hint/error stack. */
function Field({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="field" className={cn('mz-field', className)} {...props} />
}

function FieldHint({ className, ...props }: React.ComponentProps<'p'>) {
  return <p data-slot="field-hint" className={cn('mz-field__hint', className)} {...props} />
}

function FieldError({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="field-error"
      role="alert"
      className={cn('mz-field__error', className)}
      {...props}
    />
  )
}

export { Field, FieldHint, FieldError }
