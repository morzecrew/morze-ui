import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'

import { Card, DataTable, SidebarInset, SidebarPanel, SidebarProvider, emptyQuery } from '../src'
import '../src/styles/index.css'

/**
 * Blocks on the page panel are flat; what floats keeps its shadow (#46).
 * Computed styles, so a real engine resolves the cascade.
 */
describe('surfaces on the page panel', () => {
  const shadow = (el: Element | null) => getComputedStyle(el!).boxShadow

  it('draws cards and tables flat inside SidebarPanel, raised elsewhere', () => {
    const table = (frame?: 'card' | 'flat') => (
      <DataTable
        frame={frame}
        columns={[{ id: 'id', header: 'Id', accessor: (r: { id: string }) => r.id }]}
        data={[{ id: '1' }]}
        rowKey={(r) => r.id}
        query={emptyQuery}
        onQueryChange={() => {}}
      />
    )
    const { container } = render(
      <>
        <div data-testid="page">
          <Card data-testid="loose">Loose</Card>
          <Card data-testid="flat-anywhere" elevation="flat">Flat</Card>
          {table()}
        </div>
        <SidebarProvider storageKey={null}>
          <SidebarInset>
            <SidebarPanel>
              <Card data-testid="in-panel">In panel</Card>
              <Card data-testid="floats" elevation="raised">Floats</Card>
              <Card data-testid="chosen" interactive pressed onClick={() => {}}>Chosen</Card>
              {table()}
              {table('card')}
            </SidebarPanel>
          </SidebarInset>
        </SidebarProvider>
      </>
    )
    const card = (id: string) => container.querySelector(`[data-testid="${id}"]`)
    expect(shadow(card('loose'))).not.toBe('none')
    expect(shadow(card('flat-anywhere'))).toBe('none')
    expect(shadow(card('in-panel'))).toBe('none')
    expect(getComputedStyle(card('in-panel')!).borderTopStyle).toBe('solid')
    expect(shadow(card('floats'))).not.toBe('none')
    // A chosen card keeps its tone ring on the panel.
    expect(shadow(card('chosen'))).toContain('inset')

    const scrollers = [...container.querySelectorAll('.mz-dt__scroller')]
    expect(shadow(scrollers[0]!)).not.toBe('none') // on the page
    expect(shadow(scrollers[1]!)).toBe('none') // on the panel
    expect(getComputedStyle(scrollers[1]!).borderTopStyle).toBe('solid')
    expect(shadow(scrollers[2]!)).not.toBe('none') // on the panel, frame="card"
  })

  it('casts one near shadow from the panel, not a wide haze', () => {
    const { container } = render(
      <SidebarProvider storageKey={null}>
        <SidebarInset>
          <SidebarPanel>x</SidebarPanel>
        </SidebarInset>
      </SidebarProvider>
    )
    const value = shadow(container.querySelector('.mz-sidebar-panel'))
    // One layer: no comma between shadows outside a colour function.
    expect(value.replace(/\([^)]*\)/g, '').split(',')).toHaveLength(1)
    expect(value).not.toContain('64px')
  })
})
