import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'

import { Input, NumberInput } from '../src'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../src/form'

function Harness({ onSubmit = () => {} }: { onSubmit?: (values: { email: string }) => void }) {
  const form = useForm<{ email: string }>({ defaultValues: { email: '' } })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="email"
          rules={{ required: 'An email is required' }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormDescription>We only use it for receipts.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <button type="submit">Save</button>
      </form>
    </Form>
  )
}

describe('Form', () => {
  it('wires the label, the description and the control to one id', () => {
    render(<Harness />)

    const input = screen.getByLabelText('Email')
    const description = screen.getByText('We only use it for receipts.')

    // The whole point of the scaffolding: none of this is written by hand.
    expect(input.id).toBeTruthy()
    expect(input).toHaveAttribute('aria-describedby', description.id)
    // No error, no attribute (A-23): `false` would override the control's own.
    expect(input).not.toHaveAttribute('aria-invalid')
  })

  it('reserves no room for a message until there is one', () => {
    render(<Harness />)
    expect(document.querySelector('[data-slot="form-message"]')).toBeNull()
  })

  it('announces the failure on the field it belongs to', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    const message = await screen.findByRole('alert')
    expect(message).toHaveTextContent('An email is required')

    const input = screen.getByLabelText('Email')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    // Both the description and the error, so the reason survives the failure.
    expect(input.getAttribute('aria-describedby')).toContain(message.id)
    expect(screen.getByText('Email')).toHaveAttribute('data-error', 'true')
  })
})

describe('FormControl and the control’s own validity (A-23)', () => {
  function Quantity() {
    const form = useForm<{ qty: number | undefined }>({ defaultValues: { qty: 50 } })
    return (
      <Form {...form}>
        <FormField
          control={form.control}
          name="qty"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Quantity</FormLabel>
              <FormControl>
                <NumberInput value={field.value} onChange={field.onChange} max={10} />
              </FormControl>
            </FormItem>
          )}
        />
      </Form>
    )
  }

  it('lets an out-of-range NumberInput say it is invalid before the form has a rule to', () => {
    render(<Quantity />)
    const input = screen.getByRole('spinbutton', { name: 'Quantity' })
    expect(input).toHaveAttribute('data-out-of-range', 'max')
    expect(input).toHaveAttribute('aria-invalid', 'true')
  })
})
