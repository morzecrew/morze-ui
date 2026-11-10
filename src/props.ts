import type * as React from 'react'

import type { Alert } from './components/alert'
import type { Avatar, AvatarGroup } from './components/avatar'
import type { Badge } from './components/badge'
import type { DialogContent } from './components/dialog'
import type { Field } from './components/field'
import type { Kbd, KbdSequence } from './components/kbd'
import type { Label } from './components/label'
import type { Progress } from './components/progress'
import type { RadioGroup } from './components/radio-group'
import type { ScrollArea } from './components/scroll-area'
import type { SelectTrigger } from './components/select'
import type { Separator } from './components/separator'
import type { SheetContent } from './components/sheet'
import type { Skeleton } from './components/skeleton'
import type { Toggle } from './components/toggle'
import type { ToggleGroup } from './components/toggle-group'

/**
 * Props of the components whose file does not name its own props type. Half
 * the kit exported `FooProps` and half did not, so a host wrapping `Badge`
 * or `DialogContent` had to spell `React.ComponentProps<typeof Badge>` —
 * and could not tell from the index which of the two it was looking at.
 * Derived rather than restated, so they cannot drift from the components.
 */
export type AlertProps = React.ComponentProps<typeof Alert>
export type AvatarProps = React.ComponentProps<typeof Avatar>
export type AvatarGroupProps = React.ComponentProps<typeof AvatarGroup>
export type BadgeProps = React.ComponentProps<typeof Badge>
export type DialogContentProps = React.ComponentProps<typeof DialogContent>
export type FieldProps = React.ComponentProps<typeof Field>
export type KbdProps = React.ComponentProps<typeof Kbd>
export type KbdSequenceProps = React.ComponentProps<typeof KbdSequence>
export type LabelProps = React.ComponentProps<typeof Label>
export type ProgressProps = React.ComponentProps<typeof Progress>
export type RadioGroupProps = React.ComponentProps<typeof RadioGroup>
export type ScrollAreaProps = React.ComponentProps<typeof ScrollArea>
export type SelectTriggerProps = React.ComponentProps<typeof SelectTrigger>
export type SeparatorProps = React.ComponentProps<typeof Separator>
export type SheetContentProps = React.ComponentProps<typeof SheetContent>
export type SkeletonProps = React.ComponentProps<typeof Skeleton>
export type ToggleProps = React.ComponentProps<typeof Toggle>
export type ToggleGroupProps = React.ComponentProps<typeof ToggleGroup>
