import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { Toaster, dismiss, toast } from '../src'

afterEach(() => act(() => dismiss()))

describe('toast queue', () => {
  it('raises a toast from outside React', () => {
    // The whole point of the plain function: the place a request fails is
    // rarely a place that can call a hook.
    render(<Toaster />)
    act(() => {
      toast({ title: 'Saved', description: 'Order 4711', tone: 'success' })
    })

    expect(screen.getByText('Saved')).toBeTruthy()
    expect(screen.getByText('Order 4711')).toBeTruthy()
    expect(screen.getByText('Saved').closest('[data-slot="toast"]')).toHaveAttribute(
      'data-tone',
      'success'
    )
  })

  it('keeps the newest three and drops the rest', () => {
    render(<Toaster />)
    act(() => {
      for (let i = 1; i <= 5; i++) toast({ title: `Toast ${i}` })
    })

    expect(screen.queryByText('Toast 1')).toBeNull()
    expect(screen.queryByText('Toast 2')).toBeNull()
    expect(screen.getByText('Toast 5')).toBeTruthy()
    expect(screen.getAllByRole('status', { hidden: true }).length).toBeLessThanOrEqual(3)
  })

  it('updates one in place without queueing a second', () => {
    render(<Toaster />)
    let handle!: ReturnType<typeof toast>
    act(() => {
      handle = toast({ title: 'Uploading…', duration: Infinity })
    })
    act(() => {
      handle.update({ title: 'Uploaded', tone: 'success' })
    })

    expect(screen.queryByText('Uploading…')).toBeNull()
    expect(screen.getByText('Uploaded')).toBeTruthy()
  })

  it('dismisses one by handle and all at once', () => {
    render(<Toaster />)
    let first!: ReturnType<typeof toast>
    act(() => {
      first = toast({ title: 'First' })
      toast({ title: 'Second' })
    })

    act(() => first.dismiss())
    expect(screen.queryByText('First')).toBeNull()
    expect(screen.getByText('Second')).toBeTruthy()

    act(() => dismiss())
    expect(screen.queryByText('Second')).toBeNull()
  })

  it('translates an infinite duration into a finite one', () => {
    // Radix multiplies the duration while swiping; Infinity produced a NaN
    // timeout and the toast closed on the frame it opened.
    render(<Toaster />)
    act(() => {
      toast({ title: 'Pinned', duration: Infinity })
    })

    vi.useFakeTimers()
    act(() => vi.advanceTimersByTime(30_000))
    vi.useRealTimers()

    expect(screen.getByText('Pinned')).toBeTruthy()
  })

  it('closes from the close button', async () => {
    render(<Toaster closeLabel="Dismiss" />)
    act(() => {
      toast({ title: 'Closable' })
    })

    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(screen.queryByText('Closable')).toBeNull()
  })
})
