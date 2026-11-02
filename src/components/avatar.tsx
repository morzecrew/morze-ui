'use client'

import * as React from 'react'
import { Avatar as AvatarPrimitive } from 'radix-ui'

import { cn } from '../lib/utils'

/** Avatar colours the kit ships (`--mz-avatar-1…8`). */
const SEED_COLOURS = 8

/**
 * A string to one of the avatar colours, the same one every time: a
 * person keeps their colour across lists, sessions and machines. FNV-1a — the
 * spread over seven buckets is what matters, not cryptographic quality.
 */
function avatarSeedIndex(seed: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  // FNV's low bits are weak, and `% 8` reads only them: "ivanov", "petrova"
  // and "admin" all landed on one colour. A final mix spreads the high bits
  // down.
  hash ^= hash >>> 16
  hash = Math.imul(hash, 0x45d9f3b)
  hash ^= hash >>> 16
  return ((hash >>> 0) % SEED_COLOURS) + 1
}

function Avatar({
  className,
  size = 'md',
  seed,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root> & {
  size?: 'sm' | 'md' | 'lg'
  /**
   * Colours the initials by a stable key — a login, an id (N-11): one of the
   * eight `--mz-avatar-*` colours. Without it the fallback wears the tone, as
   * before.
   */
  seed?: string | null
}) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      data-size={size}
      data-seed={seed ? avatarSeedIndex(seed) : undefined}
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

export { Avatar, AvatarGroup, AvatarImage, AvatarFallback, avatarSeedIndex }
