'use client'

import * as React from 'react'

import { cn, type Tone } from '../lib/utils'
import { ChevronDownIcon, ChevronUpIcon } from '../lib/icons'
import { defaultCommonLabels } from '../locales/defaults'
import { useLocaleLabels, useLocaleTag } from './locale-provider'

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
  /**
   * Thousands grouped the locale's way in the shown value — «1 200 000» for
   * ru-RU — while typing and after; the value stays a number. `false` for
   * codes, years and anything else that is a number only by accident.
   */
  grouping?: boolean
  /** BCP 47 tag for the grouping and the decimal sign; `MorzeLocaleProvider`'s by default. */
  locale?: string
  /**
   * Called when the typed value crosses `min` or `max`, and when it comes
   * back: `'min'` / `'max'` while it is outside, `false` once it is not. The
   * field marks itself `aria-invalid` meanwhile; it is clamped when left.
   */
  onRangeChange?: (outOfRange: 'min' | 'max' | false) => void
}

type Separators = { group: string; decimal: string; editing: string }

function separatorsOf(locale: string | undefined): Separators {
  const parts = new Intl.NumberFormat(locale).formatToParts(12345.6)
  const group = parts.find((part) => part.type === 'group')?.value ?? ''
  return {
    group,
    decimal: parts.find((part) => part.type === 'decimal')?.value ?? '.',
    // While the field is being edited, groups are drawn with a space: the
    // locale's own where it is one (ru-RU), a narrow no-break space where the
    // locale groups with a comma or a dot. A comma under the caret would
    // otherwise be either a group or a decimal sign, and «1,2345» on the way
    // from «1,234» would read as one and a quarter.
    editing: /\s/.test(group) ? group : '\u202f',
  }
}

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Whitespace out, and the locale's group sign too — but only from text that
 * is actually grouped. Read every comma as grouping and an English browser in
 * a Russian app turns «1,5» into 15: a money field off by a factor of ten.
 * «1,200,000» is grouped; «1,5» is a decimal in any locale.
 */
function ungroup(text: string, { group }: Separators): string {
  const stripped = text.replace(/\s/g, '')
  if (!group || /\s/.test(group)) return stripped
  const grouped = new RegExp(`^-?\\d{1,3}(${escape(group)}\\d{3})+([.,]\\d*)?$`)
  return grouped.test(stripped) ? stripped.split(group).join('') : stripped
}

/** Both decimal signs, because a Russian keyboard puts a comma where the dot is. */
function parse(text: string, separators: Separators): number | undefined {
  const cleaned = ungroup(text, separators).replace(',', '.')
  if (cleaned === '' || cleaned === '-' || cleaned === '.' || cleaned === '-.') return undefined
  const value = Number(cleaned)
  return Number.isFinite(value) ? value : undefined
}

/**
 * The text as typed, with the integer digits regrouped for editing: the sign,
 * a trailing decimal sign and a fraction half typed all stay. Text that is not
 * a number on its way (a lone "-", letters) is left exactly as it is.
 */
function regroup(text: string, separators: Separators): string {
  const match = /^(-?)(\d*)([.,]?)(\d*)$/.exec(ungroup(text, separators))
  if (!match) return text
  const [, sign, integer, point, fraction] = match
  const grouped = integer!.replace(/\B(?=(\d{3})+(?!\d))/g, separators.editing)
  return sign! + grouped + (point ? separators.decimal : '') + fraction!
}

/** Characters that carry the value — digits, the sign, a decimal sign. */
const significant = (text: string) => text.replace(/[^\d.,-]/g, '').length

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
  grouping = true,
  locale: localeProp,
  onRangeChange,
  disabled,
  onKeyDown,
  onBlur,
  ...props
}: NumberInputProps) {
  const common = useLocaleLabels('common', defaultCommonLabels)
  const [internal, setInternal] = React.useState<number | undefined>(defaultValue)
  // `null` is how a controlled host spells "empty"; `undefined` is how this
  // component reports one, so the two meet here.
  const current = controlled === undefined ? internal : (controlled ?? undefined)
  /* What the reader is typing, which is not always a number yet: "-", "1." and
     "1," are all on the way to one, and re-printing the parsed value under the
     caret would delete the character they just typed. */
  const [draft, setDraft] = React.useState<string | null>(null)
  const locale = useLocaleTag(localeProp)
  const separators = React.useMemo(() => separatorsOf(locale), [locale])
  const shown = (value: number) =>
    grouping
      ? new Intl.NumberFormat(locale, {
          useGrouping: true,
          minimumFractionDigits: precision ?? 0,
          maximumFractionDigits: precision ?? 20,
        }).format(value)
      : String(round(value, precision))
  const text = draft ?? (current === undefined ? '' : shown(round(current, precision)))

  // Regrouping moves the caret's index: put it back after the same number of
  // significant characters it followed before the separators were redrawn.
  const inputRef = React.useRef<HTMLInputElement | null>(null)
  const caret = React.useRef<number | null>(null)
  React.useLayoutEffect(() => {
    const input = inputRef.current
    if (caret.current === null || !input || document.activeElement !== input) return
    let seen = 0
    let at = 0
    while (at < text.length && seen < caret.current) {
      if (/[\d.,-]/.test(text[at]!)) seen += 1
      at += 1
    }
    caret.current = null
    input.setSelectionRange(at, at)
  }, [text])

  // Outside the bounds while typing: the field says so at once, and the host
  // hears about it, rather than learning on blur that the value was clamped.
  const outOfRange: 'min' | 'max' | false =
    current === undefined
      ? false
      : min !== undefined && current < min
        ? 'min'
        : max !== undefined && current > max
          ? 'max'
          : false
  const onRangeChangeRef = React.useRef(onRangeChange)
  onRangeChangeRef.current = onRangeChange
  const reported = React.useRef<'min' | 'max' | false>(false)
  React.useEffect(() => {
    if (reported.current === outOfRange) return
    reported.current = outOfRange
    onRangeChangeRef.current?.(outOfRange)
  }, [outOfRange])

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
        ref={(node) => {
          inputRef.current = node
          const ref = props.ref
          if (typeof ref === 'function') return ref(node)
          if (ref) ref.current = node
        }}
        aria-invalid={props['aria-invalid'] ?? (outOfRange ? true : undefined)}
        data-out-of-range={outOfRange || undefined}
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
          if (grouping) {
            const position = event.target.selectionStart ?? raw.length
            caret.current = significant(raw.slice(0, position))
            setDraft(regroup(raw, separators))
          } else {
            setDraft(raw)
          }
          const parsed = parse(raw, separators)
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
        onFocus={(event) => {
          props.onFocus?.(event)
          // Into the editing form: spaces between the groups, so nothing the
          // reader types next can be mistaken for one.
          if (grouping && current !== undefined && draft === null) {
            setDraft(regroup(String(round(current, precision)), separators))
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
            aria-label={labels?.increase ?? common.increase}
            disabled={disabled || (max !== undefined && (current ?? 0) >= max)}
            onClick={() => nudge(1)}
          >
            <ChevronUpIcon />
          </button>
          <button
            type="button"
            tabIndex={-1}
            className="mz-number__stepper"
            aria-label={labels?.decrease ?? common.decrease}
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
