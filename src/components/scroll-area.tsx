'use client'

import * as React from 'react'
import { ScrollArea as ScrollAreaPrimitive } from 'radix-ui'

import { cn } from '../lib/utils'

/**
 * A scroll container with the kit's own scrollbar instead of the platform's.
 *
 * Radix hides the native bar and drives a rendered one, so the track keeps the
 * kit's colours on every platform — including macOS, where the overlay
 * scrollbar is invisible until it moves and a pane gives no hint that it
 * scrolls at all.
 *
 * The vertical bar ships by default; add a horizontal one with `orientation`,
 * or by rendering it yourself:
 *
 *   <ScrollArea orientation="both">{wideContent}</ScrollArea>
 *
 *   <ScrollArea>
 *     {wideContent}
 *     <ScrollBar orientation="horizontal" />
 *   </ScrollArea>
 *
 * Radix wraps the content in a `display: table` box that grows to its widest
 * child, which is what lets a wide table scroll sideways — and what stops a
 * long line in a vertical list from ever truncating. A vertical area (the
 * default, whenever no horizontal bar is rendered) sets that box back to
 * `block`, so `text-overflow: ellipsis` works without reaching into Radix.
 */
function ScrollArea({
  className,
  children,
  orientation: orientationProp,
  viewportClassName,
  viewportRef,
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.Root> & {
  /**
   * Which ways the area scrolls. `vertical` holds the content to the area's
   * width; `horizontal` and `both` let it grow sideways and draw the
   * horizontal bar. Inferred when omitted: `both` if a horizontal `ScrollBar`
   * is among the children, `vertical` otherwise.
   */
  orientation?: 'vertical' | 'horizontal' | 'both'
  viewportClassName?: string
  /** The scrolling element itself — for scroll restoration or `scrollTo`. */
  viewportRef?: React.Ref<HTMLDivElement>
}) {
  const orientation = orientationProp ?? (hasHorizontalBar(children) ? 'both' : 'vertical')
  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      data-orientation={orientation}
      className={cn('mz-scroll-area', className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        ref={viewportRef}
        className={cn('mz-scroll-area__viewport mz-focusable', viewportClassName)}
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      {orientation === 'horizontal' ? null : <ScrollBar />}
      {orientationProp === 'horizontal' || orientationProp === 'both' ? (
        <ScrollBar orientation="horizontal" />
      ) : null}
      <ScrollAreaPrimitive.Corner className="mz-scroll-area__corner" />
    </ScrollAreaPrimitive.Root>
  )
}

function hasHorizontalBar(children: React.ReactNode) {
  return React.Children.toArray(children).some(
    (child) =>
      React.isValidElement<{ orientation?: string }>(child) &&
      child.type === ScrollBar &&
      child.props.orientation === 'horizontal'
  )
}

function ScrollBar({
  className,
  orientation = 'vertical',
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>) {
  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      className={cn(
        'mz-scrollbar',
        orientation === 'horizontal' && 'mz-scrollbar--horizontal',
        className
      )}
      {...props}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb
        data-slot="scroll-area-thumb"
        className="mz-scrollbar__thumb"
      />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  )
}

export { ScrollArea, ScrollBar }
