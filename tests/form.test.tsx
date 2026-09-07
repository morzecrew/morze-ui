import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'

import { Input } from '../src'
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
    expect(input).toHaveAttribute('aria-invalid', 'false')
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
