'use client'

import * as React from 'react'
import { Slider as SliderPrimitive } from 'radix-ui'

import { cn, type Tone } from '../lib/utils'

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  tone,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root> & { tone?: Tone }) {
  // Radix's uncontrolled state defaults to a single value, so the thumb count
  // has to fall back to one — [min, max] would render an extra thumb that
  // tracks nothing.
  const values = React.useMemo(
    () =>
      Array.isArray(value) ? value : Array.isArray(defaultValue) ? defaultValue : [min],
    [value, defaultValue, min]
  )

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      data-tone={tone}
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      className={cn('mz-slider', className)}
      {...props}
    >
      <SliderPrimitive.Track data-slot="slider-track" className="mz-slider__track">
        <SliderPrimitive.Range data-slot="slider-range" className="mz-slider__range" />
      </SliderPrimitive.Track>
      {Array.from({ length: values.length }, (_, index) => (
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          key={index}
          className="mz-slider__thumb mz-focusable"
        />
      ))}
    </SliderPrimitive.Root>
  )
}

export { Slider }
