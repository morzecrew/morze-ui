'use client'

import * as React from 'react'

import { cn, type Tone } from '../lib/utils'
import { CheckIcon } from '../lib/icons'
import { Skeleton } from './skeleton'
import { InfoTip } from './info-tip'

/* --------------------------------------------------------------------------
   Stat and StatGroup (N-01) — the row of figures over a list or a dashboard:
   a label, a number, a line under it. A stat can also be a filter ("Overdue
   7" narrows the list), and then it is selectable and says so with a check
   mark in its corner.

   Three things every host got wrong once, done here once:

   - A selectable tile is a button, and an `InfoTip` is a button too; one
     cannot sit inside the other. The tile's button is a transparent layer over
     the whole tile and the tip is lifted above it, so each takes its own
     clicks.
   - The check mark is the checkbox's look and nothing else. A real `Checkbox`
     is a button as well.
   - The group draws its hairlines as a 1px gap over the border colour, so a
     tile must be opaque. A selected tile's tint goes on a pseudo-element over
     that opaque face; a translucent face let the grey gap show through.
   -------------------------------------------------------------------------- */

type StatGroupProps = React.ComponentProps<'div'> & {
  /** Narrowest a tile gets before the row wraps; px. */
  minItemWidth?: number
}

function StatGroup({ className, style, minItemWidth = 160, ...props }: StatGroupProps) {
  return (
    <div
      role="group"
      data-slot="stat-group"
      className={cn('mz-stat-group', className)}
      style={{ ['--mz-stat-min' as string]: `${minItemWidth}px`, ...style }}
      {...props}
    />
  )
}

type StatProps = Omit<React.ComponentProps<'div'>, 'children'> & {
  label: React.ReactNode
  value: React.ReactNode
  /** Shown under the value, always. */
  hint?: React.ReactNode
  /** Behind an `InfoTip` beside the label. */
  info?: React.ReactNode
  /** Colours the value only; the face stays the same as its neighbours'. */
  tone?: Tone
  /** A skeleton instead of the value while it is counted. */
  loading?: boolean
  /** Makes the stat selectable: a toggle with a check mark. */
  onSelectedChange?: (selected: boolean) => void
  selected?: boolean
  /** Accessible name of the `InfoTip`; "More info: <label>" by default. */
  infoLabel?: string
}

function Stat({
  className,
  label,
  value,
  hint,
  info,
  tone,
  loading = false,
  selected = false,
  onSelectedChange,
  infoLabel,
  ...props
}: StatProps) {
  const selectable = !!onSelectedChange
  const labelText = typeof label === 'string' ? label : undefined
  const id = React.useId()
  const labelId = `${id}-label`
  const valueId = `${id}-value`

  return (
    <div
      data-slot="stat"
      data-selectable={selectable || undefined}
      data-selected={(selectable && selected) || undefined}
      className={cn('mz-stat', className)}
      {...props}
    >
      {selectable ? (
        <button
          type="button"
          className="mz-stat__toggle mz-focusable"
          aria-pressed={selected}
          // Named by the label and the figure drawn under it rather than by a
          // string put together here, which could only be built from a
          // string label and left a tile labelled with a node — an icon and
          // a word, a translated <Trans> — a button with no name at all.
          // While the figure is counted it is a skeleton with no text, so the
          // name is the label alone.
          aria-labelledby={`${labelId} ${valueId}`}
          onClick={() => onSelectedChange(!selected)}
        />
      ) : null}
      {selectable ? (
        <span aria-hidden="true" className="mz-checkbox mz-checkbox--sm mz-stat__check" data-state={selected ? 'checked' : 'unchecked'}>
          {selected ? (
            <span className="mz-checkbox__indicator">
              <CheckIcon />
            </span>
          ) : null}
        </span>
      ) : null}
      <span className="mz-stat__label">
        <span id={labelId} className="mz-stat__label-text">
          {label}
        </span>
        {info ? (
          <span className="mz-stat__info">
            <InfoTip size="sm" label={infoLabel} about={labelText}>
              {info}
            </InfoTip>
          </span>
        ) : null}
      </span>
      <span id={valueId} className="mz-stat__value" data-tone={tone}>
        {loading ? <Skeleton className="mz-stat__skeleton" /> : value}
      </span>
      {hint ? <span className="mz-stat__hint">{hint}</span> : null}
    </div>
  )
}

export { Stat, StatGroup }
export type { StatProps, StatGroupProps }
