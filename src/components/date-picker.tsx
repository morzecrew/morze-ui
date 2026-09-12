'use client'

import * as React from 'react'

import { cn, type Tone } from '../lib/utils'
import { CalendarIcon, XIcon } from '../lib/icons'
import { toISODate } from '../lib/date'
import { Calendar, type CalendarProps, type DateMatcher, type DateRange } from './calendar'
import { Popover, PopoverContent, PopoverTrigger } from './popover'

/* --------------------------------------------------------------------------
   A field that opens a Calendar. The kit shipped the grid and left every host
   to wire its own trigger, formatting, clear button and popover around it —
   which is how the table's own date filter ended up on a native
   `<input type="date">`, with the browser's look and the browser's locale
   inside a kit that owns both.
   -------------------------------------------------------------------------- */

export type DatePickerLabels = {
  placeholder: string
  clear: string
  open: string
}

const defaultLabels: DatePickerLabels = {
  placeholder: 'Pick a date',
  clear: 'Clear',
  open: 'Open the calendar',
}

/** Everything the trigger and the popover share, whatever is being picked. */
type FieldProps = Pick<
  CalendarProps,
  | 'locale'
  | 'weekStartsOn'
  | 'fromDate'
  | 'toDate'
  | 'showOutsideDays'
  | 'showWeekNumbers'
  | 'captionLayout'
  | 'fromYear'
  | 'toYear'
  | 'today'
> & {
  disabled?: boolean
  /** Days that cannot be picked — a matcher, like the Calendar's own. */
  disabledDates?: DateMatcher
  /** The 34/40/48 scale the other fields run on. */
  size?: 'sm' | 'md' | 'lg'
  tone?: Tone
  /** `false` drops the × that empties the field. */
  clearable?: boolean
  labels?: Partial<DatePickerLabels>
  placeholder?: string
  id?: string
  name?: string
  className?: string
  /** Width of the popover's calendar in months. */
  numberOfMonths?: number
}

function Field({
  open,
  setOpen,
  size = 'md',
  tone,
  disabled,
  clearable = true,
  filled,
  text,
  labels,
  placeholder,
  id,
  className,
  onClear,
  children,
}: {
  open: boolean
  setOpen: (open: boolean) => void
  size?: 'sm' | 'md' | 'lg'
  tone?: Tone
  disabled?: boolean
  clearable?: boolean
  filled: boolean
  text: string
  labels: DatePickerLabels
  placeholder: string
  id?: string
  className?: string
  onClear: () => void
  children: React.ReactNode
}) {
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div data-slot="date-field" data-tone={tone} className={cn('mz-datefield', className)}>
        <PopoverTrigger asChild>
          <button
            type="button"
            id={id}
            disabled={disabled}
            data-size={size}
            data-placeholder={filled ? undefined : true}
            aria-label={labels.open}
            className={cn(
              'mz-select-trigger mz-datefield__trigger',
              size === 'sm' && 'mz-select-trigger--sm',
              size === 'lg' && 'mz-select-trigger--lg'
            )}
          >
            <CalendarIcon className="mz-datefield__icon" />
            <span className="mz-datefield__value">{filled ? text : placeholder}</span>
          </button>
        </PopoverTrigger>
        {/* Outside the trigger, not inside it: a button cannot contain a
            button, and nesting one makes the clear click open the popover. */}
        {clearable && filled && !disabled ? (
          <button
            type="button"
            className="mz-datefield__clear mz-focusable"
            aria-label={labels.clear}
            title={labels.clear}
            onClick={onClear}
          >
            <XIcon />
          </button>
        ) : null}
      </div>
      <PopoverContent align="start" className="mz-datefield__panel">
        {children}
      </PopoverContent>
    </Popover>
  )
}

export type DatePickerProps = FieldProps & {
  value?: Date
  defaultValue?: Date
  onChange?: (date: Date | undefined) => void
  /** How the chosen day is written in the field. Defaults to the locale's. */
  format?: (date: Date) => string
}

function DatePicker({
  value: controlled,
  defaultValue,
  onChange,
  format,
  locale,
  disabledDates,
  numberOfMonths = 1,
  labels: labelsProp,
  placeholder,
  name,
  ...field
}: DatePickerProps) {
  const labels = { ...defaultLabels, ...labelsProp }
  const [open, setOpen] = React.useState(false)
  const [internal, setInternal] = React.useState<Date | undefined>(defaultValue)
  const value = controlled ?? internal

  const commit = (next: Date | undefined) => {
    if (controlled === undefined) setInternal(next)
    onChange?.(next)
  }

  const text = value ? (format ? format(value) : value.toLocaleDateString(locale)) : ''

  return (
    <>
      <Field
        {...field}
        open={open}
        setOpen={setOpen}
        filled={Boolean(value)}
        text={text}
        labels={labels}
        placeholder={placeholder ?? labels.placeholder}
        onClear={() => commit(undefined)}
      >
        <Calendar
          mode="single"
          selected={value}
          locale={locale}
          disabled={disabledDates}
          numberOfMonths={numberOfMonths}
          weekStartsOn={field.weekStartsOn}
          fromDate={field.fromDate}
          toDate={field.toDate}
          showOutsideDays={field.showOutsideDays}
          showWeekNumbers={field.showWeekNumbers}
          captionLayout={field.captionLayout}
          fromYear={field.fromYear}
          toYear={field.toYear}
          today={field.today}
          onSelect={(next) => {
            commit(next)
            // A single day is the whole answer, so the popover has nothing
            // left to ask; a range stays open for its second end.
            if (next) setOpen(false)
          }}
        />
      </Field>
      {/* The value a surrounding <form> submits — the trigger is a button and
          carries none. ISO, because that is what a backend reads. */}
      {name ? <input type="hidden" name={name} value={value ? toISODate(value) : ''} /> : null}
    </>
  )
}

/** A named span the range field offers as one click. */
export type DateRangePreset = { label: string; range: DateRange }

export type DateRangePickerProps = FieldProps & {
  value?: DateRange
  defaultValue?: DateRange
  onChange?: (range: DateRange | undefined) => void
  format?: (date: Date) => string
  presets?: DateRangePreset[]
  /** Separator between the two ends in the field. */
  separator?: string
}

function DateRangePicker({
  value: controlled,
  defaultValue,
  onChange,
  format,
  presets,
  separator = ' – ',
  locale,
  disabledDates,
  numberOfMonths = 2,
  labels: labelsProp,
  placeholder,
  name,
  ...field
}: DateRangePickerProps) {
  const labels = { ...defaultLabels, ...labelsProp }
  const [open, setOpen] = React.useState(false)
  const [internal, setInternal] = React.useState<DateRange | undefined>(defaultValue)
  const value = controlled ?? internal

  const commit = (next: DateRange | undefined) => {
    if (controlled === undefined) setInternal(next)
    onChange?.(next)
  }

  const write = (date: Date) => (format ? format(date) : date.toLocaleDateString(locale))
  const text = value?.from
    ? `${write(value.from)}${value.to ? `${separator}${write(value.to)}` : ''}`
    : ''

  return (
    <>
      <Field
        {...field}
        open={open}
        setOpen={setOpen}
        filled={Boolean(value?.from)}
        text={text}
        labels={labels}
        placeholder={placeholder ?? labels.placeholder}
        onClear={() => commit(undefined)}
      >
        {presets?.length ? (
          <div className="mz-datefield__presets">
            {presets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                className="mz-datefield__preset mz-focusable"
                onClick={() => {
                  commit(preset.range)
                  setOpen(false)
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>
        ) : null}
        <Calendar
          mode="range"
          selected={value}
          locale={locale}
          disabled={disabledDates}
          numberOfMonths={numberOfMonths}
          weekStartsOn={field.weekStartsOn}
          fromDate={field.fromDate}
          toDate={field.toDate}
          showOutsideDays={field.showOutsideDays}
          showWeekNumbers={field.showWeekNumbers}
          captionLayout={field.captionLayout}
          fromYear={field.fromYear}
          toYear={field.toYear}
          today={field.today}
          onSelect={(next) => {
            commit(next)
            // Closed on the second end only: closing on the first would take
            // the calendar away mid-range.
            if (next?.from && next.to) setOpen(false)
          }}
        />
      </Field>
      {name ? (
        <>
          <input type="hidden" name={`${name}From`} value={value?.from ? toISODate(value.from) : ''} />
          <input type="hidden" name={`${name}To`} value={value?.to ? toISODate(value.to) : ''} />
        </>
      ) : null}
    </>
  )
}

export { DatePicker, DateRangePicker }
