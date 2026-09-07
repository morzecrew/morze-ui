'use client'

import * as React from 'react'
import {
  Controller,
  FormProvider,
  useFormContext,
  useFormState,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form'
import { Slot } from 'radix-ui'

import { cn } from '../lib/utils'
import { Label } from '../components/label'

/**
 * React Hook Form bindings.
 *
 *   import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage }
 *     from '@morze/ui/form'
 *
 * They live behind their own entry point because `react-hook-form` is an
 * optional peer dependency: an application that does not use it should not
 * carry it, and the main bundle stays free of every form library.
 *
 * What this adds over `Field` is the wiring nobody enjoys writing by hand —
 * one generated id per field, `htmlFor` on the label, `aria-describedby`
 * pointing at the description and the message, and `aria-invalid` flipped by
 * the field's own validation state.
 */
const Form = FormProvider

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = { name: TName }

const FormFieldContext = React.createContext<FormFieldContextValue | null>(null)
const FormItemContext = React.createContext<{ id: string } | null>(null)

function FormField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({ ...props }: ControllerProps<TFieldValues, TName>) {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  )
}

/**
 * The ids and validation state of the field this is called inside.
 *
 * The state is read through `useFormState` scoped to this one name, so a
 * keystroke in one field does not re-render every other field's label.
 */
function useFormField() {
  const fieldContext = React.useContext(FormFieldContext)
  const itemContext = React.useContext(FormItemContext)
  const { getFieldState } = useFormContext()

  if (!fieldContext) throw new Error('useFormField must be used inside a <FormField>')
  if (!itemContext) throw new Error('useFormField must be used inside a <FormItem>')

  const formState = useFormState({ name: fieldContext.name })
  const fieldState = getFieldState(fieldContext.name, formState)
  const { id } = itemContext

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  }
}

function FormItem({ className, ...props }: React.ComponentProps<'div'>) {
  const id = React.useId()

  return (
    <FormItemContext.Provider value={{ id }}>
      <div data-slot="form-item" className={cn('mz-field', className)} {...props} />
    </FormItemContext.Provider>
  )
}

function FormLabel({ className, ...props }: React.ComponentProps<typeof Label>) {
  const { error, formItemId } = useFormField()

  return (
    <Label
      data-slot="form-label"
      data-error={!!error}
      className={cn(error && 'mz-label--error', className)}
      htmlFor={formItemId}
      {...props}
    />
  )
}

/**
 * Wraps the control itself — an `Input`, a `SelectTrigger`, anything. It
 * renders nothing of its own; it only stamps the id and the aria wiring onto
 * whatever child it is given.
 */
function FormControl({ ...props }: React.ComponentProps<typeof Slot.Root>) {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField()

  return (
    <Slot.Root
      data-slot="form-control"
      id={formItemId}
      aria-describedby={error ? `${formDescriptionId} ${formMessageId}` : formDescriptionId}
      aria-invalid={!!error}
      {...props}
    />
  )
}

function FormDescription({ className, ...props }: React.ComponentProps<'p'>) {
  const { formDescriptionId } = useFormField()

  return (
    <p
      data-slot="form-description"
      id={formDescriptionId}
      className={cn('mz-field__hint', className)}
      {...props}
    />
  )
}

/**
 * The validation message. It renders the field's error when there is one and
 * `children` otherwise, and disappears entirely when there is neither — so a
 * form does not reserve a blank line under every input.
 */
function FormMessage({ className, children, ...props }: React.ComponentProps<'p'>) {
  const { error, formMessageId } = useFormField()
  const body = error ? String(error.message ?? '') : children

  if (!body) return null

  return (
    <p
      data-slot="form-message"
      id={formMessageId}
      role="alert"
      className={cn('mz-field__error', className)}
      {...props}
    >
      {body}
    </p>
  )
}

export {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  useFormField,
}
