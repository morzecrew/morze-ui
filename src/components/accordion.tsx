'use client'

import * as React from 'react'
import { Accordion as AccordionPrimitive } from 'radix-ui'

import { cn } from '../lib/utils'
import { ChevronDownIcon } from '../lib/icons'

function Accordion({ className, ...props }: React.ComponentProps<typeof AccordionPrimitive.Root>) {
  return (
    <AccordionPrimitive.Root
      data-slot="accordion"
      className={cn('mz-accordion', className)}
      {...props}
    />
  )
}

function AccordionItem({
  className,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Item>) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn('mz-accordion-item', className)}
      {...props}
    />
  )
}

function AccordionTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header className="mz-accordion-header">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn('mz-accordion-trigger mz-focusable', className)}
        {...props}
      >
        {children}
        <span className="mz-accordion-trigger__icon" aria-hidden="true">
          <ChevronDownIcon />
        </span>
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
}

function AccordionContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content
      data-slot="accordion-content"
      className={cn('mz-accordion-content', className)}
      {...props}
    >
      <div className="mz-accordion-content__inner">{children}</div>
    </AccordionPrimitive.Content>
  )
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
