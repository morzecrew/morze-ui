'use client'

import * as React from 'react'

import { cn } from '../lib/utils'
import { ChevronLeftIcon, ChevronRightIcon } from '../lib/icons'
import {
  addDays,
  addMonths,
  differenceInMonths,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  isWithin,
  isoWeek,
  localeWeekStart,
  monthGrid,
  startOfDay,
  startOfMonth,
} from '../lib/date'

/* -------------------------------------------------------------------------- */

export type DateRange = { from: Date | undefined; to?: Date | undefined }

/**
 * Which days a rule applies to. The shapes are the ones a form actually
 * expresses: one day, a list, a closed span, an open-ended bound, or a
 * predicate for everything else ("no weekends", "only in stock").
 */
export type DateMatcher =
  | Date
  | Date[]
  | { from: Date; to: Date }
  | { before?: Date; after?: Date }
  | ((date: Date) => boolean)

export type CalendarLabels = {
  previousMonth: string
  nextMonth: string
  month: string
  year: string
  weekNumber: string
}

const defaultLabels: CalendarLabels = {
  previousMonth: 'Previous month',
  nextMonth: 'Next month',
  month: 'Month',
  year: 'Year',
  weekNumber: 'Week',
}

function matches(date: Date, matcher: DateMatcher | undefined): boolean {
  if (!matcher) return false
  if (typeof matcher === 'function') return matcher(date)
  if (matcher instanceof Date) return isSameDay(date, matcher)
  if (Array.isArray(matcher)) return matcher.some((d) => isSameDay(date, d))
  if ('from' in matcher && matcher.from && matcher.to) return isWithin(date, matcher.from, matcher.to)
  const bounds = matcher as { before?: Date; after?: Date }
  if (bounds.before && isBefore(date, bounds.before)) return true
  if (bounds.after && isAfter(date, bounds.after)) return true
  return false
}

/* -------------------------------------------------------------------------- */

type CalendarBaseProps = {
  /** Controlled leading month. Pair with `onMonthChange`. */
  month?: Date
  defaultMonth?: Date
  onMonthChange?: (month: Date) => void
  /** How many months to draw side by side. */
  numberOfMonths?: number
  /** BCP 47 tag for month, weekday and day names. Defaults to the browser's. */
  locale?: string
  /** 0 (Sunday) to 6. Defaults to what the locale says. */
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6
  disabled?: DateMatcher
  /** Nothing before this day can be picked or paged to. */
  fromDate?: Date
  /** Nothing after this day can be picked or paged to. */
  toDate?: Date
  /** Draws the days that spill in from the neighbouring months. */
  showOutsideDays?: boolean
  showWeekNumbers?: boolean
  /** A static caption, or month and year as selects. */
  captionLayout?: 'label' | 'dropdown'
  /** Year range for the dropdown caption. Defaults to ±10 years. */
  fromYear?: number
  toYear?: number
  /** Which day gets the "today" ring. Injectable so tests are not clock-bound. */
  today?: Date
  labels?: Partial<CalendarLabels>
  className?: string
  id?: string
}

type SingleProps = {
  mode?: 'single'
  selected?: Date
  /** Clicking the selected day clears it, unless `required`. */
  onSelect?: (date: Date | undefined) => void
  required?: boolean
}

type MultipleProps = {
  mode: 'multiple'
  selected?: Date[]
  onSelect?: (dates: Date[]) => void
}

type RangeProps = {
  mode: 'range'
  selected?: DateRange
  onSelect?: (range: DateRange | undefined) => void
}

export type CalendarProps = CalendarBaseProps & (SingleProps | MultipleProps | RangeProps)

/* -------------------------------------------------------------------------- */

/**
 * A month grid, with no date library behind it.
 *
 * Names come from `Intl`, so a locale tag is the whole of the localisation
 * story — there is no bundle of month names to import and nothing to keep in
 * sync. Six week rows are always drawn, so paging does not resize the popover
 * the calendar usually sits in.
 *
 *   <Calendar mode="range" selected={range} onSelect={setRange} numberOfMonths={2} />
 */
function Calendar({
  month: monthProp,
  defaultMonth,
  onMonthChange,
  numberOfMonths = 1,
  locale,
  weekStartsOn,
  disabled,
  fromDate,
  toDate,
  showOutsideDays = true,
  showWeekNumbers = false,
  captionLayout = 'label',
  fromYear,
  toYear,
  today: todayProp,
  labels: labelsProp,
  className,
  id,
  ...selection
}: CalendarProps) {
  const labels = { ...defaultLabels, ...labelsProp }
  const today = React.useMemo(() => startOfDay(todayProp ?? new Date()), [todayProp])

  const firstDayOfWeek = weekStartsOn ?? localeWeekStart(locale)

  /* ------------------------------- month ------------------------------- */

  const initialMonth = React.useMemo(
    () => startOfMonth(monthProp ?? defaultMonth ?? selectedAnchor(selection) ?? today),
    // Only the mount value matters; afterwards the month is state or a prop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )
  const [monthState, setMonthState] = React.useState(initialMonth)
  const month = monthProp ? startOfMonth(monthProp) : monthState

  const goToMonth = React.useCallback(
    (next: Date) => {
      const clamped = clampMonth(next, fromDate, toDate)
      if (!monthProp) setMonthState(clamped)
      onMonthChange?.(clamped)
    },
    [fromDate, toDate, monthProp, onMonthChange]
  )

  const monthCount = Math.max(1, numberOfMonths)
  const months = React.useMemo(
    () => Array.from({ length: monthCount }, (_, i) => addMonths(month, i)),
    [month, monthCount]
  )
  // The run is never empty; naming its ends keeps that out of every index.
  const leadMonth = month
  const lastMonth = addMonths(month, monthCount - 1)

  const canGoBack = !fromDate || differenceInMonths(month, startOfMonth(fromDate)) > 0
  const canGoForward = !toDate || differenceInMonths(startOfMonth(toDate), lastMonth) > 0

  /* ------------------------------ disabling ----------------------------- */

  const isDisabled = React.useCallback(
    (date: Date) => {
      if (fromDate && isBefore(date, fromDate)) return true
      if (toDate && isAfter(date, toDate)) return true
      return matches(date, disabled)
    },
    [disabled, fromDate, toDate]
  )

  /* ------------------------------ selection ----------------------------- */

  const [previewDay, setPreviewDay] = React.useState<Date | undefined>()

  const handleSelect = (date: Date) => {
    if (isDisabled(date)) return

    if (selection.mode === 'multiple') {
      const current = selection.selected ?? []
      const next = current.some((d) => isSameDay(d, date))
        ? current.filter((d) => !isSameDay(d, date))
        : [...current, date]
      selection.onSelect?.(next)
      return
    }

    if (selection.mode === 'range') {
      const current = selection.selected
      // An open range completes; a complete one — or none — starts over. The
      // ends are ordered for you, so dragging backwards through the month
      // gives the same range as dragging forwards.
      if (current?.from && !current.to) {
        const [from, to] = isBefore(date, current.from) ? [date, current.from] : [current.from, date]
        selection.onSelect?.({ from, to })
        setPreviewDay(undefined)
      } else {
        selection.onSelect?.({ from: date, to: undefined })
      }
      return
    }

    const single = selection as SingleProps
    const isSame = isSameDay(single.selected, date)
    single.onSelect?.(isSame && !single.required ? undefined : date)
  }

  const selectionStateOf = (date: Date) => {
    if (selection.mode === 'multiple') {
      return { selected: (selection.selected ?? []).some((d) => isSameDay(d, date)) }
    }
    if (selection.mode === 'range') {
      const { from, to } = selection.selected ?? {}
      // While one end is open the hovered day stands in for the other, so the
      // span you are about to pick shows before you commit to it. That span is
      // tentative — `preview` is what keeps it from being painted as chosen.
      const tentative = Boolean(from && !to && previewDay)
      const other = to ?? (tentative ? previewDay : undefined)
      const [start, end] =
        from && other && isBefore(other, from) ? [other, from] : [from, other]

      const isStart = isSameDay(date, start)
      const isEnd = Boolean(end) && isSameDay(date, end)
      const inside =
        Boolean(start && end) && !isStart && !isEnd && isWithin(date, start!, end!)

      return {
        // Only a committed end reads as selected; the hovered one is a preview.
        selected: isSameDay(date, from) || isSameDay(date, to),
        rangeStart: isStart,
        rangeEnd: isEnd,
        rangeMiddle: inside,
        preview: tentative && (inside || ((isStart || isEnd) && !isSameDay(date, from))),
      }
    }
    return { selected: isSameDay((selection as SingleProps).selected, date) }
  }

  /* ------------------------------- focus -------------------------------- */

  const rootRef = React.useRef<HTMLDivElement>(null)
  const [focusedDay, setFocusedDay] = React.useState<Date | undefined>()

  // The roving tab stop: the focused day, else the selection, else today if it
  // is on screen, else the first day of the leading month. Exactly one day in
  // the whole calendar is tabbable, which is what makes Tab skip past it.
  const tabbableDay = React.useMemo(() => {
    const candidates = [focusedDay, selectedAnchor(selection), today].filter(Boolean) as Date[]
    const visible = candidates.find((d) => months.some((m) => isSameMonth(m, d)))
    return visible ?? startOfMonth(leadMonth)
  }, [focusedDay, selection, today, months, leadMonth])

  // Move the DOM focus only once the calendar already owns it — otherwise
  // rendering one inside a popover would rip focus away from the page.
  React.useEffect(() => {
    if (!focusedDay || !rootRef.current) return
    if (!rootRef.current.contains(document.activeElement)) return
    const target = rootRef.current.querySelector<HTMLButtonElement>(
      `[data-day="${dayKey(focusedDay)}"]`
    )
    target?.focus()
  }, [focusedDay, month])

  const moveFocus = (from: Date, delta: number) => {
    const next = addDays(from, delta)
    setFocusedDay(next)
    if (!months.some((m) => isSameMonth(m, next))) {
      // Paging forward scrolls the run by one month rather than jumping the
      // lead month to the new day, so a multi-month view keeps its context.
      goToMonth(isBefore(next, leadMonth) ? next : addMonths(next, -(monthCount - 1)))
    }
  }

  const onKeyDown = (event: React.KeyboardEvent, date: Date) => {
    const step: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
    }
    const delta = step[event.key]
    if (delta !== undefined) {
      event.preventDefault()
      moveFocus(date, delta)
      return
    }
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      const offset = (date.getDay() - firstDayOfWeek + 7) % 7
      moveFocus(date, event.key === 'Home' ? -offset : 6 - offset)
      return
    }
    if (event.key === 'PageUp' || event.key === 'PageDown') {
      event.preventDefault()
      const next = addMonths(date, event.key === 'PageUp' ? -1 : 1)
      setFocusedDay(next)
      goToMonth(next)
    }
  }

  /* ----------------------------- formatting ----------------------------- */

  const fmt = React.useMemo(
    () => ({
      caption: new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }),
      monthName: new Intl.DateTimeFormat(locale, { month: 'long' }),
      weekday: new Intl.DateTimeFormat(locale, { weekday: 'short' }),
      weekdayLong: new Intl.DateTimeFormat(locale, { weekday: 'long' }),
      day: new Intl.DateTimeFormat(locale, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    }),
    [locale]
  )

  const weekdays = React.useMemo(() => {
    // Any week works as a source of names; 2021-08-01 was a Sunday.
    const sunday = new Date(2021, 7, 1)
    return Array.from({ length: 7 }, (_, i) => addDays(sunday, (firstDayOfWeek + i) % 7))
  }, [firstDayOfWeek])

  const years = React.useMemo(() => {
    const start = fromYear ?? (fromDate ? fromDate.getFullYear() : today.getFullYear() - 10)
    const end = toYear ?? (toDate ? toDate.getFullYear() : today.getFullYear() + 10)
    return Array.from({ length: Math.max(1, end - start + 1) }, (_, i) => start + i)
  }, [fromYear, toYear, fromDate, toDate, today])

  /* ------------------------------- render ------------------------------- */

  return (
    <div
      ref={rootRef}
      id={id}
      data-slot="calendar"
      className={cn('mz-calendar', className)}
      onMouseLeave={() => setPreviewDay(undefined)}
    >
      <div className="mz-calendar__nav">
        <button
          type="button"
          data-slot="calendar-previous"
          className="mz-calendar__nav-button mz-focusable"
          aria-label={labels.previousMonth}
          disabled={!canGoBack}
          onClick={() => goToMonth(addMonths(month, -1))}
        >
          <ChevronLeftIcon />
        </button>
        <button
          type="button"
          data-slot="calendar-next"
          className="mz-calendar__nav-button mz-focusable"
          aria-label={labels.nextMonth}
          disabled={!canGoForward}
          onClick={() => goToMonth(addMonths(month, 1))}
        >
          <ChevronRightIcon />
        </button>
      </div>

      <div className="mz-calendar__months">
        {months.map((displayed, index) => (
          <div className="mz-calendar__month" key={displayed.getTime()}>
            {/* Only the leading month gets the selects: paging by dropdown moves
                the whole run, so a second pair would be two ways to say one
                thing — and they would disagree. */}
            {captionLayout === 'dropdown' && index === 0 ? (
              <div className="mz-calendar__caption mz-calendar__caption--dropdown">
                <select
                  className="mz-calendar__dropdown mz-focusable"
                  aria-label={labels.month}
                  value={displayed.getMonth()}
                  onChange={(e) =>
                    goToMonth(new Date(displayed.getFullYear(), Number(e.target.value), 1))
                  }
                >
                  {Array.from({ length: 12 }, (_, m) => (
                    <option key={m} value={m}>
                      {fmt.monthName.format(new Date(2021, m, 1))}
                    </option>
                  ))}
                </select>
                <select
                  className="mz-calendar__dropdown mz-focusable"
                  aria-label={labels.year}
                  value={displayed.getFullYear()}
                  onChange={(e) =>
                    goToMonth(new Date(Number(e.target.value), displayed.getMonth(), 1))
                  }
                >
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="mz-calendar__caption" aria-live="polite">
                {/* Wrapped, so the caption can be capitalised on its first
                    letter alone: `Intl` writes the month lowercase in a good
                    half of the world's locales, and `text-transform:
                    capitalize` on the flex row hit every word — Russian came
                    out "Сентябрь 2026 Г.". ::first-letter needs a block
                    container, which a flex row is not. */}
                <span className="mz-calendar__caption-text">
                  {fmt.caption.format(displayed)}
                </span>
              </div>
            )}

            <table className="mz-calendar__grid" role="grid">
              <thead>
                <tr className="mz-calendar__weekdays">
                  {showWeekNumbers ? (
                    <th scope="col" className="mz-calendar__weeknum-head">
                      <span className="mz-sr-only">{labels.weekNumber}</span>
                    </th>
                  ) : null}
                  {weekdays.map((d) => (
                    <th key={d.getDay()} scope="col" className="mz-calendar__weekday">
                      <span aria-hidden="true">{fmt.weekday.format(d)}</span>
                      <span className="mz-sr-only">{fmt.weekdayLong.format(d)}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {chunk(monthGrid(displayed, firstDayOfWeek), 7).map((week, weekIndex) => {
                  const weekStart = week[0]
                  return (
                  <tr key={weekStart ? weekStart.getTime() : weekIndex} className="mz-calendar__week">
                    {showWeekNumbers && weekStart ? (
                      <td className="mz-calendar__weeknum">{isoWeek(weekStart)}</td>
                    ) : null}
                    {week.map((date) => {
                      const outside = !isSameMonth(date, displayed)
                      const state = selectionStateOf(date)
                      const dayDisabled = isDisabled(date)

                      if (outside && !showOutsideDays) {
                        return <td key={date.getTime()} className="mz-calendar__cell" />
                      }

                      return (
                        <td key={date.getTime()} className="mz-calendar__cell" role="gridcell">
                          <button
                            type="button"
                            data-slot="calendar-day"
                            data-day={dayKey(date)}
                            data-outside={outside || undefined}
                            data-today={isSameDay(date, today) || undefined}
                            data-selected={state.selected || undefined}
                            data-range-start={state.rangeStart || undefined}
                            data-range-end={state.rangeEnd || undefined}
                            data-range-middle={state.rangeMiddle || undefined}
                            data-preview={state.preview || undefined}
                            data-disabled={dayDisabled || undefined}
                            className="mz-calendar__day mz-focusable"
                            tabIndex={isSameDay(date, tabbableDay) ? 0 : -1}
                            aria-selected={state.selected || undefined}
                            aria-label={fmt.day.format(date)}
                            // aria-disabled, not the attribute: a natively
                            // disabled button cannot take focus, so arrowing
                            // into an unavailable day would drop the roving tab
                            // stop and take the whole grid out of the tab order.
                            // Selection is refused in `handleSelect` instead.
                            aria-disabled={dayDisabled || undefined}
                            onClick={() => handleSelect(date)}
                            onFocus={() => setFocusedDay(date)}
                            onMouseEnter={() => setPreviewDay(date)}
                            onKeyDown={(e) => onKeyDown(e, date)}
                          >
                            {date.getDate()}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */

/** A stable per-day key for the focus lookup — local, so no timezone shift. */
function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

/** The day a calendar should open on, whatever the selection mode holds. */
function selectedAnchor(selection: SingleProps | MultipleProps | RangeProps): Date | undefined {
  if (selection.mode === 'multiple') return selection.selected?.[0]
  if (selection.mode === 'range') return selection.selected?.from
  return selection.selected
}

function clampMonth(month: Date, fromDate?: Date, toDate?: Date): Date {
  const m = startOfMonth(month)
  if (fromDate && differenceInMonths(m, startOfMonth(fromDate)) < 0) return startOfMonth(fromDate)
  if (toDate && differenceInMonths(m, startOfMonth(toDate)) > 0) return startOfMonth(toDate)
  return m
}

export { Calendar }
