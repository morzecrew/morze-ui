import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'

import {
  DataTable,
  MorzeThemeProvider,
  Sidebar,
  SidebarProvider,
  Tabs,
  TabsList,
  TabsTrigger,
  emptyQuery,
  type DataTableColumn,
} from '../src'
import { setupJsdom } from '../src/testing'

/**
 * happy-dom implements what jsdom does not, so these specs take the APIs away
 * to stand where a host's jsdom suite stands (#10).
 */
const MISSING = [
  [globalThis, 'ResizeObserver'],
  [globalThis, 'IntersectionObserver'],
  [window, 'ResizeObserver'],
  [window, 'IntersectionObserver'],
  [window, 'matchMedia'],
  [Element.prototype, 'scrollIntoView'],
  [Element.prototype, 'hasPointerCapture'],
  [Element.prototype, 'setPointerCapture'],
  [Element.prototype, 'releasePointerCapture'],
] as const

let saved: (PropertyDescriptor | undefined)[] = []

beforeEach(() => {
  saved = MISSING.map(([target, key]) => {
    const descriptor = Object.getOwnPropertyDescriptor(target, key)
    delete (target as unknown as Record<string, unknown>)[key]
    return descriptor
  })
})

afterEach(() => {
  MISSING.forEach(([target, key], index) => {
    const descriptor = saved[index]
    if (descriptor) Object.defineProperty(target, key, descriptor)
  })
})

type Row = { id: string; name: string }
const columns: DataTableColumn<Row>[] = [{ id: 'name', header: 'Name', accessor: (r) => r.name }]

const screenOfTheKit = () => (
  <MorzeThemeProvider defaultTheme="system" storageKey={null}>
    <SidebarProvider storageKey={null}>
      <Sidebar />
      <Tabs defaultValue="a">
        <TabsList overflow="menu">
          <TabsTrigger value="a">A</TabsTrigger>
        </TabsList>
      </Tabs>
      <DataTable
        columns={columns}
        data={[{ id: '1', name: 'First' }]}
        rowKey={(r) => r.id}
        query={emptyQuery}
        onQueryChange={() => {}}
        virtualize
        maxHeight={200}
      />
    </SidebarProvider>
  </MorzeThemeProvider>
)

describe('without the browser APIs jsdom lacks (#10)', () => {
  it('mounts the kit instead of throwing', () => {
    expect(typeof (globalThis as { ResizeObserver?: unknown }).ResizeObserver).toBe('undefined')
    expect(() => render(screenOfTheKit())).not.toThrow()
  })
})

describe('setupJsdom', () => {
  it('installs what is missing and takes it away again', () => {
    const restore = setupJsdom()
    expect(typeof ResizeObserver).toBe('function')
    expect(typeof IntersectionObserver).toBe('function')
    expect(window.matchMedia('(max-width: 10px)').matches).toBe(false)
    expect(() => document.body.scrollIntoView()).not.toThrow()
    expect(document.body.hasPointerCapture(1)).toBe(false)
    expect(() => render(screenOfTheKit())).not.toThrow()

    restore()
    expect(typeof (globalThis as { ResizeObserver?: unknown }).ResizeObserver).toBe('undefined')
    expect('scrollIntoView' in Element.prototype).toBe(false)
  })

  it('leaves an environment’s own implementation alone', () => {
    const own = function matchMedia() {}
    Object.defineProperty(window, 'matchMedia', { configurable: true, writable: true, value: own })
    const restore = setupJsdom()
    expect(window.matchMedia).toBe(own)
    restore()
    expect(window.matchMedia).toBe(own)
  })
})
