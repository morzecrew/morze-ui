'use client'

import * as React from 'react'

import { AutoWidthIcon, ColumnsIcon, EyeIcon, EyeOffIcon, GripIcon, PinIcon } from '../../lib/icons'
import { Button } from '../button'
import { Input } from '../input'
import { Popover, PopoverContent, PopoverTrigger } from '../popover'
import { Separator } from '../separator'
import { resolveLabels, type DataTableLabels } from './labels'
import type { ColumnLayout, DataTableColumn } from './types'

type Props<T> = {
  columns: DataTableColumn<T>[]
  layout: ColumnLayout
  onToggleHidden: (id: string) => void
  /**
   * Sets the whole hidden list — what the show-all and hide-all controls
   * need. Optional so a host mounting this component against an older layout
   * hook still type-checks; without it the two controls do not appear.
   */
  onSetHidden?: (ids: string[]) => void
  onSetPinned: (id: string, side: 'left' | 'right' | undefined) => void
  /**
   * Unused since the arrows started moving a column past its neighbour in the
   * same pin group, which `onMoveTo` already expresses. Kept so a host that
   * mounts this component directly still type-checks.
   */
  onMove?: (id: string, delta: number) => void
  onMoveTo: (id: string, targetId: string) => void
  /**
   * Hands one column back to auto-fit. Optional so a host mounting this
   * component against an older layout hook still type-checks; without it the
   * control simply does not appear.
   */
  onUnsize?: (id: string) => void
  onReset: () => void
  labels?: Partial<DataTableLabels>
}

type Side = 'left' | 'right' | undefined

/** Columns before the list grows a search box of its own. */
const SEARCH_THRESHOLD = 8

/**
 * What to call a column in this list. A header is free to be a node — an icon,
 * a checkbox, a whole widget — and an `id` is a developer's string, not a
 * name, so anything without text falls back to its position: “#3”. Numbered
 * off the declared columns rather than this list, so reordering never renames
 * a row out from under the pointer.
 */
function nameOf<T>(column: DataTableColumn<T>, declaredIndex: number) {
  if (column.label?.trim()) return column.label
  if (typeof column.header === 'string' && column.header.trim()) return column.header
  return `#${declaredIndex + 1}`
}

/**
 * Reordering lives here rather than on the header itself: dragging a header
 * would fight the resize handle, and a list gives keyboard users real controls
 * instead of a drag-only affordance.
 *
 * The list is grouped the way the table paints — pinned left, then loose, then
 * pinned right — because it used to show the raw `layout.order` instead. A
 * column dragged to the top of that list landed second in the table, behind
 * whatever was pinned, and moving a column past a pinned neighbour changed the
 * order without changing anything on screen. Both read as a broken reorder.
 * Moves therefore stay inside a column's own group; crossing between them is
 * what the pin button is for.
 */
export function ColumnManager<T>({
  columns,
  layout,
  onToggleHidden,
  onSetHidden,
  onSetPinned,
  onMoveTo,
  onUnsize,
  onReset,
  labels: labelsProp,
}: Props<T>) {
  const labels = resolveLabels(labelsProp)
  const [dragging, setDragging] = React.useState<string | null>(null)
  const [dropTarget, setDropTarget] = React.useState<string | null>(null)
  const [query, setQuery] = React.useState('')
  /** A touch drag in flight. A ref, because the handlers that end one cannot
      wait for a render to learn where the finger last was. */
  const touchDrag = React.useRef<{ id: string; target: string | null } | null>(null)

  const entries = React.useMemo(() => {
    const byId = new Map(columns.map((c, index) => [c.id, { column: c, declaredIndex: index }]))
    const ordered = layout.order.map((id) => byId.get(id)).filter((e) => Boolean(e)) as {
      column: DataTableColumn<T>
      declaredIndex: number
    }[]
    const side = (id: string): Side => layout.pinned[id]
    const groups: Side[] = ['left', undefined, 'right']
    return groups.flatMap((group) => {
      const inGroup = ordered.filter((e) => side(e.column.id) === group)
      return inGroup.map((entry, indexInGroup) => ({
        ...entry,
        side: group,
        indexInGroup,
        groupSize: inGroup.length,
        previous: inGroup[indexInGroup - 1]?.column.id,
        next: inGroup[indexInGroup + 1]?.column.id,
        name: nameOf(entry.column, entry.declaredIndex),
      }))
    })
  }, [columns, layout])

  const sideOf = (id: string): Side => layout.pinned[id]
  /** A drop only lands inside one group — see the note above the component. */
  const canDropOn = (sourceId: string, targetId: string) =>
    sourceId !== targetId && sideOf(sourceId) === sideOf(targetId)
  const canDrop = (targetId: string) => Boolean(dragging) && canDropOn(dragging!, targetId)

  /* A box over the list, for the table with thirty columns in it: below a
     screenful the list is quicker to read than to search, so the box only
     appears once there is something to look for. */
  const needle = query.trim().toLocaleLowerCase()
  const searchable = entries.length >= SEARCH_THRESHOLD
  const shown = needle
    ? entries.filter((entry) => entry.name.toLocaleLowerCase().includes(needle))
    : entries
  /* Reordering is off while the list is filtered: a drop lands next to the
     column above it in the *table*, and in a filtered list that is not the
     column above it on screen. The arrows stay — they name their neighbour. */
  const reorderable = !needle

  /* Show all and hide all act on what is on screen, which is what a reader who
     has just typed a word expects them to mean. A column that says it cannot
     be hidden is left alone by both. */
  const inView = shown.map((entry) => entry.column.id)
  const hideableInView = shown
    .filter((entry) => entry.column.hideable !== false)
    .map((entry) => entry.column.id)
  const showAll = () => onSetHidden?.(layout.hidden.filter((id) => !inView.includes(id)))
  const hideAll = () => onSetHidden?.([...layout.hidden, ...hideableInView])
  const anyShown = hideableInView.some((id) => !layout.hidden.includes(id))
  const anyHidden = inView.some((id) => layout.hidden.includes(id))

  const endDrag = () => {
    setDragging(null)
    setDropTarget(null)
  }

  /* The touch half of reordering. The move and release listeners go on the
     document rather than on the grip: pointer capture is the tidier way to
     keep them, and it is also the one an engine can refuse — with none, a
     finger that has left the grip stops reporting to it, and the drag dies
     under the reader's thumb. Hit-testing runs off the finger's own position
     for the same reason. */
  const startTouchDrag = (id: string) => (event: React.PointerEvent) => {
    if (event.pointerType === 'mouse' || !reorderable) return
    touchDrag.current = { id, target: null }
    setDragging(id)
    const move = (moveEvent: PointerEvent) => {
      const drag = touchDrag.current
      if (!drag) return
      const under = document
        .elementFromPoint?.(moveEvent.clientX, moveEvent.clientY)
        ?.closest<HTMLElement>('[data-column-id]')
      const over = under?.dataset.columnId ?? null
      const next = over && canDropOn(drag.id, over) ? over : null
      if (next === drag.target) return
      drag.target = next
      setDropTarget(next)
    }
    const detach = () => {
      document.removeEventListener('pointermove', move)
      document.removeEventListener('pointerup', end)
      document.removeEventListener('pointercancel', end)
      detachTouchDrag.current = null
    }
    const end = () => {
      detach()
      const drag = touchDrag.current
      touchDrag.current = null
      if (drag?.target) onMoveTo(drag.id, drag.target)
      endDrag()
    }
    detachTouchDrag.current = detach
    document.addEventListener('pointermove', move)
    document.addEventListener('pointerup', end)
    document.addEventListener('pointercancel', end)
  }

  // A popover that closes mid-drag — or a table that unmounts under one —
  // must not leave its listeners on the document.
  const detachTouchDrag = React.useRef<(() => void) | null>(null)
  React.useEffect(() => () => detachTouchDrag.current?.(), [])

  const hiddenCount = layout.hidden.length

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="secondary" size="sm">
          <ColumnsIcon />
          {labels.columns}
          {hiddenCount > 0 ? <span className="mz-dt__count">{entries.length - hiddenCount}</span> : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="mz-dt__columns">
        <div className="mz-dt__columns-head">
          <span>{labels.columns}</span>
          <Button type="button" variant="link" size="xs" onClick={onReset}>
            {labels.reset}
          </Button>
        </div>
        <Separator />
        {searchable ? (
          <div className="mz-dt__columns-search">
            <Input
              type="search"
              inputSize="sm"
              aria-label={labels.searchColumns}
              placeholder={labels.searchColumns}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        ) : null}
        {onSetHidden && shown.length > 1 ? (
          <div className="mz-dt__columns-bulk">
            <Button type="button" variant="link" size="xs" disabled={!anyHidden} onClick={showAll}>
              {labels.showAllColumns}
            </Button>
            <Button type="button" variant="link" size="xs" disabled={!anyShown} onClick={hideAll}>
              {labels.hideAllColumns}
            </Button>
          </div>
        ) : null}
        {shown.length === 0 ? <p className="mz-dt__columns-empty">{labels.noColumns}</p> : null}
        <ul className="mz-dt__columns-list">
          {shown.map((entry) => {
            const column = entry.column
            const hidden = layout.hidden.includes(column.id)
            const pinned = entry.side
            const name = entry.name
            const pinTitle =
              pinned === 'left'
                ? labels.pinnedLeft
                : pinned === 'right'
                  ? labels.pinnedRight
                  : labels.notPinned
            return (
              <li
                key={column.id}
                className="mz-dt__columns-item"
                data-dragging={dragging === column.id || undefined}
                data-drop={dropTarget === column.id || undefined}
                data-pinned={pinned}
                data-column-id={column.id}
                draggable={reorderable}
                onDragStart={(event) => {
                  // A press that drifts a pixel on one of the buttons used to
                  // drag the whole row instead of clicking.
                  if ((event.target as HTMLElement).closest('.mz-dt__columns-controls')) {
                    event.preventDefault()
                    return
                  }
                  setDragging(column.id)
                  event.dataTransfer.effectAllowed = 'move'
                  // Firefox refuses to start a drag without payload.
                  try {
                    event.dataTransfer.setData('text/plain', column.id)
                  } catch {
                    /* older engines lock dataTransfer outside a real drag */
                  }
                }}
                onDragEnd={endDrag}
                onDragOver={(event) => {
                  if (!canDrop(column.id)) {
                    event.dataTransfer.dropEffect = 'none'
                    return
                  }
                  event.preventDefault()
                  event.dataTransfer.dropEffect = 'move'
                  setDropTarget(column.id)
                }}
                onDragLeave={() => setDropTarget((c) => (c === column.id ? null : c))}
                onDrop={(event) => {
                  event.preventDefault()
                  if (canDrop(column.id)) onMoveTo(dragging!, column.id)
                  endDrag()
                }}
              >
                {/* Touch never fires a `dragstart`, so the whole reorder was
                    mouse-only on the device most likely to be reading a table
                    sideways. The grip is the touch handle: a press on it is a
                    drag, a press anywhere else on the row still scrolls the
                    list. */}
                <span
                  className="mz-dt__columns-grip"
                  aria-hidden="true"
                  onPointerDown={startTouchDrag(column.id)}
                >
                  <GripIcon />
                </span>
                <span className="mz-dt__columns-label">{name}</span>

                {/* Not a drag source: see onDragStart. */}
                <div className="mz-dt__columns-controls" draggable={false}>
                  {/* Only where it can do something: a column is `sized` once
                      its handle has been dragged, and that is permanent by
                      design — otherwise the next container resize would take
                      the width away again. This is the way back, and before
                      it the only one was Reset, which also threw away the
                      order, the pins and everything hidden. A row that was
                      never dragged keeps its four buttons. */}
                  {onUnsize && layout.sized.includes(column.id) ? (
                    <button
                      type="button"
                      className="mz-dt__icon-btn mz-focusable"
                      onClick={() => onUnsize(column.id)}
                      aria-label={labels.autoWidth(name)}
                      title={labels.autoWidth(name)}
                    >
                      <AutoWidthIcon />
                    </button>
                  ) : null}
                  {/* Arrow buttons keep reordering reachable without a pointer. */}
                  <button
                    type="button"
                    className="mz-dt__icon-btn mz-focusable"
                    disabled={!entry.previous}
                    onClick={() => entry.previous && onMoveTo(column.id, entry.previous)}
                    aria-label={labels.moveUp(name)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="mz-dt__icon-btn mz-focusable"
                    disabled={!entry.next}
                    onClick={() => entry.next && onMoveTo(column.id, entry.next)}
                    aria-label={labels.moveDown(name)}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="mz-dt__icon-btn mz-dt__pin mz-focusable"
                    data-active={pinned ? true : undefined}
                    data-pinned={pinned}
                    onClick={() =>
                      onSetPinned(column.id, pinned === 'left' ? 'right' : pinned === 'right' ? undefined : 'left')
                    }
                    aria-label={labels.pinning(name, pinTitle)}
                    title={pinTitle}
                  >
                    <PinIcon />
                  </button>
                  <button
                    type="button"
                    className="mz-dt__icon-btn mz-focusable"
                    disabled={column.hideable === false}
                    onClick={() => onToggleHidden(column.id)}
                    aria-label={hidden ? labels.show(name) : labels.hide(name)}
                  >
                    {hidden ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      </PopoverContent>
    </Popover>
  )
}
