import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as React from 'react'

import { Calendar, type DateRange } from '../src'
import { addMonths, isoWeek, localeWeekStart, monthGrid } from '../src/lib/date'

/** June 2024 — a month that starts on a Saturday, so the lead-in is long. */
const JUNE = new Date(2024, 5, 15)
const days = () => screen.getAllByRole('button').filter((b) => b.dataset.slot === 'calendar-day')
const day = (n: number) =>
  days().find((b) => b.textContent === String(n) && !b.dataset.outside) as HTMLButtonElement

describe('date arithmetic', () => {
  it('never overflows a month end', () => {
    // The bug this guards: setMonth on a 31st rolls into the month after next.
    expect(addMonths(new Date(2024, 0, 31), 1)).toEqual(new Date(2024, 1, 29))
    expect(addMonths(new Date(2023, 0, 31), 1)).toEqual(new Date(2023, 1, 28))
    expect(addMonths(new Date(2024, 2, 31), -1)).toEqual(new Date(2024, 1, 29))
  })

  it('always lays a month out on six rows', () => {
    // A grid that changed height between months made the popover jump.
    for (let m = 0; m < 12; m++) {
      expect(monthGrid(new Date(2024, m, 1), 1)).toHaveLength(42)
    }
  })

  it('numbers ISO weeks across the year boundary', () => {
    expect(isoWeek(new Date(2024, 0, 1))).toBe(1)
    // 2023-01-01 was a Sunday and belongs to week 52 of 2022.
    expect(isoWeek(new Date(2023, 0, 1))).toBe(52)
    expect(isoWeek(new Date(2024, 11, 30))).toBe(1)
  })

  it('starts the week where the locale does', () => {
    expect(localeWeekStart('en-US')).toBe(0)
    expect(localeWeekStart('ru-RU')).toBe(1)
    expect(localeWeekStart(undefined)).toBe(1)
  })
})

describe('Calendar / single', () => {
  it('reports the clicked day', async () => {
    const onSelect = vi.fn()
    render(<Calendar defaultMonth={JUNE} onSelect={onSelect} locale="en-GB" />)

    await userEvent.click(day(12))
    expect(onSelect).toHaveBeenCalledWith(new Date(2024, 5, 12))
  })

  it('clears on a second click, unless the field is required', async () => {
    const onSelect = vi.fn()
    const selected = new Date(2024, 5, 12)
    const { rerender } = render(
      <Calendar defaultMonth={JUNE} selected={selected} onSelect={onSelect} locale="en-GB" />
    )

    await userEvent.click(day(12))
    expect(onSelect).toHaveBeenCalledWith(undefined)

    onSelect.mockClear()
    rerender(
      <Calendar defaultMonth={JUNE} selected={selected} onSelect={onSelect} required locale="en-GB" />
    )
    await userEvent.click(day(12))
    expect(onSelect).toHaveBeenCalledWith(selected)
  })
})

describe('Calendar / range', () => {
  it('orders the ends however the range was drawn', async () => {
    const onSelect = vi.fn()

    function Harness() {
      const [range, setRange] = React.useState<DateRange | undefined>()
      return (
        <Calendar
          mode="range"
          defaultMonth={JUNE}
          selected={range}
          locale="en-GB"
          onSelect={(next) => {
            setRange(next)
            onSelect(next)
          }}
        />
      )
    }
    render(<Harness />)

    // Clicked backwards: the 20th first, then the 10th.
    await userEvent.click(day(20))
    await userEvent.click(day(10))

    expect(onSelect).toHaveBeenLastCalledWith({
      from: new Date(2024, 5, 10),
      to: new Date(2024, 5, 20),
    })
  })

  it('marks the days between the ends without selecting them', () => {
    render(
      <Calendar
        mode="range"
        defaultMonth={JUNE}
        locale="en-GB"
        selected={{ from: new Date(2024, 5, 10), to: new Date(2024, 5, 13) }}
      />
    )

    expect(day(10)).toHaveAttribute('data-range-start')
    expect(day(13)).toHaveAttribute('data-range-end')
    expect(day(11)).toHaveAttribute('data-range-middle')
    // The middle is a span, not a selection: aria must not claim otherwise.
    expect(day(11)).not.toHaveAttribute('aria-selected')
  })
})

describe('Calendar / disabling', () => {
  it('honours every matcher shape', async () => {
    const onSelect = vi.fn()
    const { rerender } = render(
      <Calendar
        defaultMonth={JUNE}
        locale="en-GB"
        onSelect={onSelect}
        disabled={{ before: new Date(2024, 5, 10) }}
      />
    )
    expect(day(9)).toHaveAttribute('aria-disabled', 'true')
    expect(day(10)).not.toHaveAttribute('aria-disabled')

    rerender(
      <Calendar
        defaultMonth={JUNE}
        locale="en-GB"
        onSelect={onSelect}
        disabled={[new Date(2024, 5, 3), new Date(2024, 5, 4)]}
      />
    )
    expect(day(3)).toHaveAttribute('aria-disabled', 'true')
    expect(day(5)).not.toHaveAttribute('aria-disabled')

    rerender(
      <Calendar
        defaultMonth={JUNE}
        locale="en-GB"
        onSelect={onSelect}
        disabled={(d) => d.getDay() === 0}
      />
    )
    // 2 June 2024 was a Sunday.
    expect(day(2)).toHaveAttribute('aria-disabled', 'true')

    await userEvent.click(day(2))
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('stops paging at the bounds', () => {
    render(
      <Calendar
        defaultMonth={JUNE}
        locale="en-GB"
        fromDate={new Date(2024, 5, 1)}
        toDate={new Date(2024, 5, 30)}
      />
    )
    expect(screen.getByLabelText('Previous month')).toBeDisabled()
    expect(screen.getByLabelText('Next month')).toBeDisabled()
  })
})

describe('Calendar / keyboard', () => {
  it('moves a day with the arrows and a month with Page keys', async () => {
    render(<Calendar defaultMonth={JUNE} selected={new Date(2024, 5, 12)} locale="en-GB" />)

    const start = day(12)
    start.focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(day(13))

    await userEvent.keyboard('{ArrowDown}')
    expect(document.activeElement).toBe(day(20))

    await userEvent.keyboard('{PageDown}')
    // July now: the caption is the proof the grid moved.
    expect(screen.getByText(/July 2024/i)).toBeTruthy()
  })

  it('can still walk across a disabled day', async () => {
    // A natively disabled button cannot take focus, so arrowing into one drops
    // the roving tab stop and the whole grid falls out of the tab order. The
    // grid pattern wants aria-disabled here, not the attribute.
    render(
      <Calendar
        defaultMonth={JUNE}
        locale="en-GB"
        selected={new Date(2024, 5, 12)}
        disabled={[new Date(2024, 5, 13)]}
      />
    )

    day(12).focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(day(13))
    expect(day(13)).toHaveAttribute('aria-disabled', 'true')

    await userEvent.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(day(14))
  })

  it('keeps exactly one day in the tab order', () => {
    render(<Calendar defaultMonth={JUNE} selected={new Date(2024, 5, 12)} locale="en-GB" />)
    const tabbable = days().filter((d) => d.tabIndex === 0)
    expect(tabbable).toHaveLength(1)
    expect(tabbable[0]).toBe(day(12))
  })
})

describe('Calendar / layout', () => {
  it('drops the neighbouring months when asked to', () => {
    const { rerender } = render(<Calendar defaultMonth={JUNE} locale="en-GB" />)
    expect(days().filter((d) => d.dataset.outside).length).toBeGreaterThan(0)

    rerender(<Calendar defaultMonth={JUNE} locale="en-GB" showOutsideDays={false} />)
    expect(days().filter((d) => d.dataset.outside)).toHaveLength(0)
  })

  it('draws several months from one pair of arrows', () => {
    render(<Calendar defaultMonth={JUNE} locale="en-GB" numberOfMonths={2} />)
    expect(screen.getByText(/June 2024/i)).toBeTruthy()
    expect(screen.getByText(/July 2024/i)).toBeTruthy()
    expect(screen.getAllByLabelText('Previous month')).toHaveLength(1)
  })

  it('orders the weekday headings from the locale, and from the override', () => {
    const { rerender } = render(<Calendar defaultMonth={JUNE} locale="en-US" />)
    const headings = () => screen.getAllByRole('columnheader').map((th) => th.textContent)
    expect(headings()[0]).toMatch(/sun/i)

    rerender(<Calendar defaultMonth={JUNE} locale="en-US" weekStartsOn={1} />)
    expect(headings()[0]).toMatch(/mon/i)
  })
})
