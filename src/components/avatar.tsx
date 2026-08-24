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

export { Avatar, AvatarImage, AvatarFallback }
