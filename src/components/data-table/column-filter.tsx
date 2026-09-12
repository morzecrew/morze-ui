'use client'

import * as React from 'react'

import { cn } from '../../lib/utils'
import { FilterIcon } from '../../lib/icons'
import { Button } from '../button'
import { Checkbox } from '../checkbox'
import { Input } from '../input'
import { Label } from '../label'
import { Popover, PopoverContent, PopoverTrigger } from '../popover'
import { RadioGroup, RadioGroupItem } from '../radio-group'
import { Toggle } from '../toggle'
import { Calendar } from '../calendar'
import { fromISODate, toISODate } from '../../lib/date'
import { defaultDataTableLabels, resolveLabels, type DataTableLabels } from './labels'
import type { ColumnFilterDef, FilterValue, TextFilterOp } from './types'
import { isFilterActive } from './utils'

type Props = {
  columnLabel: string
  def: ColumnFilterDef
  value: FilterValue | undefined
  onApply: (value: FilterValue | undefined) => void
  labels?: Partial<DataTableLabels>
  /** Month, weekday and number names in the date filter's calendar. */
  locale?: string
}

/**
 * Filters are staged locally and committed on Apply. On server-driven data an
 * immediate commit would fire a request per keystroke.
 */
export function ColumnFilter({
  columnLabel,
  def,
  value,
  onApply,
  labels: labelsProp,
  locale,
}: Props) {
  const labels = resolveLabels(labelsProp)
  const [open, setOpen] = React.useState(false)
  const [draft, setDraft] = React.useState<FilterValue | undefined>(value)

  React.useEffect(() => {
    if (open) setDraft(value)
  }, [open, value])

  const active = isFilterActive(value)

  const commit = (next: FilterValue | undefined) => {
    onApply(isFilterActive(next) ? next : undefined)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-slot="data-table-filter-trigger"
          data-active={active || undefined}
          className="mz-dt__filter mz-focusable"
          aria-label={`${labels.filterFor(columnLabel)}${active ? ` (${labels.filterActive})` : ''}`}
          title={labels.filterFor(columnLabel)}
        >
          <FilterIcon />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className={cn(
          'mz-dt__filter-panel',
          // A month grid does not fit the 15rem a filter panel runs at.
          def.type === 'date-range' && 'mz-dt__filter-panel--wide'
        )}
      >
        <div className="mz-dt__filter-head">{columnLabel}</div>
        <div className="mz-dt__filter-body">
          <FilterBody
            def={def}
            draft={draft}
            setDraft={setDraft}
            labels={labels}
            locale={locale}
            onSubmit={() => commit(draft)}
            onCommit={commit}
          />
        </div>
        {def.type === 'custom' && def.actions === false ? null : (
          <div className="mz-dt__filter-actions">
            <Button type="button" size="sm" variant="ghost" onClick={() => commit(undefined)}>
              {labels.reset}
            </Button>
            <Button type="button" size="sm" onClick={() => commit(draft)}>
              {labels.apply}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

const OP_LABEL: Record<TextFilterOp, keyof DataTableLabels> = {
  contains: 'opContains',
  equals: 'opEquals',
  startsWith: 'opStartsWith',
}

function FilterBody({
  def,
  draft,
  setDraft,
  labels,
  locale,
  onSubmit,
  onCommit,
}: {
  def: ColumnFilterDef
  draft: FilterValue | undefined
  setDraft: (value: FilterValue | undefined) => void
  labels: DataTableLabels
  locale?: string
  onSubmit: () => void
  onCommit: (value: FilterValue | undefined) => void
}) {
  // The date fields carry labels, so they need ids — generated, not fixed:
  // two tables on one page used to share `mz-dt-from`, and a label then
  // pointed at whichever input came first in the document.
  const id = React.useId()
  // Narrows the option list only; it never leaves the popover, so it is not
  // part of the draft and clearing it cannot change what is selected.
  const [optionQuery, setOptionQuery] = React.useState('')
  const submitOnEnter = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      onSubmit()
    }
  }

  if (def.type === 'text') {
    const current = draft?.type === 'text' ? draft : undefined
    // One operator is not a choice, so the row appears from two. The first
    // listed is the default, which keeps `contains` the default for the
    // columns that declare nothing.
    const ops = def.ops && def.ops.length > 1 ? def.ops : undefined
    const op = current?.op ?? ops?.[0]
    const patch = (part: { value?: string; op?: TextFilterOp }) =>
      setDraft({ type: 'text', value: current?.value ?? '', op, ...part })
    return (
      <div className="mz-dt__filter-stack">
        {ops ? (
          <div className="mz-dt__filter-ops" role="group" aria-label={labels.filter}>
            {ops.map((candidate) => (
              <Toggle
                key={candidate}
                size="xs"
                pressed={op === candidate}
                onPressedChange={() => patch({ op: candidate })}
              >
                {labels[OP_LABEL[candidate]] as string}
              </Toggle>
            ))}
          </div>
        ) : null}
        <Input
          autoFocus
          inputSize="sm"
          placeholder={def.placeholder ?? labels.contains}
          value={current?.value ?? ''}
          onKeyDown={submitOnEnter}
          onChange={(e) => patch({ value: e.target.value })}
        />
      </div>
    )
  }

  if (def.type === 'select') {
    const current = draft?.type === 'select' ? draft.value : []
    const single = def.multiple === false
    // Multi-select only; the single-choice list is a RadioGroup below and
    // drives itself through onValueChange.
    const toggle = (option: string) =>
      setDraft({
        type: 'select',
        value: current.includes(option)
          ? current.filter((v) => v !== option)
          : [...current, option],
      })
    const needle = optionQuery.trim().toLocaleLowerCase()
    const shown = needle
      ? def.options.filter((option) => option.label.toLocaleLowerCase().includes(needle))
      : def.options

    const list = single ? (
      // A single-choice filter is a radio group, not a column of checkboxes
      // that happen to behave like one: the boxes promised a multi-select the
      // control never had, and keyboard users got no arrow-key roving either.
      <RadioGroup
        className="mz-dt__filter-options"
        value={current[0] ?? ''}
        onValueChange={(next) => setDraft({ type: 'select', value: next ? [next] : [] })}
      >
        {shown.map((option) => (
          <label key={option.value} className="mz-dt__filter-option">
            <RadioGroupItem size="sm" value={option.value} />
            <span>{option.label}</span>
          </label>
        ))}
      </RadioGroup>
    ) : (
      <div className="mz-dt__filter-options" role="group">
        {shown.map((option) => (
          <label key={option.value} className="mz-dt__filter-option">
            <Checkbox
              size="sm"
              checked={current.includes(option.value)}
              onCheckedChange={() => toggle(option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    )

    return (
      <div className="mz-dt__filter-stack">
        {def.searchable ? (
          <Input
            autoFocus
            inputSize="sm"
            type="search"
            placeholder={labels.searchOptions}
            value={optionQuery}
            onKeyDown={submitOnEnter}
            onChange={(e) => setOptionQuery(e.target.value)}
          />
        ) : null}
        {/* Select-all is meaningless on a single-choice filter, and on a
            searched list it means "all of what is on screen" — which is what
            a reader who has just typed a word expects it to mean. */}
        {!single && shown.length > 1 ? (
          <div className="mz-dt__filter-toolbar">
            <Button
              type="button"
              size="xs"
              variant="link"
              onClick={() =>
                setDraft({
                  type: 'select',
                  value: [...new Set([...current, ...shown.map((o) => o.value)])],
                })
              }
            >
              {labels.selectAllOptions}
            </Button>
            <Button
              type="button"
              size="xs"
              variant="link"
              onClick={() => setDraft({ type: 'select', value: [] })}
            >
              {labels.clearAllOptions}
            </Button>
          </div>
        ) : null}
        {shown.length === 0 ? <p className="mz-dt__filter-empty">{labels.noOptions}</p> : list}
      </div>
    )
  }

  if (def.type === 'number-range') {
    const current = draft?.type === 'number-range' ? draft : { type: 'number-range' as const }
    const patch = (part: { min?: number; max?: number }) =>
      setDraft({ type: 'number-range', min: current.min, max: current.max, ...part })
    // The unit rides beside each field rather than over the pair: it belongs
    // to the number, and it is also what the chip prints.
    const unit = def.unit ? <span className="mz-dt__filter-unit">{def.unit}</span> : null
    return (
      <div className="mz-dt__filter-range">
        <span className="mz-dt__filter-field">
          <Input
            autoFocus
            inputSize="sm"
            type="number"
            step={def.step}
            placeholder={labels.rangeFrom}
            value={current.min ?? ''}
            onKeyDown={submitOnEnter}
            onChange={(e) => patch({ min: e.target.value === '' ? undefined : Number(e.target.value) })}
          />
          {unit}
        </span>
        <span className="mz-dt__filter-dash">—</span>
        <span className="mz-dt__filter-field">
          <Input
            inputSize="sm"
            type="number"
            step={def.step}
            placeholder={labels.rangeTo}
            value={current.max ?? ''}
            onKeyDown={submitOnEnter}
            onChange={(e) => patch({ max: e.target.value === '' ? undefined : Number(e.target.value) })}
          />
          {unit}
        </span>
      </div>
    )
  }

  if (def.type === 'date-range') {
    const current = draft?.type === 'date-range' ? draft : { type: 'date-range' as const }
    const patch = (part: { from?: string; to?: string }) =>
      setDraft({ type: 'date-range', from: current.from, to: current.to, ...part })
    return (
      <div className="mz-dt__filter-stack">
        {/* Named spans: "this month", "last quarter". A reader reaching for
            one of those otherwise types two dates to express a period the
            host already knows the bounds of. */}
        {def.presets?.length ? (
          <div className="mz-dt__filter-presets">
            {def.presets.map((preset) => (
              <Button
                key={preset.label}
                type="button"
                size="xs"
                variant="secondary"
                onClick={() => onCommit({ type: 'date-range', from: preset.from, to: preset.to })}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        ) : null}
        {/* The two fields stay: a date eighteen months back is four words to
            type and a dozen clicks to page to. What they no longer are is the
            whole control — the kit's own month grid is beside them, so the
            usual case is a locale-correct calendar rather than the browser's. */}
        <div className="mz-dt__filter-range mz-dt__filter-range--stacked">
          <Label htmlFor={`${id}-from`}>{labels.dateFrom}</Label>
          <Input
            id={`${id}-from`}
            inputSize="sm"
            type="date"
            value={current.from ?? ''}
            onKeyDown={submitOnEnter}
            onChange={(e) => patch({ from: e.target.value || undefined })}
          />
          <Label htmlFor={`${id}-to`}>{labels.dateTo}</Label>
          <Input
            id={`${id}-to`}
            inputSize="sm"
            type="date"
            value={current.to ?? ''}
            onKeyDown={submitOnEnter}
            onChange={(e) => patch({ to: e.target.value || undefined })}
          />
        </div>
        <Calendar
          mode="range"
          locale={locale}
          // The range travels as `YYYY-MM-DD` because that is what the fields
          // above and the backend below both speak; the grid works in Dates.
          selected={{ from: fromISODate(current.from), to: fromISODate(current.to) }}
          onSelect={(range) =>
            setDraft({
              type: 'date-range',
              from: range?.from ? toISODate(range.from) : undefined,
              to: range?.to ? toISODate(range.to) : undefined,
            })
          }
        />
      </div>
    )
  }

  if (def.type === 'custom') {
    const staged = draft?.type === 'custom' ? draft : undefined
    // An undefined value is how a widget says "no constraint", so it maps to a
    // cleared filter rather than to an empty custom value.
    const wrap = (value: unknown, label?: string): FilterValue | undefined =>
      value === undefined ? undefined : { type: 'custom', value, label }
    return (
      <>
        {def.render({
          value: staged?.value,
          label: staged?.label,
          onChange: (value, label) => setDraft(wrap(value, label)),
          commit: (value, label) => onCommit(wrap(value, label)),
          labels,
        })}
      </>
    )
  }

  // Yes/no is one choice out of two, so it is a radio group. It used to be
  // two checkboxes inside role="radiogroup" — the markup said one thing and
  // the controls another, and neither could be reached with an arrow key.
  const current = draft?.type === 'boolean' ? draft.value : undefined
  return (
    <RadioGroup
      className="mz-dt__filter-options"
      value={current === undefined ? '' : String(current)}
      onValueChange={(next) => setDraft({ type: 'boolean', value: next === 'true' })}
    >
      {[
        { value: true, label: def.trueLabel ?? labels.yes },
        { value: false, label: def.falseLabel ?? labels.no },
      ].map((option) => (
        <label key={String(option.value)} className="mz-dt__filter-option">
          <RadioGroupItem size="sm" value={String(option.value)} />
          <span>{option.label}</span>
        </label>
      ))}
    </RadioGroup>
  )
}

export function FilterChip({
  label,
  onClear,
  clearLabel = defaultDataTableLabels.clearFilter,
  className,
}: {
  label: React.ReactNode
  onClear: () => void
  clearLabel?: string
  className?: string
}) {
  return (
    <span className={cn('mz-dt__chip', className)}>
      <span>{label}</span>
      <button type="button" onClick={onClear} aria-label={clearLabel} className="mz-focusable">
        ×
      </button>
    </span>
  )
}
