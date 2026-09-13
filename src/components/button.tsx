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
  }

/*
 * `disabled` and `aria-disabled` are two different answers (K-07).
 *
 * A natively disabled button is inert to the platform: it dispatches no mouse
 * events at all, so nothing can be hung over it — a tooltip explaining *why*
 * the button is off never opens, which is the one moment a reader most needs
 * one. (The kit's `pointer-events: none` is what lets the old workaround —
 * wrapping the button in the tooltip's own trigger — work at all, because the
 * hit test then reaches the wrapper.)
 *
 * `aria-disabled` is the other answer: the control keeps its place in the tab
 * order and on the pointer's map, announces itself as unavailable, and the
 * component refuses the activation instead of the browser. Hover it, focus it,
 * read why. What it cannot do is act.
 */
function refusal({
  asChild,
  off,
  ariaDisabled,
}: {
  asChild: boolean
  off: boolean
  ariaDisabled: ButtonProps['aria-disabled']
}) {
  const soft = !off && (ariaDisabled === true || ariaDisabled === 'true')
  return {
    // A slotted element may not support `disabled` (a link, for one), so the
    // state is also expressed through aria, which the CSS honours.
    disabled: asChild ? undefined : off,
    'aria-disabled': soft || (asChild && off) ? true : undefined,
    soft,
  }
}

/** What a soft-disabled control answers a click with. `preventDefault`,
    because a click on a submit button is a form submission before it is ever a
    handler; `stopPropagation`, because a row or a card around it must not take
    the click the button has just declined. */
const refuse = (event: React.MouseEvent) => {
  event.preventDefault()
  event.stopPropagation()
}

function Button({
  className,
  variant = 'primary',
  size = 'md',
  asChild = false,
  tone,
  loading = false,
  disabled,
  'aria-disabled': ariaDisabled,
  onClick,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : 'button'
  const { soft, ...state } = refusal({ asChild, off: disabled || loading, ariaDisabled })

  const decorate = (label: React.ReactNode) => (
    <>
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
      {...state}
      aria-busy={loading || undefined}
      onClick={soft ? refuse : onClick}
      {...props}
    >
      {content}
    </Comp>
  )
}

export { Button, buttonVariants }
export type { ButtonProps }
