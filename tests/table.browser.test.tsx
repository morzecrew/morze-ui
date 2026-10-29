import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../src'
import '../src/styles/index.css'

const settle = (ms = 100) => new Promise((resolve) => setTimeout(resolve, ms))

/** A row label kept in view while the figures scroll under it (#36). */
describe('Table pinned column', () => {
  it('stays at the start edge on an opaque ground, with a seam once scrolled', async () => {
    const months = Array.from({ length: 12 }, (_, i) => `Month ${i + 1}`)
    const { container } = render(
      <div style={{ width: 400 }}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead pinned>Line</TableHead>
              {months.map((m) => (
                <TableHead key={m} numeric style={{ minWidth: 120 }}>
                  {m}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell pinned>Revenue</TableCell>
              {months.map((m) => (
                <TableCell key={m} numeric>
                  1 000
                </TableCell>
              ))}
            </TableRow>
          </TableBody>
        </Table>
      </div>
    )
    const wrap = container.querySelector<HTMLElement>('.mz-table-wrap')!
    const cell = container.querySelector<HTMLElement>('td[data-pinned]')!
    const head = container.querySelector<HTMLElement>('th[data-pinned]')!
    expect(wrap.scrollWidth).toBeGreaterThan(wrap.clientWidth)
    expect(wrap).not.toHaveAttribute('data-scrolled-start')

    wrap.scrollLeft = 300
    wrap.dispatchEvent(new Event('scroll'))
    await settle()
    const edge = wrap.getBoundingClientRect().left
    expect(Math.abs(cell.getBoundingClientRect().left - edge)).toBeLessThanOrEqual(1)
    expect(Math.abs(head.getBoundingClientRect().left - edge)).toBeLessThanOrEqual(1)
    expect(wrap).toHaveAttribute('data-scrolled-start')
    // Opaque on both, or the scrolled figures show through (the header used
    // to be a translucent frost).
    const alphaOf = (color: string) => {
      const slash = /\/\s*([\d.]+%?)\s*\)$/.exec(color)?.[1]
      if (slash) return slash.endsWith('%') ? parseFloat(slash) / 100 : Number(slash)
      const rgba = /^rgba\([^)]*,\s*([\d.]+)\)$/.exec(color)?.[1]
      if (rgba) return Number(rgba)
      return color === 'transparent' ? 0 : 1
    }
    for (const el of [cell, head]) {
      const color = getComputedStyle(el).backgroundColor
      expect(alphaOf(color), color).toBe(1)
    }
    // And the check can fail: a translucent ground is caught.
    expect(alphaOf('color(srgb 0.1 0.1 0.2 / 0.8)')).toBe(0.8)
    expect(alphaOf('rgba(0, 0, 0, 0)')).toBe(0)
    expect(getComputedStyle(cell).boxShadow).not.toBe('none')
  })
})
