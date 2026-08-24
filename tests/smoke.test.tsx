import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import {
  Button,
  Card,
  Checkbox,
  MorzeThemeProvider,
  Progress,
  Slider,
  Spinner,
  Switch,
  Toggle,
  ToggleGroup,
  ToggleGroupItem,
  buttonVariants,
} from '../src'

describe('Button', () => {
  it('renders the variant and size contract shadcn consumers expect', () => {
    render(<Button variant="secondary" size="lg" tone="accent" />)
    const btn = screen.getByRole('button')
    expect(btn).toHaveAttribute('data-slot', 'button')
    expect(btn).toHaveAttribute('data-variant', 'secondary')
    expect(btn).toHaveAttribute('data-size', 'lg')
    expect(btn).toHaveAttribute('data-tone', 'accent')
  })

  it('keeps the accessible name while loading', () => {
    render(
      <Button loading>
        <span>Save</span>
      </Button>
    )
    // The label must survive: the loading style dims it, it does not remove it.
    expect(screen.getByRole('button', { name: /Save/ })).toBeTruthy()
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true')
  })

  it('renders the spinner inside a slotted child and marks it disabled', () => {
    const { container } = render(
      <Button asChild loading>
        <a href="/save">Save</a>
      </Button>
    )
    const link = container.querySelector('a')!
    expect(link.getAttribute('aria-disabled')).toBe('true')
    expect(link.querySelector('.mz-btn__spinner')).not.toBeNull()
    expect(link.textContent).toContain('Save')
  })

  it('carries the focus ring through buttonVariants', () => {
    expect(buttonVariants({ variant: 'outline' })).toContain('mz-focusable')
  })
})

describe('Progress', () => {
  it('scales against max instead of a hardcoded 100', () => {
    const { container } = render(<Progress value={25} max={50} />)
    const indicator = container.querySelector('[data-slot="progress-indicator"]') as HTMLElement
    expect(indicator.style.transform).toBe('translateX(-50%)')
  })

  it('clamps out-of-range values to a valid transform', () => {
    const { container } = render(<Progress value={150} />)
    const indicator = container.querySelector('[data-slot="progress-indicator"]') as HTMLElement
    expect(indicator.style.transform).toBe('translateX(-0%)')
    expect(indicator.style.transform).not.toContain('--')
  })
})

describe('Slider', () => {
  it('renders one thumb when uncontrolled with no default', () => {
    const { container } = render(<Slider />)
    expect(container.querySelectorAll('[data-slot="slider-thumb"]')).toHaveLength(1)
  })

  it('renders one thumb per value', () => {
    const { container } = render(<Slider defaultValue={[20, 70]} />)
    expect(container.querySelectorAll('[data-slot="slider-thumb"]')).toHaveLength(2)
  })
})

describe('Checkbox', () => {
  it('exposes the mixed state through the DOM, not through props', () => {
    const { container } = render(<Checkbox checked="indeterminate" />)
    const root = container.querySelector('[data-slot="checkbox"]')!
    expect(root).toHaveAttribute('data-state', 'indeterminate')
    // Both glyphs are present; CSS decides which one shows.
    expect(container.querySelector('.mz-checkbox__check')).not.toBeNull()
    expect(container.querySelector('.mz-checkbox__dash')).not.toBeNull()
  })

  it('toggles on click', async () => {
    render(<Checkbox />)
    const box = screen.getByRole('checkbox')
    expect(box).toHaveAttribute('data-state', 'unchecked')
    await userEvent.click(box)
    expect(box).toHaveAttribute('data-state', 'checked')
  })
})

describe('ToggleGroup', () => {
  it('lets an item override the group defaults', () => {
    const { container } = render(
      <ToggleGroup type="single" size="sm">
        <ToggleGroupItem value="a" size="lg">
          A
        </ToggleGroupItem>
      </ToggleGroup>
    )
    const item = container.querySelector('[data-slot="toggle-group-item"]')!
    expect(item).toHaveAttribute('data-size', 'lg')
    expect(item.className).toContain('mz-toggle--lg')
  })

  it('keeps the spaced gap when a consumer passes style', () => {
    const { container } = render(
      <ToggleGroup type="single" appearance="spaced" style={{ marginTop: 8 }}>
        <ToggleGroupItem value="a">A</ToggleGroupItem>
      </ToggleGroup>
    )
    const group = container.querySelector('[data-slot="toggle-group"]') as HTMLElement
    expect(group.style.getPropertyValue('--mz-toggle-group-gap')).toBe('8px')
    expect(group.style.marginTop).toBe('8px')
  })
})

describe('Spinner', () => {
  it('has an accessible name by default and can opt out', () => {
    const { rerender } = render(<Spinner />)
    expect(screen.getByRole('status')).toHaveTextContent('Loading')
    rerender(<Spinner label={null} />)
    expect(screen.queryByRole('status')).toBeNull()
  })
})

describe('Card', () => {
  it('is keyboard operable once it is clickable', async () => {
    let clicks = 0
    render(
      <Card interactive onClick={() => (clicks += 1)}>
        content
      </Card>
    )
    const card = screen.getByRole('button')
    expect(card).toHaveAttribute('tabindex', '0')
    card.focus()
    await userEvent.keyboard('{Enter}')
    expect(clicks).toBe(1)
  })

  it('stays a plain container when it is only decorative', () => {
    render(<Card interactive>content</Card>)
    expect(screen.queryByRole('button')).toBeNull()
  })
})

describe('Switch and Toggle', () => {
  it('flips state on click', async () => {
    render(<Switch />)
    const sw = screen.getByRole('switch')
    await userEvent.click(sw)
    expect(sw).toHaveAttribute('data-state', 'checked')
  })

  it('pressed toggle reports aria-pressed', async () => {
    render(<Toggle>Bold</Toggle>)
    const toggle = screen.getByRole('button', { name: 'Bold' })
    await userEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('MorzeThemeProvider', () => {
  it('renders the default theme on the first pass so hydration matches', () => {
    window.localStorage.setItem('morze-ui-theme', 'light')
    const { container } = render(
      <MorzeThemeProvider target="element" defaultTheme="dark">
        <span>x</span>
      </MorzeThemeProvider>
    )
    // The stored preference is applied in an effect, never during render.
    expect(container.querySelector('[data-slot="morze-root"]')).toHaveAttribute('class', 'mz-root')
    window.localStorage.removeItem('morze-ui-theme')
  })

  it('survives blocked storage', () => {
    const original = Object.getOwnPropertyDescriptor(window, 'localStorage')
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('site data blocked')
      },
    })
    expect(() =>
      render(
        <MorzeThemeProvider>
          <span>x</span>
        </MorzeThemeProvider>
      )
    ).not.toThrow()
    if (original) Object.defineProperty(window, 'localStorage', original)
  })
})
