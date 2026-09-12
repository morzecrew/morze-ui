'use client'

import * as React from 'react'

/**
 * Dragging writes the live width straight into a CSS custom property on the
 * table root, so a resize repaints the <col> element and nothing else — no
 * React render per pointer move, which matters once hundreds of cells are
 * mounted. State is committed once, on pointer up.
 */
export function useColumnResize(options: {
  rootRef: React.RefObject<HTMLElement | null>
  widthOf: (id: string) => number
  minWidthOf: (id: string) => number
  onCommit: (id: string, width: number) => void
}) {
  const { rootRef, widthOf, minWidthOf, onCommit } = options
  const [resizing, setResizing] = React.useState<string | null>(null)

  const varName = (id: string) => `--mz-dt-w-${cssSafe(id)}`

  const start = React.useCallback(
    (event: React.PointerEvent<HTMLElement>, id: string) => {
      // Only the primary button starts a resize; let everything else through.
      if (event.button !== 0) return
      event.preventDefault()
      event.stopPropagation()

      const root = rootRef.current
      if (!root) return

      const handle = event.currentTarget
      const startX = event.clientX
      const startWidth = widthOf(id)
      const min = minWidthOf(id)
      let width = startWidth

      handle.setPointerCapture(event.pointerId)
      setResizing(id)

      const onMove = (moveEvent: PointerEvent) => {
        width = Math.max(min, Math.round(startWidth + moveEvent.clientX - startX))
        root.style.setProperty(varName(id), `${width}px`)
      }

      const finish = () => {
        handle.releasePointerCapture?.(event.pointerId)
        handle.removeEventListener('pointermove', onMove)
        handle.removeEventListener('pointerup', finish)
        handle.removeEventListener('pointercancel', finish)
        setResizing(null)
        if (width !== startWidth) onCommit(id, width)
      }

      handle.addEventListener('pointermove', onMove)
      handle.addEventListener('pointerup', finish)
      handle.addEventListener('pointercancel', finish)
    },
    [rootRef, widthOf, minWidthOf, onCommit]
  )

  /** Double click fits the column to its widest rendered cell. */
  const autoFit = React.useCallback(
    (id: string) => {
      const root = rootRef.current
      if (!root) return
      const cells = root.querySelectorAll<HTMLElement>(`[data-col="${CSS.escape(id)}"]`)
      let widest = minWidthOf(id)
      cells.forEach((cell) => {
        const content = cell.firstElementChild as HTMLElement | null
        const padding = 26
        widest = Math.max(widest, (content?.scrollWidth ?? cell.scrollWidth) + padding)
      })
      const width = Math.min(widest, 640)
      root.style.setProperty(varName(id), `${width}px`)
      onCommit(id, width)
    },
    [rootRef, minWidthOf, onCommit]
  )

  /** Keyboard resizing — the handle is focusable, arrows nudge the width. */
  const onKeyDown = React.useCallback(
    (event: React.KeyboardEvent, id: string) => {
      const step = event.shiftKey ? 32 : 8
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
      event.preventDefault()
      const next = Math.max(
        minWidthOf(id),
        widthOf(id) + (event.key === 'ArrowRight' ? step : -step)
      )
      rootRef.current?.style.setProperty(varName(id), `${next}px`)
      onCommit(id, next)
    },
    [rootRef, widthOf, minWidthOf, onCommit]
  )

  return { start, autoFit, onKeyDown, resizing, varName }
}

/**
 * Column ids are author-supplied, so they are sanitised for use in a custom
 * property name. The sanitising has to be *injective*, which the old
 * `replace(/[^a-zA-Z0-9_-]/g, '_')` was not: `_` was both a character it let
 * through and the character it replaced everything else with, so `a.b` and
 * `a_b` both came out `a_b`. Two columns with those ids shared one variable
 * and therefore one width — dragging either resized both, and the pinned
 * offsets calc()'d off the same value twice.
 *
 * `_` is the escape character now, so a literal one doubles; anything else
 * outside the ident set becomes `_<hex codepoint>_`. Every escape opens with a
 * single `_` and closes with one, which makes the mapping reversible and so
 * collision-free by construction.
 */
export function cssSafe(id: string) {
  let out = ''
  for (const char of id) {
    if (char === '_') out += '__'
    else if (/[a-zA-Z0-9-]/.test(char)) out += char
    else out += `_${char.codePointAt(0)!.toString(16)}_`
  }
  return out
}
