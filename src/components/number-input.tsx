'use client'

import * as React from 'react'

import { cn, type Tone } from '../lib/utils'
import { ChevronDownIcon, ChevronUpIcon } from '../lib/icons'

/* --------------------------------------------------------------------------
   A number field (K-11).

   Not `<input type="number">`, which is the reason this exists at all: it
   scrolls its value away under the wheel, it refuses a comma where a comma is
   the decimal separator, it reports an empty string for anything it dislikes
   so the host cannot tell "0,5" from "", and its own spinners are the one
   piece of native chrome nothing can style. This is a text field that knows
   it holds a number: `inputMode="decimal"`, a spinbutton role, arrows and
   steppers, and one parser that takes both separators.
   -------------------------------------------------------------------------- */

export type NumberInputProps = Omit<
  React.ComponentProps<'input'>,
  'value' | 'defaultValue' | 'onChange' | 'type' | 'size'
> & {
  value?: number | null
  defaultValue?: number
  /** Fires on every accepted keystroke; `undefined` is an empty field. */
  onChange?: (value: number | undefined) => void
  min?: number
  max?: number
  /** What one arrow press or one stepper click is worth. Default 1. */
  step?: number
  /** Decimal places the value is rounded and printed to. */
  precision?: number
  /** A unit drawn inside the field, after the number: ₽, kg, %. */
  unit?: React.ReactNode
  /** The 34/40/48 scale the other fields run on. */
  inputSize?: 'sm' | 'md' | 'lg'
  tone?: Tone
  /** `false` drops the two steppers; the arrow keys still work. */
  steppers?: boolean
  labels?: { increase?: string; decrease?: string }
}

/** Both separators, because a Russian keyboard puts a comma where the dot is. */
function parse(text: string): number | undefined {
  const cleaned = text.replace(/\s/g, '').replace(',', '.')
  if (cleaned === '' || cleaned === '-' || cleaned === '.' || cleaned === '-.') return undefined
  const value = Number(cleaned)
  return Number.isFinite(value) ? value : undefined
}

const clamp = (value: number, min?: number, max?: number) =>
  Math.min(max ?? Number.POSITIVE_INFINITY, Math.max(min ?? Number.NEGATIVE_INFINITY, value))

const round = (value: number, precision?: number) =>
  precision === undefined ? value : Number(value.toFixed(precision))

function NumberInput({
  className,
  value: controlled,
  defaultValue,
  onChange,
  min,
  max,
  step = 1,
  precision,
  unit,
  inputSize = 'md',
  tone,
  steppers = true,
  labels,
  disabled,
  onKeyDown,
  onBlur,
  ...props
}: NumberInputProps) {
  const [internal, setInternal] = React.useState<number | undefined>(defaultValue)
  // `null` is how a controlled host spells "empty"; `undefined` is how this
  // component reports one, so the two meet here.
  const current = controlled === undefined ? internal : (controlled ?? undefined)
  /* What the reader is typing, which is not always a number yet: "-", "1." and
     "1," are all on the way to one, and re-printing the parsed value under the
     caret would delete the character they just typed. */
  const [draft, setDraft] = React.useState<string | null>(null)
  const text = draft ?? (current === undefined ? '' : String(round(current, precision)))

  const commit = (next: number | undefined) => {
    if (controlled === undefined) setInternal(next)
    onChange?.(next)
  }

  const nudge = (direction: 1 | -1) => {
    const from = current ?? 0
    const next = round(clamp(from + direction * step, min, max), precision ?? decimalsOf(step))
    setDraft(null)
    commit(next)
  }

  return (
    <div
      data-slot="number-input"
      data-size={inputSize}
      data-tone={tone}
      data-disabled={disabled || undefined}
      className={cn('mz-number', className)}
    >
      <input
        {...props}
        type="text"
        inputMode="decimal"
        // A spinbutton is what a screen reader announces with its bounds and
        // its current value; `type="number"` is not one of the reasons to use
        // `type="number"`.
        role="spinbutton"
        aria-valuenow={current}
        aria-valuemin={min}
        aria-valuemax={max}
        disabled={disabled}
        className={cn(
          'mz-input mz-number__input',
          inputSize === 'sm' && 'mz-input--sm',
          inputSize === 'lg' && 'mz-input--lg'
        )}
        value={text}
        onChange={(event) => {
          const raw = event.target.value
          setDraft(raw)
          const parsed = parse(raw)
          // An unparseable draft is not a change of value: the field says
          // "nothing yet" rather than reporting a number nobody typed.
          commit(parsed === undefined ? undefined : round(parsed, precision))
        }}
        onKeyDown={(event) => {
          onKeyDown?.(event)
          if (event.defaultPrevented) return
          const big = event.shiftKey ? 10 : 1
          if (event.key === 'ArrowUp') {
            event.preventDefault()
            for (let i = 0; i < big; i += 1) nudge(1)
          } else if (event.key === 'ArrowDown') {
            event.preventDefault()
            for (let i = 0; i < big; i += 1) nudge(-1)
          }
        }}
        onBlur={(event) => {
          onBlur?.(event)
          // Leaving the field is where a draft becomes a number: the bounds
          // are applied here rather than under the caret, where clamping "1"
          // on the way to "12" would fight the typing.
          setDraft(null)
          if (current === undefined) return
          const settled = round(clamp(current, min, max), precision)
          if (settled !== current) commit(settled)
        }}
      />
      {unit ? <span className="mz-number__unit">{unit}</span> : null}
      {steppers ? (
        <span className="mz-number__steppers">
          <button
            type="button"
            // Off the keyboard's path: the arrows already do this from inside
            // the field, and two more tab stops per number is a form nobody
            // can get out of.
            tabIndex={-1}
            className="mz-number__stepper"
            aria-label={labels?.increase ?? 'Increase'}
            disabled={disabled || (max !== undefined && (current ?? 0) >= max)}
            onClick={() => nudge(1)}
          >
            <ChevronUpIcon />
          </button>
          <button
            type="button"
            tabIndex={-1}
            className="mz-number__stepper"
            aria-label={labels?.decrease ?? 'Decrease'}
            disabled={disabled || (min !== undefined && (current ?? 0) <= min)}
            onClick={() => nudge(-1)}
          >
            <ChevronDownIcon />
          </button>
        </span>
      ) : null}
    </div>
  )
}

/** `step: 0.1` means one press lands on a tenth, not on 0.30000000000000004. */
function decimalsOf(step: number) {
  const text = String(step)
  const dot = text.indexOf('.')
  return dot < 0 ? 0 : text.length - dot - 1
}

export { NumberInput }
