'use client'

import * as React from 'react'

import { ColumnsIcon, EyeIcon, EyeOffIcon, GripIcon, PinIcon } from '../../lib/icons'
import { Button } from '../button'
import { Popover, PopoverContent, PopoverTrigger } from '../popover'
import { Separator } from '../separator'
import { resolveLabels, type DataTableLabels } from './labels'
import type { ColumnLayout, DataTableColumn } from './types'

type Props<T> = {
  columns: DataTableColumn<T>[]
  layout: ColumnLayout
  onToggleHidden: (id: string) => void
  onSetPinned: (id: string, side: 'left' | 'right' | undefined) => void
  onMove: (id: string, delta: number) => void
  onMoveTo: (id: string, targetId: string) => void
  onReset: () => void
  labels?: Partial<DataTableLabels>
}

/**
 * Reordering lives here rather than on the header itself: dragging a header
 * would fight the resize handle, and a list gives keyboard users real controls
 * instead of a drag-only affordance.
 */
export function ColumnManager<T>({
  columns,
  layout,
  onToggleHidden,
  onSetPinned,
  onMove,
  onMoveTo,
  onReset,
  labels: labelsProp,
}: Props<T>) {
  const labels = resolveLabels(labelsProp)
  const [dragging, setDragging] = React.useState<string | null>(null)
  const byId = React.useMemo(() => new Map(columns.map((c) => [c.id, c])), [columns])
  const ordered = layout.order
    .map((id) => byId.get(id))
    .filter((c): c is DataTableColumn<T> => Boolean(c))
  const hiddenCount = layout.hidden.length

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="secondary" size="sm">
          <ColumnsIcon />
          {labels.columns}
          {hiddenCount > 0 ? <span className="mz-dt__count">{ordered.length - hiddenCount}</span> : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="mz-dt__columns">
        <div className="mz-dt__columns-head">
          <span>{labels.columns}</span>
          <Button variant="link" size="xs" onClick={onReset}>
            {labels.reset}
          </Button>
        </div>
        <Separator />
        <ul className="mz-dt__columns-list">
          {ordered.map((column, index) => {
            const hidden = layout.hidden.includes(column.id)
            const pinned = layout.pinned[column.id]
            const label = column.label ?? (typeof column.header === 'string' ? column.header : column.id)
            return (
              <li
                key={column.id}
                className="mz-dt__columns-item"
                data-dragging={dragging === column.id || undefined}
                draggable
                onDragStart={() => setDragging(column.id)}
                onDragEnd={() => setDragging(null)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  if (dragging && dragging !== column.id) onMoveTo(dragging, column.id)
                  setDragging(null)
                }}
              >
                <span className="mz-dt__columns-grip" aria-hidden="true">
                  <GripIcon />
                </span>
                <span className="mz-dt__columns-label">{label}</span>

                <div className="mz-dt__columns-controls">
                  {/* Arrow buttons keep reordering reachable without a pointer. */}
                  <button
                    type="button"
                    className="mz-dt__icon-btn mz-focusable"
                    disabled={index === 0}
                    onClick={() => onMove(column.id, -1)}
                    aria-label={labels.moveUp(label)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="mz-dt__icon-btn mz-focusable"
                    disabled={index === ordered.length - 1}
                    onClick={() => onMove(column.id, 1)}
                    aria-label={labels.moveDown(label)}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="mz-dt__icon-btn mz-focusable"
                    data-active={pinned ? true : undefined}
                    onClick={() =>
                      onSetPinned(column.id, pinned === 'left' ? 'right' : pinned === 'right' ? undefined : 'left')
                    }
                    aria-label={labels.pinning(
                      label,
                      pinned === 'left'
                        ? labels.pinnedLeft
                        : pinned === 'right'
                          ? labels.pinnedRight
                          : labels.notPinned
                    )}
                    title={
                      pinned === 'left'
                        ? labels.pinnedLeft
                        : pinned === 'right'
                          ? labels.pinnedRight
                          : labels.notPinned
                    }
                  >
                    <PinIcon />
                  </button>
                  <button
                    type="button"
                    className="mz-dt__icon-btn mz-focusable"
                    disabled={column.hideable === false}
                    onClick={() => onToggleHidden(column.id)}
                    aria-label={hidden ? labels.show(label) : labels.hide(label)}
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
