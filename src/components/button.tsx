'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'

import { cn, type Tone } from '../lib/utils'
import { SpinnerIcon } from '../lib/icons'

// mz-focusable belongs to the base string so buttonVariants() carries the focus
// ring onto elements that are styled as buttons without being one.
const buttonVariants = cva('mz-btn mz-focusable', {
  variants: {
    variant: {
      primary: 'mz-btn--primary',
      secondary: 'mz-btn--secondary',
      outline: 'mz-btn--outline',
      ghost: 'mz-btn--ghost',
      destructive: 'mz-btn--destructive',
      link: 'mz-btn--link',
    },
    size: {
      xs: 'mz-btn--xs',
      sm: 'mz-btn--sm',
      md: 'mz-btn--md',
      lg: 'mz-btn--lg',
      'icon-xs': 'mz-btn--icon-xs',
      'icon-sm': 'mz-btn--icon-sm',
      icon: 'mz-btn--icon',
      'icon-lg': 'mz-btn--icon-lg',
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
})

type ButtonProps = React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    /** Re-points the convex gradient, glow and focus ring to another tone. */
    tone?: Tone
    /** Swaps the label for a spinner and blocks interaction. */
    loading?: boolean
    /** Pulsing morse dot before the label — the landing's signature accent. */
    dot?: boolean
  }

function Button({
  className,
  variant = 'primary',
  size = 'md',
  asChild = false,
  tone,
  loading = false,
  dot = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : 'button'
  const isDisabled = disabled || loading

  const decorate = (label: React.ReactNode) => (
    <>
      {dot ? <span className="mz-btn__dot" aria-hidden="true" /> : null}
      {label}
      {loading ? (
        <span className="mz-btn__spinner" aria-hidden="true">
          <SpinnerIcon />
        </span>
      ) : null}
    </>
  )

  // Slot takes exactly one child, so the decorations are grafted inside it
  // rather than rendered as siblings — otherwise `loading` would blank the
  // label with no spinner to replace it.
  let content: React.ReactNode
  if (asChild) {
    const child = React.Children.only(children) as React.ReactElement<{
      children?: React.ReactNode
    }>
    content = React.cloneElement(child, undefined, decorate(child.props.children))
  } else {
    content = decorate(children)
  }

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      data-tone={tone}
      data-loading={loading || undefined}
      className={cn(buttonVariants({ variant, size }), className)}
      // A slotted element may not support `disabled` (a link, for one), so the
      // state is also expressed through aria, which the CSS honours.
      disabled={asChild ? undefined : isDisabled}
      aria-disabled={asChild && isDisabled ? true : undefined}
      aria-busy={loading || undefined}
      {...props}
    >
      {content}
    </Comp>
  )
}

export { Button, buttonVariants }
export type { ButtonProps }
