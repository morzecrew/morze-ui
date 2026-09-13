'use client'

import * as React from 'react'

import { Input } from '../input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../select'
import { resolveLabels, type DataTableLabels } from './labels'
import type { EditableDef } from './types'

/**
 * Optimistic by design: the cell shows the new value immediately and rolls
 * back if the save rejects, so a slow backend never blocks typing.
 *
 * A rejection is reported the same way in both editors: the value goes back,
 * the editor stays open with what the reader typed still in front of them,
 * and the reason is rendered in the cell under an `aria-live` region. It used
 * to land in a `title` attribute on the text editor — which no screen reader
 * announces and a pointer has to hover a second to find — while the select
 * editor rolled back in silence and left the reader with no idea why the
 * value had moved.
 */
export function CellEditor<T>({
  row,
  def,
  labels: labelsProp,
  onDone,
}: {
  row: T
  def: EditableDef<T>
  labels?: Partial<DataTableLabels>
  onDone: () => void
}) {
  const labels = resolveLabels(labelsProp)
  const initial = def.value(row)
  const [value, setValue] = React.useState(initial)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  // The select editor's list. Held here so a failed save can keep it open
  // without the component flipping from uncontrolled to controlled — React
  // warns on that switch — and so the reader keeps the choice they were
  // making in front of them.
  const [open, setOpen] = React.useState(true)

  const save = async (next: string) => {
    if (next === initial) return onDone()
    setSaving(true)
    setError(null)
    try {
      await def.onSave(row, next)
      onDone()
    } catch (cause) {
      // The typed value stays; only the committed one rolls back, so a
      // reader who hit a validation error can correct it rather than retype.
      setValue(next)
      setError(cause instanceof Error && cause.message ? cause.message : labels.saveFailed)
      setSaving(false)
      setOpen(true)
    }
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      void save(value)
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      onDone()
    }
  }

  const message = error ? (
    <span role="status" aria-live="polite" className="mz-dt__editor-error">
      {error}
    </span>
  ) : null

  if (def.type === 'select') {
    return (
      <span className="mz-dt__editor-wrap">
        <Select
          open={open}
          value={value}
          onValueChange={(next) => {
            setValue(next)
            void save(next)
          }}
          // Dismissing the list is how this editor says "done" — after a
          // refusal too, where it means the reader has read the message and
          // given up on the change.
          onOpenChange={(next) => {
            setOpen(next)
            if (!next) onDone()
          }}
        >
          <SelectTrigger size="sm" className="mz-dt__editor" aria-invalid={error ? true : undefined}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(def.options ?? []).map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {message}
      </span>
    )
  }

  return (
    <span className="mz-dt__editor-wrap">
      <Input
        autoFocus
        inputSize="sm"
        type={def.type === 'number' ? 'number' : 'text'}
        className="mz-dt__editor"
        value={value}
        disabled={saving}
        aria-invalid={error ? true : undefined}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={onKeyDown}
        // A blur while the message is up is the reader looking at it, not a
        // second attempt: re-saving here would loop on a value the backend
        // has already refused.
        onBlur={() => {
          if (!error) void save(value)
        }}
      />
      {message}
    </span>
  )
}
