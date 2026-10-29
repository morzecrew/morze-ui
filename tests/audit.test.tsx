import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import {
  Card,
  NumberInput,
  DataTable,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  emptyQuery,
} from '../src'

/** Component behaviour asked for by the 2026-10 UX audit (#13 – #25). */

describe('numeric columns (#17)', () => {
  it('marks a figure cell and its header in the plain table', () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead numeric>Sum</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell numeric>1 200</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )
    expect(screen.getByRole('columnheader')).toHaveAttribute('data-numeric', 'true')
    expect(screen.getByRole('cell')).toHaveAttribute('data-numeric', 'true')
  })

  it('right-aligns a numeric grid column unless told otherwise', () => {
    type Row = { id: string; sum: number }
    render(
      <DataTable<Row>
        columns={[
          { id: 'sum', header: 'Sum', accessor: (r) => r.sum, numeric: true },
          { id: 'id', header: 'Id', accessor: (r) => r.id, numeric: true, align: 'center' },
        ]}
        data={[{ id: '1', sum: 1200 }]}
        rowKey={(r) => r.id}
        query={emptyQuery}
        onQueryChange={() => {}}
      />
    )
    const [sum, id] = screen.getAllByRole('cell')
    expect(sum).toHaveAttribute('data-numeric', 'true')
    expect(sum).toHaveAttribute('data-align', 'right')
    expect(id).toHaveAttribute('data-align', 'center')
  })
})

// "Golos Text" was declared and never shipped; a host that forgot to load it
// got whatever the OS had, silently (#24).
describe('the default face', () => {
  it('ships it, under the family name the token asks for', async () => {
    const { execFileSync } = await import('node:child_process')
    const { existsSync, readFileSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    const root = resolve(__dirname, '..')
    execFileSync('node', ['scripts/build-css.mjs'], { cwd: root, stdio: 'ignore' })
    const css = readFileSync(resolve(root, 'dist/morze-ui-fonts.css'), 'utf8')
    const urls = [...css.matchAll(/url\(\.\/(fonts\/[^)]+\.woff2)\)/g)].map((m) => m[1]!)
    expect(urls).toHaveLength(4)
    for (const url of urls) expect(existsSync(resolve(root, 'dist', url)), url).toBe(true)
    expect(css).toMatch(/font-family:"?Golos Text"?;/)
    expect(css).toContain('font-display:swap')
    expect(existsSync(resolve(root, 'dist/fonts/OFL.txt'))).toBe(true)
    const tokens = readFileSync(resolve(root, 'src/styles/tokens.css'), 'utf8')
    expect(tokens).toMatch(/--mz-font-sans: 'Golos Text',/)
  })

  describe('the development warning', () => {
    const fakeCanvas = (measure: (font: string) => number) => {
      const original = HTMLCanvasElement.prototype.getContext
      HTMLCanvasElement.prototype.getContext = function () {
        const context = { font: '', measureText: () => ({ width: measure(context.font) }) }
        return context
      } as unknown as typeof original
      return () => {
        HTMLCanvasElement.prototype.getContext = original
      }
    }

    it('tells a face that draws from one that falls back', async () => {
      const { isFontAvailable } = await import('../src/lib/font-check')
      let restore = fakeCanvas(() => 100)
      expect(isFontAvailable('Missing Face')).toBe(false)
      restore()
      restore = fakeCanvas((font) => (font.includes('Real Face') ? 120 : 100))
      expect(isFontAvailable('Real Face')).toBe(true)
      restore()
    })

    it('warns once, naming the face and the fix', async () => {
      const { warnIfFontMissing, resetFontWarning } = await import('../src/lib/font-check')
      const { vi } = await import('vitest')
      resetFontWarning()
      const restore = fakeCanvas(() => 100)
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const element = document.createElement('div')
      element.style.fontFamily = '"Missing Face", sans-serif'
      document.body.appendChild(element)
      warnIfFontMissing(element)
      warnIfFontMissing(element)
      await new Promise((resolve) => setTimeout(resolve, 0))
      expect(warn).toHaveBeenCalledTimes(1)
      expect(warn.mock.calls[0]![0]).toContain('Missing Face')
      expect(warn.mock.calls[0]![0]).toContain('@morze/ui/fonts.css')
      warn.mockRestore()
      restore()
      element.remove()
      resetFontWarning()
    })

    it('stays quiet about a generic family', async () => {
      const { firstFamily } = await import('../src/lib/font-check')
      const element = document.createElement('div')
      element.style.fontFamily = 'system-ui, sans-serif'
      document.body.appendChild(element)
      expect(firstFamily(element)).toBeNull()
      element.remove()
    })
  })
})

describe('Card (#32, #35)', () => {
  it('is the link itself under asChild, with the focus ring on it', () => {
    render(
      <Card interactive asChild>
        <a href="/orders">Orders</a>
      </Card>
    )
    const link = screen.getByRole('link', { name: 'Orders' })
    expect(link).toHaveClass('mz-card', 'mz-card--interactive', 'mz-focusable')
    expect(link).not.toHaveAttribute('role')
    expect(link).not.toHaveAttribute('tabindex')
  })

  it('says it is chosen', () => {
    render(
      <>
        <Card interactive pressed onClick={() => {}}>
          Segment A
        </Card>
        <Card interactive pressed={false} onClick={() => {}}>
          Segment B
        </Card>
        <Card interactive pressed>
          Static
        </Card>
      </>
    )
    expect(screen.getByRole('button', { name: 'Segment A' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Segment B' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByText('Static')).toHaveAttribute('data-state', 'on')
  })
})

describe('DataTable toolbar and glass (#28, #41)', () => {
  type Row = { id: string }
  const table = (props: Partial<React.ComponentProps<typeof DataTable<Row>>>) =>
    render(
      <DataTable<Row>
        columns={[{ id: 'id', header: 'Id', accessor: (r) => r.id }]}
        data={[{ id: '1' }]}
        rowKey={(r) => r.id}
        query={emptyQuery}
        onQueryChange={() => {}}
        {...props}
      />
    )

  it('puts toolbarEnd at the end of the row, before the Columns button', () => {
    const { container } = table({ toolbar: <span>start</span>, toolbarEnd: <button>Export</button> })
    const side = container.querySelector('.mz-dt__toolbar-side')!
    expect(side.firstElementChild).toHaveTextContent('Export')
    expect(container.querySelector('.mz-dt__toolbar-main')).toHaveTextContent('start')
  })

  it('frosts its header only when asked', () => {
    expect(table({}).container.querySelector('.mz-dt')).not.toHaveAttribute('data-glass')
    expect(table({ glass: true }).container.querySelector('.mz-dt')).toHaveAttribute('data-glass', 'true')
  })
})

describe('NumberInput grouping (#40)', () => {
  const field = () => screen.getByRole('spinbutton', { name: 'Amount' }) as HTMLInputElement
  const spaces = (text: string) => text.replace(/[  ]/g, ' ')

  it('groups thousands while typing', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const { vi } = await import('vitest')
    const onChange = vi.fn()
    render(<NumberInput locale="ru-RU" onChange={onChange} aria-label="Amount" />)
    // Typed one key at a time at the caret: a caret left behind by the
    // regrouping would put the later digits in the wrong place.
    await userEvent.type(field(), '1000000,5')
    expect(spaces(field().value)).toBe('1 000 000,5')
    expect(onChange).toHaveBeenLastCalledWith(1000000.5)
    // Where the caret goes in the middle of the text is a real browser's to
    // say — see tests/number-input.browser.test.tsx.
  })

  it('shows the locale’s own grouping once the field is left', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    render(
      <>
        <NumberInput locale="en-US" defaultValue={1200000} aria-label="Amount" />
        <button type="button">elsewhere</button>
      </>
    )
    expect(field().value).toBe('1,200,000')
    // Editing swaps the commas for spaces, so nothing typed can be read as one.
    await userEvent.click(field())
    expect(spaces(field().value)).toBe('1 200 000')
    await userEvent.click(screen.getByRole('button', { name: 'elsewhere' }))
    expect(field().value).toBe('1,200,000')
  })

  it('still reads a comma as a decimal sign under an English locale', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const { vi } = await import('vitest')
    const onChange = vi.fn()
    render(<NumberInput locale="en-US" onChange={onChange} aria-label="Amount" />)
    // An English browser in a Russian app: «1,5» is one and a half, not 15.
    await userEvent.type(field(), '1,5')
    expect(onChange).toHaveBeenLastCalledWith(1.5)
  })

  it('leaves codes and years alone when asked', async () => {
    render(<NumberInput locale="ru-RU" defaultValue={2026} grouping={false} aria-label="Amount" />)
    expect(field().value).toBe('2026')
  })
})

describe('NumberInput bounds (#33)', () => {
  it('says a typed value is out of bounds at once, and when it is back', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const { vi } = await import('vitest')
    const onRangeChange = vi.fn()
    render(
      <>
        <NumberInput max={99} onRangeChange={onRangeChange} aria-label="Amount" />
        <button type="button">elsewhere</button>
      </>
    )
    const field = screen.getByRole('spinbutton', { name: 'Amount' })
    await userEvent.type(field, '100')
    expect(field).toHaveAttribute('aria-invalid', 'true')
    expect(onRangeChange).toHaveBeenLastCalledWith('max')
    // Leaving clamps it, and the field is valid again.
    await userEvent.click(screen.getByRole('button', { name: 'elsewhere' }))
    expect(field).not.toHaveAttribute('aria-invalid')
    expect(onRangeChange).toHaveBeenLastCalledWith(false)
    expect(onRangeChange).toHaveBeenCalledTimes(2)
  })

  it('keeps a host’s own aria-invalid', () => {
    render(<NumberInput defaultValue={5} aria-invalid aria-label="Amount" />)
    expect(screen.getByRole('spinbutton', { name: 'Amount' })).toHaveAttribute('aria-invalid', 'true')
  })
})

// A grouped metric picker had to be rebuilt on Command (#27).
describe('Combobox option groups', () => {
  const metrics = [
    { value: 'rev', label: 'Revenue', group: 'Sales' },
    { value: 'cogs', label: 'Cost of goods', group: 'Costs' },
    { value: 'orders', label: 'Orders', group: 'Sales' },
    { value: 'rent', label: 'Rent', group: 'Costs' },
  ]

  it('lists each option under its heading, groups in first-seen order', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const { MultiSelect } = await import('../src')
    render(<MultiSelect options={metrics} aria-label="Metrics" />)
    await userEvent.click(screen.getByRole('combobox', { name: 'Metrics' }))
    const groups = screen.getAllByRole('group')
    expect(groups.map((g) => g.getAttribute('aria-labelledby') && document.getElementById(g.getAttribute('aria-labelledby')!)?.textContent)).toEqual(['Sales', 'Costs'])
    // Revenue and Orders together under Sales, though Orders came third.
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Revenue', 'Orders', 'Cost of goods', 'Rent'])
  })

  it('drops a heading the search has emptied, and walks the rows as they are drawn', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const { vi } = await import('vitest')
    const { Combobox } = await import('../src')
    const onChange = vi.fn()
    render(<Combobox options={metrics} onChange={onChange} aria-label="Metric" />)
    await userEvent.click(screen.getByRole('combobox', { name: 'Metric' }))
    // Only Sales has a match, so Costs and its heading go.
    await userEvent.type(screen.getByRole('searchbox'), 'ord')
    expect(screen.getAllByRole('group')).toHaveLength(1)
    expect(screen.queryByText('Costs')).toBeNull()

    await userEvent.clear(screen.getByRole('searchbox'))
    // Down from the top: the second row drawn is Orders, not Cost of goods.
    await userEvent.keyboard('{ArrowDown}{Enter}')
    expect(onChange).toHaveBeenLastCalledWith('orders', expect.objectContaining({ value: 'orders' }))
  })
})
