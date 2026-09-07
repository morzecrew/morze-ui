'use client'

import * as React from 'react'
import { Toast as ToastPrimitive } from 'radix-ui'

import { cn, type Tone } from '../lib/utils'
import { XIcon } from '../lib/icons'

/* --------------------------------------------------------------------------
   The queue.

   Toasts are raised from wherever the thing that failed happened — a fetch
   handler, a store, an event listener — which is rarely a place that can call
   a hook. So the queue lives outside React and `toast()` is a plain function;
   `<Toaster />` subscribes to it. Everything below the store is presentation.
   -------------------------------------------------------------------------- */

type ToastId = string

type ToastOptions = {
  title?: React.ReactNode
  description?: React.ReactNode
  /** Colour and icon: `danger` for failures, `success` for confirmations. */
  tone?: Tone
  /** Milliseconds on screen. `Infinity` pins it until dismissed. */
  duration?: number
  /** A single control — usually an undo or a retry. */
  action?: React.ReactNode
  onOpenChange?: (open: boolean) => void
}

type ToastRecord = ToastOptions & { id: ToastId }

type ToastHandle = {
  id: ToastId
  dismiss: () => void
  update: (options: ToastOptions) => void
}

/**
 * How many live at once. Beyond this the oldest is dropped: a stack taller
 * than about three is a log, and nobody reads a log that is covering the page.
 */
const TOAST_LIMIT = 3

let queue: ToastRecord[] = []
const listeners = new Set<() => void>()
let counter = 0

function emit() {
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

const getSnapshot = () => queue
/** The server renders an empty viewport; the queue is a client-side thing. */
const emptyQueue: ToastRecord[] = []
const getServerSnapshot = () => emptyQueue

function dismissToast(id: ToastId) {
  const next = queue.filter((t) => t.id !== id)
  if (next.length === queue.length) return
  queue = next
  emit()
}

/**
 * Raise a toast from anywhere — no hook, no context, no provider lookup.
 *
 *   toast({ title: 'Saved', tone: 'success' })
 *   const t = toast({ title: 'Uploading…', duration: Infinity })
 *   t.update({ title: 'Uploaded', tone: 'success', duration: 4000 })
 */
function toast(options: ToastOptions): ToastHandle {
  const id = `mz-toast-${++counter}`
  queue = [...queue, { ...options, id }].slice(-TOAST_LIMIT)
  emit()

  return {
    id,
    dismiss: () => dismissToast(id),
    update: (next) => {
      queue = queue.map((t) => (t.id === id ? { ...t, ...next, id } : t))
      emit()
    },
  }
}

/** Clears every toast on screen, or one by id. */
function dismiss(id?: ToastId) {
  if (id) return dismissToast(id)
  if (queue.length === 0) return
  queue = []
  emit()
}

/**
 * The same queue, as a hook. Prefer the plain `toast()` — this exists for the
 * cases that need to render the live list (a notification centre, a test).
 */
function useToast() {
  const toasts = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  return { toasts, toast, dismiss }
}

/* --------------------------------------------------------------------------
   Presentation.
   -------------------------------------------------------------------------- */

function ToastProvider({ ...props }: React.ComponentProps<typeof ToastPrimitive.Provider>) {
  return <ToastPrimitive.Provider {...props} />
}

function ToastViewport({
  className,
  ...props
}: React.ComponentProps<typeof ToastPrimitive.Viewport>) {
  return (
    <ToastPrimitive.Viewport
      data-slot="toast-viewport"
      className={cn('mz-toast-viewport', className)}
      {...props}
    />
  )
}

function Toast({
  className,
  tone,
  ...props
}: React.ComponentProps<typeof ToastPrimitive.Root> & { tone?: Tone }) {
  return (
    <ToastPrimitive.Root
      data-slot="toast"
      data-tone={tone}
      className={cn('mz-panel mz-toast', className)}
      {...props}
    />
  )
}

function ToastTitle({ className, ...props }: React.ComponentProps<typeof ToastPrimitive.Title>) {
  return (
    <ToastPrimitive.Title
      data-slot="toast-title"
      className={cn('mz-toast__title', className)}
      {...props}
    />
  )
}

function ToastDescription({
  className,
  ...props
}: React.ComponentProps<typeof ToastPrimitive.Description>) {
  return (
    <ToastPrimitive.Description
      data-slot="toast-description"
      className={cn('mz-toast__description', className)}
      {...props}
    />
  )
}

function ToastAction({ className, ...props }: React.ComponentProps<typeof ToastPrimitive.Action>) {
  return (
    <ToastPrimitive.Action
      data-slot="toast-action"
      className={cn('mz-toast__action mz-focusable', className)}
      {...props}
    />
  )
}

function ToastClose({
  className,
  label = 'Close',
  ...props
}: React.ComponentProps<typeof ToastPrimitive.Close> & { label?: string }) {
  return (
    <ToastPrimitive.Close
      data-slot="toast-close"
      className={cn('mz-toast__close mz-focusable', className)}
      {...props}
    >
      <XIcon />
      <span className="mz-sr-only">{label}</span>
    </ToastPrimitive.Close>
  )
}

type ToasterProps = {
  /** Default time on screen for a toast that does not set its own. */
  duration?: number
  /** Which corner the stack grows from. */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  closeLabel?: string
  /** Radix hotkey to focus the viewport. Defaults to Radix's F8. */
  hotkey?: string[]
  className?: string
}

/**
 * Mount once, near the root. It renders whatever `toast()` has queued.
 *
 * `Infinity` is translated to a very large finite duration rather than passed
 * through: Radix multiplies the duration by a swipe factor and `Infinity`
 * arithmetic produced a `NaN` timeout that closed the toast immediately.
 */
function Toaster({
  duration = 5000,
  position = 'bottom-right',
  closeLabel = 'Close',
  hotkey,
  className,
}: ToasterProps) {
  const toasts = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  return (
    <ToastProvider duration={duration} swipeDirection="right" {...(hotkey ? { hotkey } : {})}>
      {toasts.map(({ id, title, description, tone, action, duration: own, onOpenChange }) => (
        <Toast
          key={id}
          tone={tone}
          duration={own === Infinity ? 1000 * 60 * 60 * 24 : own}
          onOpenChange={(open) => {
            onOpenChange?.(open)
            if (!open) dismissToast(id)
          }}
        >
          <div className="mz-toast__body">
            {title ? <ToastTitle>{title}</ToastTitle> : null}
            {description ? <ToastDescription>{description}</ToastDescription> : null}
          </div>
          {action}
          <ToastClose label={closeLabel} />
        </Toast>
      ))}
      <ToastViewport className={cn(`mz-toast-viewport--${position}`, className)} />
    </ToastProvider>
  )
}

export {
  Toaster,
  toast,
  dismiss,
  useToast,
  Toast,
  ToastProvider,
  ToastViewport,
  ToastTitle,
  ToastDescription,
  ToastAction,
  ToastClose,
}
export type { ToastOptions, ToastRecord, ToastHandle, ToasterProps }
