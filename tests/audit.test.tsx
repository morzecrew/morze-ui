import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import {
  Card,
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
