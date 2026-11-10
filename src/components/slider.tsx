'use client'

import * as React from 'react'
import { Slider as SliderPrimitive } from 'radix-ui'

import { cn, type Tone } from '../lib/utils'

type SliderProps = React.ComponentProps<typeof SliderPrimitive.Root> & {
  tone?: Tone
  /**
   * A name for each thumb of a range, in order — "From" and "To", "Minimum
   * price" and "Maximum price". Without it every thumb takes the slider's own
   * `aria-label` / `aria-labelledby`, which names a single thumb well and the
   * two ends of a range the same.
   */
  thumbLabels?: string[]
}

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  tone,
  thumbLabels,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
  ...props
}: SliderProps) {
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
      {/* The name goes on the thumbs, not the root: the root is a plain span
          with no role, so a name on it named nothing, and each `slider` a
          reader lands on was announced as a bare number. A thumb's own label
          wins over the shared one; aria-labelledby would win over it again,
          so a thumb with its own label does not get both. */}
      {Array.from({ length: values.length }, (_, index) => {
        const own = thumbLabels?.[index]
        return (
          <SliderPrimitive.Thumb
            data-slot="slider-thumb"
            key={index}
            aria-label={own ?? ariaLabel}
            aria-labelledby={own ? undefined : ariaLabelledby}
            className="mz-slider__thumb mz-focusable"
          />
        )
      })}
    </SliderPrimitive.Root>
  )
}

export { Slider }
export type { SliderProps }
