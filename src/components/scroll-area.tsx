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
 * The vertical bar ships by default; add a horizontal one explicitly:
 *
 *   <ScrollArea>
 *     {wideContent}
 *     <ScrollBar orientation="horizontal" />
 *   </ScrollArea>
 */
function ScrollArea({
  className,
  children,
  viewportClassName,
  viewportRef,
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.Root> & {
  viewportClassName?: string
  /** The scrolling element itself — for scroll restoration or `scrollTo`. */
  viewportRef?: React.Ref<HTMLDivElement>
}) {
  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
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
      <ScrollBar />
      <ScrollAreaPrimitive.Corner className="mz-scroll-area__corner" />
    </ScrollAreaPrimitive.Root>
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
