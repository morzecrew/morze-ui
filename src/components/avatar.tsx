'use client'

import * as React from 'react'
import { Avatar as AvatarPrimitive } from 'radix-ui'

import { cn } from '../lib/utils'

function Avatar({
  className,
  size = 'md',
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root> & { size?: 'sm' | 'md' | 'lg' }) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      data-size={size}
      className={cn(
        'mz-avatar',
        size === 'sm' && 'mz-avatar--sm',
        size === 'lg' && 'mz-avatar--lg',
        className
      )}
      {...props}
    />
  )
}

/**
 * Lays avatars in an overlapping stack. Each avatar gets a ring in the
 * surface colour so the overlap reads as depth; set `--mz-avatar-ring` on the
 * group when it sits on something other than a card.
 *
 * `max` caps the stack and closes it with a "+N" chip — a team of forty
 * otherwise laid forty avatars across the row, and every host wrote the same
 * slice-and-count by hand.
 */
function AvatarGroup({
  className,
  max,
  size,
  children,
  ...props
}: React.ComponentProps<'div'> & {
  max?: number
  /** Size for the overflow chip, so it matches the avatars it closes. */
  size?: 'sm' | 'md' | 'lg'
}) {
  // Counted over the rendered children, not over an array the host passes:
  // the group takes elements, and `null` entries from a conditional render
  // are not people.
  const items = React.Children.toArray(children).filter(React.isValidElement)
  const capped = max !== undefined && max > 0 && items.length > max
  // The chip occupies one of the `max` slots, so `max` is the number of
  // circles on screen either way.
  const shown = capped ? items.slice(0, Math.max(max - 1, 0)) : items
  const hidden = items.length - shown.length

  return (
    <div data-slot="avatar-group" role="group" className={cn('mz-avatar-group', className)} {...props}>
      {shown}
      {capped ? (
        <Avatar
          size={size}
          data-slot="avatar-overflow"
          className="mz-avatar--overflow"
          aria-label={`+${hidden}`}
        >
          <AvatarFallback>+{hidden}</AvatarFallback>
        </Avatar>
      ) : null}
    </div>
  )
}

function AvatarImage({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn('mz-avatar__image', className)}
      {...props}
    />
  )
}

function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn('mz-avatar__fallback', className)}
      {...props}
    />
  )
}

export { Avatar, AvatarGroup, AvatarImage, AvatarFallback }
