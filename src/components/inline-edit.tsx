'use client'

import * as React from 'react'

import { cn } from '../lib/utils'
import { CheckIcon, PencilIcon, XIcon } from '../lib/icons'
import { Button } from './button'
import { useLocaleLabels } from './locale-provider'
import { defaultCommonLabels } from '../locales/defaults'
import type { MorzeCommonLabels } from '../locales/types'

/* --------------------------------------------------------------------------
   InlineEdit (N-07) — a field on a record card that reads as text and turns
   into a control on demand: label and value, a pencil, then the control with
   Save and Cancel. The control is the host's (`editor`): an input, a date, a
   select, anything — this owns the frame, the keys and the saving state.

   Both bugs erp-frontend shipped were in that frame, not in the controls:

   - The pencil sat inside a full-width `<label>`, and a click anywhere on a
     label activates the first button in it — the whole row was the pencil.
     Here the label is text and the pencil is a sibling button.
   - The edit row was wider than its tile, and a field reached into its parent
     to widen the grid column. Here the row lives in its container's width:
     the editor takes what is left and the buttons wrap under it when narrow.
   -------------------------------------------------------------------------- */

type InlineEditProps = Omit<React.ComponentProps<'div'>, 'children'> & {
  label: React.ReactNode
  /** The label as text, for accessible names; `label` when it is a string. */
  labelText?: string
  /** What the field shows while not editing. */
  view: React.ReactNode
  /** The control while editing. Use the `sm` size of kit controls. */
  editor: React.ReactNode
  /**
   * Commits the edit. A promise keeps the row busy until it settles; a
   * rejection keeps the row open — tell the user why in the host.
   */
  onSave: () => unknown
  onCancel?: () => void
  /** Before the editor shows: copy the value into a draft here. */
  onEditStart?: () => void
  /** Controlled editing state. */
  editing?: boolean
  onEditingChange?: (editing: boolean) => void
  readOnly?: boolean
  saveDisabled?: boolean
  labels?: Partial<MorzeCommonLabels>
  /**
   * Where the label, the value and the pencil go (#45):
   *
   * - `stack` (default) — the label on top with the pencil beside it, the
   *   value under it: a tile in a grid of fields.
   * - `row` — a property row: the label at the start, the value at the end,
   *   the pencil last in a column of its own that a read-only row keeps too,
   *   so the values of a list of rows line up. The editor takes the value's
   *   and the pencil's place.
   * - `inline` — a word in a line of text (`ИНД-1 · Индуктивности · шт`):
   *   the value as it is, the pencil after it, the label read but not shown.
   * - `lead` — a card's headline figure: the value large, the pencil beside
   *   it, the label under it as a caption.
   */
  layout?: 'stack' | 'row' | 'inline' | 'lead'
}

const FOCUSABLE = 'input:not([type=hidden]), textarea, select, button, [tabindex]:not([tabindex="-1"])'

function InlineEdit({
  className,
  label,
  labelText,
  view,
  editor,
  onSave,
  onCancel,
  onEditStart,
  editing: editingProp,
  onEditingChange,
  readOnly = false,
  saveDisabled = false,
  labels: labelsProp,
  layout = 'stack',
  ...props
}: InlineEditProps) {
  const labels = useLocaleLabels('common', defaultCommonLabels, labelsProp)
  const [own, setOwn] = React.useState(false)
  const editing = editingProp ?? own
  const [saving, setSaving] = React.useState(false)
  const labelId = React.useId()
  const editorRef = React.useRef<HTMLDivElement>(null)
  const pencilRef = React.useRef<HTMLButtonElement>(null)
  // Focus goes back to the pencil only after this field closed itself, not
  // when a host flips `editing` from outside.
  const returnFocus = React.useRef(false)
  const name = labelText ?? (typeof label === 'string' ? label : '')

  const setEditing = (next: boolean) => {
    if (editingProp === undefined) setOwn(next)
    onEditingChange?.(next)
  }

  React.useEffect(() => {
    if (editing) {
      editorRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus()
    } else if (returnFocus.current) {
      returnFocus.current = false
      pencilRef.current?.focus()
    }
  }, [editing])

  const start = () => {
    onEditStart?.()
    setEditing(true)
  }

  const cancel = () => {
    if (saving) return
    onCancel?.()
    returnFocus.current = true
    setEditing(false)
  }

  const save = async () => {
    if (saving || saveDisabled) return
    setSaving(true)
    try {
      await onSave()
      returnFocus.current = true
      setEditing(false)
    } catch {
      // The row stays open with the draft; the host reports the failure.
    } finally {
      setSaving(false)
    }
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    // Keys from a portalled popover (a select's list, a calendar) bubble here
    // through React; they belong to that popover — Escape closes it, not us.
    if (!(event.target instanceof Node) || !event.currentTarget.contains(event.target)) return
    if (event.nativeEvent.isComposing) return
    if (event.key === 'Escape') {
      event.preventDefault()
      cancel()
      return
    }
    if (event.key !== 'Enter') return
    const target = event.target as HTMLElement
    const multiline = target.tagName === 'TEXTAREA'
    const typed = target.tagName === 'INPUT' || multiline
    // Enter on a button is that button's own click; in a textarea it is a new
    // line unless Ctrl/⌘ is held.
    if (!typed || (multiline && !(event.ctrlKey || event.metaKey))) return
    event.preventDefault()
    void save()
  }

  const labelEl = (
    <span
      id={labelId}
      // Inline, the label is the line's business, not the field's: it is
      // read, and names the group and the pencil, but it is not drawn.
      className={cn('mz-inline-edit__label', layout === 'inline' && 'mz-sr-only')}
    >
      {label}
    </span>
  )

  const pencil =
    !editing && !readOnly ? (
      <Button
        ref={pencilRef}
        type="button"
        variant="ghost"
        size="icon-xs"
        className="mz-inline-edit__pencil"
        aria-label={labels.editField(name)}
        title={labels.editField(name)}
        onClick={start}
      >
        <PencilIcon />
      </Button>
    ) : null

  const editRow = (
    <div role="group" aria-labelledby={labelId} className="mz-inline-edit__row" onKeyDown={onKeyDown}>
      <div ref={editorRef} className="mz-inline-edit__editor">
        {editor}
      </div>
      <div className="mz-inline-edit__actions">
        <Button
          type="button"
          variant="primary"
          size="icon-sm"
          loading={saving}
          disabled={saveDisabled}
          aria-label={labels.save}
          title={labels.save}
          onClick={() => void save()}
        >
          <CheckIcon />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          disabled={saving}
          aria-label={labels.cancel}
          title={labels.cancel}
          onClick={cancel}
        >
          <XIcon />
        </Button>
      </div>
    </div>
  )

  const viewEl = <div className="mz-inline-edit__view">{view}</div>

  // The parts are placed by the component, one arrangement per layout, so a
  // host never reaches into this markup to move them — erp did, with
  // `display: contents` and `order`, and a change here would have broken it.
  let body: React.ReactNode
  if (layout === 'row' || layout === 'inline') {
    body = (
      <>
        {labelEl}
        {editing ? editRow : viewEl}
        {pencil}
      </>
    )
  } else if (layout === 'lead') {
    body = (
      <>
        <div className="mz-inline-edit__lead">
          {editing ? editRow : viewEl}
          {pencil}
        </div>
        {labelEl}
      </>
    )
  } else {
    body = (
      <>
        <div className="mz-inline-edit__head">
          {labelEl}
          {pencil}
        </div>
        {editing ? editRow : viewEl}
      </>
    )
  }

  return (
    <div
      data-slot="inline-edit"
      data-layout={layout}
      data-editing={editing || undefined}
      className={cn('mz-inline-edit', className)}
      {...props}
    >
      {body}
    </div>
  )
}

export { InlineEdit }
export type { InlineEditProps }
