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
import type { EditableDef } from './types'

/**
 * Optimistic by design: the cell shows the new value immediately and rolls
 * back if the save rejects, so a slow backend never blocks typing.
 */
export function CellEditor<T>({
  row,
  def,
  onDone,
}: {
  row: T
  def: EditableDef<T>
  onDone: () => void
}) {
  const initial = def.value(row)
  const [value, setValue] = React.useState(initial)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const commit = async () => {
    if (value === initial) return onDone()
    setSaving(true)
    try {
      await def.onSave(row, value)
      onDone()
    } catch (cause) {
      setValue(initial)
      setError(cause instanceof Error ? cause.message : 'Could not save')
      setSaving(false)
    }
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      void commit()
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      onDone()
    }
  }

  if (def.type === 'select') {
    return (
      <Select
        open
        value={value}
        onValueChange={async (next) => {
          setValue(next)
          setSaving(true)
          try {
            await def.onSave(row, next)
            onDone()
          } catch {
            setValue(initial)
            setSaving(false)
          }
        }}
        onOpenChange={(open) => !open && onDone()}
      >
        <SelectTrigger size="sm" className="mz-dt__editor">
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
    )
  }

  return (
    <Input
      autoFocus
      inputSize="sm"
      type={def.type === 'number' ? 'number' : 'text'}
      className="mz-dt__editor"
      value={value}
      disabled={saving}
      aria-invalid={error ? true : undefined}
      title={error ?? undefined}
      onChange={(event) => setValue(event.target.value)}
      onKeyDown={onKeyDown}
      onBlur={() => void commit()}
    />
  )
}
