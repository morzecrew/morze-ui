'use client'

import * as React from 'react'

import { cn } from '../../lib/utils'
import { FilterIcon } from '../../lib/icons'
import { Button } from '../button'
import { Checkbox } from '../checkbox'
import { Input } from '../input'
import { Label } from '../label'
import { Popover, PopoverContent, PopoverTrigger } from '../popover'
import { defaultDataTableLabels, resolveLabels, type DataTableLabels } from './labels'
import type { ColumnFilterDef, FilterValue } from './types'
import { isFilterActive } from './utils'

type Props = {
  columnLabel: string
  def: ColumnFilterDef
  value: FilterValue | undefined
  onApply: (value: FilterValue | undefined) => void
  labels?: Partial<DataTableLabels>
}

/**
 * Filters are staged locally and committed on Apply. On server-driven data an
 * immediate commit would fire a request per keystroke.
 */
export function ColumnFilter({ columnLabel, def, value, onApply, labels: labelsProp }: Props) {
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
      <PopoverContent align="start" className="mz-dt__filter-panel">
        <div className="mz-dt__filter-head">{columnLabel}</div>
        <div className="mz-dt__filter-body">
          <FilterBody
            def={def}
            draft={draft}
            setDraft={setDraft}
            labels={labels}
            onSubmit={() => commit(draft)}
            onCommit={commit}
          />
        </div>
        {def.type === 'custom' && def.actions === false ? null : (
          <div className="mz-dt__filter-actions">
            <Button size="sm" variant="ghost" onClick={() => commit(undefined)}>
              {labels.reset}
            </Button>
            <Button size="sm" onClick={() => commit(draft)}>
              {labels.apply}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

function FilterBody({
  def,
  draft,
  setDraft,
  labels,
  onSubmit,
  onCommit,
}: {
  def: ColumnFilterDef
  draft: FilterValue | undefined
  setDraft: (value: FilterValue | undefined) => void
  labels: DataTableLabels
  onSubmit: () => void
  onCommit: (value: FilterValue | undefined) => void
}) {
  const submitOnEnter = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      onSubmit()
    }
  }

  if (def.type === 'text') {
    const current = draft?.type === 'text' ? draft.value : ''
    return (
      <Input
        autoFocus
        inputSize="sm"
        placeholder={def.placeholder ?? labels.contains}
        value={current}
        onKeyDown={submitOnEnter}
        onChange={(e) => setDraft({ type: 'text', value: e.target.value })}
      />
    )
  }

  if (def.type === 'select') {
    const current = draft?.type === 'select' ? draft.value : []
    const toggle = (option: string) => {
      if (def.multiple === false) {
        setDraft({ type: 'select', value: current.includes(option) ? [] : [option] })
        return
      }
      setDraft({
        type: 'select',
        value: current.includes(option)
          ? current.filter((v) => v !== option)
          : [...current, option],
      })
    }
    return (
      <div className="mz-dt__filter-options" role="group">
        {def.options.map((option) => (
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
  }

  if (def.type === 'number-range') {
    const current = draft?.type === 'number-range' ? draft : { type: 'number-range' as const }
    const patch = (part: { min?: number; max?: number }) =>
      setDraft({ type: 'number-range', min: current.min, max: current.max, ...part })
    return (
      <div className="mz-dt__filter-range">
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
        <span className="mz-dt__filter-dash">—</span>
        <Input
          inputSize="sm"
          type="number"
          step={def.step}
          placeholder={labels.rangeTo}
          value={current.max ?? ''}
          onKeyDown={submitOnEnter}
          onChange={(e) => patch({ max: e.target.value === '' ? undefined : Number(e.target.value) })}
        />
      </div>
    )
  }

  if (def.type === 'date-range') {
    const current = draft?.type === 'date-range' ? draft : { type: 'date-range' as const }
    const patch = (part: { from?: string; to?: string }) =>
      setDraft({ type: 'date-range', from: current.from, to: current.to, ...part })
    return (
      <div className="mz-dt__filter-range mz-dt__filter-range--stacked">
        <Label htmlFor="mz-dt-from">{labels.dateFrom}</Label>
        <Input
          id="mz-dt-from"
          inputSize="sm"
          type="date"
          value={current.from ?? ''}
          onKeyDown={submitOnEnter}
          onChange={(e) => patch({ from: e.target.value || undefined })}
        />
        <Label htmlFor="mz-dt-to">{labels.dateTo}</Label>
        <Input
          id="mz-dt-to"
          inputSize="sm"
          type="date"
          value={current.to ?? ''}
          onKeyDown={submitOnEnter}
          onChange={(e) => patch({ to: e.target.value || undefined })}
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

  const current = draft?.type === 'boolean' ? draft.value : undefined
  return (
    <div className="mz-dt__filter-options" role="radiogroup">
      {[
        { value: true, label: def.trueLabel ?? labels.yes },
        { value: false, label: def.falseLabel ?? labels.no },
      ].map((option) => (
        <label key={String(option.value)} className="mz-dt__filter-option">
          <Checkbox
            size="sm"
            checked={current === option.value}
            onCheckedChange={(checked) =>
              setDraft(checked ? { type: 'boolean', value: option.value } : undefined)
            }
          />
          <span>{option.label}</span>
        </label>
      ))}
    </div>
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
      {label}
      <button type="button" onClick={onClear} aria-label={clearLabel} className="mz-focusable">
        ×
      </button>
    </span>
  )
}
