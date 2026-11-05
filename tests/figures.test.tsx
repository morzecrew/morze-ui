import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as React from 'react'

import {
  Avatar,
  AvatarFallback,
  ClampText,
  InfoTip,
  InlineEdit,
  Input,
  Meter,
  MorzeLocaleProvider,
  PageHeader,
  Pagination,
  SectionHeader,
  Stat,
  StatGroup,
  StepIndicator,
  Tabs,
  TabsList,
  TabsTrigger,
  avatarSeedIndex,
} from '../src'
import ru from '../src/locales/ru'

/* The components that came out of erp-frontend (docs/gaps-erp-2026-11.md). */

describe('InfoTip (N-02)', () => {
  it('is a named button that does not submit a form', async () => {
    const submit = vi.fn((e: React.FormEvent) => e.preventDefault())
    render(
      <form onSubmit={submit}>
        <InfoTip>Explained</InfoTip>
      </form>
    )
    const tip = screen.getByRole('button', { name: 'More info' })
    expect(tip).toHaveAttribute('type', 'button')
    await userEvent.click(tip)
    expect(submit).not.toHaveBeenCalled()
  })

  it('takes its own name', () => {
    render(<InfoTip label="What is late">Explained</InfoTip>)
    expect(screen.getByRole('button', { name: 'What is late' })).toBeInTheDocument()
  })
})

describe('Stat (N-01)', () => {
  it('is a plain figure without onSelectedChange', () => {
    render(
      <StatGroup aria-label="Orders">
        <Stat label="Open" value={18} hint="agreed or shipping" />
      </StatGroup>
    )
    expect(screen.getByRole('group', { name: 'Orders' })).toBeInTheDocument()
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.getByText('18')).toBeInTheDocument()
    expect(screen.getByText('agreed or shipping')).toBeInTheDocument()
  })

  it('toggles when selectable, and the InfoTip takes its own click', async () => {
    const onSelectedChange = vi.fn()
    render(<Stat label="Late" value={7} info="Past the deadline" tone="danger" onSelectedChange={onSelectedChange} />)
    const toggle = screen.getByRole('button', { name: 'Late: 7' })
    expect(toggle).toHaveAttribute('aria-pressed', 'false')

    await userEvent.click(screen.getByRole('button', { name: 'More info: Late' }))
    expect(onSelectedChange).not.toHaveBeenCalled()

    await userEvent.click(toggle)
    expect(onSelectedChange).toHaveBeenCalledWith(true)
    expect(screen.getByText('7')).toHaveAttribute('data-tone', 'danger')
  })

  it('draws the check mark only as a picture', () => {
    const { container } = render(<Stat label="Late" value={7} selected onSelectedChange={() => {}} />)
    const check = container.querySelector('.mz-stat__check')!
    expect(check).toHaveAttribute('aria-hidden', 'true')
    expect(check).toHaveAttribute('data-state', 'checked')
    expect(screen.getAllByRole('button')).toHaveLength(1)
  })

  it('shows a skeleton while loading', () => {
    const { container } = render(<Stat label="Late" value={7} loading />)
    expect(screen.queryByText('7')).toBeNull()
    expect(container.querySelector('.mz-skeleton')).not.toBeNull()
  })
})

describe('Pagination (N-04)', () => {
  it('shows the page between the arrows and moves by one', async () => {
    const onPageChange = vi.fn()
    render(<Pagination page={2} pageCount={6} onPageChange={onPageChange} />)
    expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeInTheDocument()
    expect(screen.getByLabelText('Page 2 of 6')).toHaveTextContent('2 / 6')
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }))
    expect(onPageChange).toHaveBeenLastCalledWith(3)
    await userEvent.click(screen.getByRole('button', { name: 'Last page' }))
    expect(onPageChange).toHaveBeenLastCalledWith(6)
  })

  it('disables what leads nowhere and clamps the page', () => {
    render(<Pagination page={9} pageCount={3} onPageChange={() => {}} edges={false} />)
    expect(screen.getByLabelText('Page 3 of 3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Last page' })).toBeNull()
  })

  it('speaks the provider’s language', () => {
    render(
      <MorzeLocaleProvider locale={ru} tag="ru-RU">
        <Pagination page={1} pageCount={2} onPageChange={() => {}} />
      </MorzeLocaleProvider>
    )
    expect(screen.getByRole('navigation', { name: 'Страницы' })).toBeInTheDocument()
    expect(screen.getByLabelText('Страница 1 из 2')).toBeInTheDocument()
  })
})

describe('Meter (N-05)', () => {
  it('is a meter clamped to its range', () => {
    render(<Meter aria-label="Received" value={7} max={5} tone="success" />)
    const meter = screen.getByRole('meter', { name: 'Received' })
    expect(meter).toHaveAttribute('aria-valuenow', '5')
    expect(meter).toHaveAttribute('aria-valuemax', '5')
    expect(meter.firstElementChild).toHaveStyle({ width: '100%' })
  })
})

describe('StepIndicator (N-06)', () => {
  it('marks passed, current and coming steps', () => {
    const { container } = render(<StepIndicator total={5} current={2} label="Acceptance" />)
    const states = [...container.querySelectorAll('.mz-steps__pip')].map((pip) => pip.getAttribute('data-state'))
    expect(states).toEqual(['done', 'done', 'current', 'todo', 'todo'])
    expect(screen.getByRole('img', { name: 'Step 3 of 5' })).toBeInTheDocument()
    expect(screen.getByText('Acceptance')).toBeInTheDocument()
  })

  it('stays silent before the first step', () => {
    const { container } = render(<StepIndicator total={3} current={-1} />)
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull()
    expect(screen.queryByRole('img')).toBeNull()
  })
})

describe('InlineEdit (N-07)', () => {
  function Field({ onSave }: { onSave: (value: string) => unknown }) {
    const [value, setValue] = React.useState('Old')
    const [draft, setDraft] = React.useState('')
    return (
      <InlineEdit
        label="Name"
        view={value}
        onEditStart={() => setDraft(value)}
        editor={<Input inputSize="sm" aria-label="Name" value={draft} onChange={(e) => setDraft(e.target.value)} />}
        onSave={async () => {
          await onSave(draft)
          setValue(draft)
        }}
      />
    )
  }

  it('does not start editing from a click on the label', async () => {
    render(<Field onSave={() => {}} />)
    await userEvent.click(screen.getByText('Name'))
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull()
  })

  it('edits, saves on Enter and hands the focus back to the pencil', async () => {
    const onSave = vi.fn()
    render(<Field onSave={onSave} />)
    await userEvent.click(screen.getByRole('button', { name: 'Edit “Name”' }))
    const input = screen.getByRole('textbox', { name: 'Name' })
    expect(input).toHaveFocus()
    await userEvent.clear(input)
    await userEvent.type(input, 'New{Enter}')
    expect(onSave).toHaveBeenCalledWith('New')
    expect(screen.getByText('New')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit “Name”' })).toHaveFocus()
  })

  it('stays open when the save fails', async () => {
    render(
      <Field
        onSave={() => {
          throw new Error('409')
        }}
      />
    )
    await userEvent.click(screen.getByRole('button', { name: 'Edit “Name”' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(screen.getByRole('textbox', { name: 'Name' })).toBeInTheDocument()
  })

  it('cancels on Escape', async () => {
    const onCancel = vi.fn()
    render(<InlineEdit label="Name" view="Old" editor={<input aria-label="Name" />} onSave={() => {}} onCancel={onCancel} />)
    await userEvent.click(screen.getByRole('button', { name: 'Edit “Name”' }))
    await userEvent.keyboard('{Escape}')
    expect(onCancel).toHaveBeenCalled()
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('keeps a read-only field without a pencil', () => {
    render(<InlineEdit label="Name" view="Old" editor={null} onSave={() => {}} readOnly />)
    expect(screen.queryByRole('button')).toBeNull()
  })
})

describe('ClampText (N-08)', () => {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollHeight')
  afterEach(() => {
    if (descriptor) Object.defineProperty(HTMLElement.prototype, 'scrollHeight', descriptor)
  })

  it('offers the toggle only when the text overflows', async () => {
    const { rerender } = render(<ClampText>Short</ClampText>)
    expect(screen.queryByRole('button')).toBeNull()

    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', { configurable: true, get: () => 200 })
    await act(async () => rerender(<ClampText lines={3}>A long one</ClampText>))
    const toggle = screen.getByRole('button', { name: 'Show more' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(toggle)
    expect(screen.getByRole('button', { name: 'Show less' })).toHaveAttribute('aria-expanded', 'true')
  })
})

describe('PageHeader and SectionHeader (N-10)', () => {
  it('heads the page and keeps the actions', () => {
    render(<PageHeader title="Orders" info="What is here" description="All of them" actions={<button>Create</button>} />)
    expect(screen.getByRole('heading', { level: 1, name: 'Orders' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'More info: Orders' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument()
  })

  it('heads a block one level down, or at the level asked', () => {
    const { rerender } = render(<SectionHeader title="Inbox" />)
    expect(screen.getByRole('heading', { level: 2, name: 'Inbox' })).toBeInTheDocument()
    rerender(<SectionHeader title="Inbox" as="h3" />)
    expect(screen.getByRole('heading', { level: 3, name: 'Inbox' })).toBeInTheDocument()
  })
})

describe('Input start / end (N-03)', () => {
  it('stays a bare input without them', () => {
    const { container } = render(<Input aria-label="Search" className="wide" />)
    expect(container.firstElementChild).toBe(screen.getByRole('textbox'))
    expect(screen.getByRole('textbox')).toHaveClass('wide')
  })

  it('wraps the field and hands the class to the wrapper', () => {
    const { container } = render(<Input aria-label="Search" className="wide" start={<svg data-testid="icon" />} />)
    const group = container.firstElementChild!
    expect(group).toHaveClass('mz-input-group', 'wide')
    expect(group).toHaveAttribute('data-start')
    expect(screen.getByRole('textbox')).not.toHaveClass('wide')
    expect(screen.getByTestId('icon')).toBeInTheDocument()
  })
})

describe('TabsTrigger count (N-09)', () => {
  it('draws the count after the label, and nothing for null', () => {
    render(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a" count={18}>
            Orders
          </TabsTrigger>
          <TabsTrigger value="b" count={null}>
            Plans
          </TabsTrigger>
        </TabsList>
      </Tabs>
    )
    expect(screen.getByRole('tab', { name: 'Orders 18' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Plans' })).toBeInTheDocument()
  })
})

describe('Avatar seed (N-11)', () => {
  it('gives a key the same colour every time', () => {
    expect(avatarSeedIndex('ivanov')).toBe(avatarSeedIndex('ivanov'))
    const seen = new Set(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l'].map(avatarSeedIndex))
    for (const index of seen) expect(index).toBeGreaterThanOrEqual(1)
    for (const index of seen) expect(index).toBeLessThanOrEqual(8)
    expect(seen.size).toBeGreaterThan(3)

    const { container } = render(
      <Avatar seed="ivanov">
        <AvatarFallback>II</AvatarFallback>
      </Avatar>
    )
    expect(container.firstElementChild).toHaveAttribute('data-seed', String(avatarSeedIndex('ivanov')))
  })
})

// erp laid its record properties out as rows, header words and a headline
// figure by moving InlineEdit's internals around with CSS (#45).
describe('InlineEdit layouts', () => {
  const field = (layout: 'stack' | 'row' | 'inline' | 'lead', props: Partial<React.ComponentProps<typeof InlineEdit>> = {}) =>
    render(
      <InlineEdit
        layout={layout}
        label="Unit"
        view="pcs"
        editor={<input aria-label="Unit value" defaultValue="pcs" />}
        onSave={() => {}}
        {...props}
      />
    ).container.querySelector<HTMLElement>('[data-slot="inline-edit"]')!

  it('keeps today’s stack by default', () => {
    const root = render(<InlineEdit label="Unit" view="pcs" editor={null} onSave={() => {}} />).container.firstElementChild!
    expect(root).toHaveAttribute('data-layout', 'stack')
    expect(root.querySelector('.mz-inline-edit__head')).not.toBeNull()
  })

  it('lays a row out as label, value, pencil — in that order, no head wrapper', () => {
    const root = field('row')
    expect(root.querySelector('.mz-inline-edit__head')).toBeNull()
    expect([...root.children].map((child) => child.className.split(' ')[0])).toEqual([
      'mz-inline-edit__label',
      'mz-inline-edit__view',
      'mz-btn',
    ])
  })

  it('hides an inline label from sight but not from the reader', async () => {
    const root = field('inline')
    expect(root.querySelector('.mz-inline-edit__label')).toHaveClass('mz-sr-only')
    // It still names the pencil and, editing, the group.
    await userEvent.click(screen.getByRole('button', { name: /Unit/ }))
    expect(screen.getByRole('group', { name: 'Unit' })).toBeInTheDocument()
  })

  it('puts the caption under a lead figure', () => {
    const root = field('lead')
    expect(root.lastElementChild).toHaveClass('mz-inline-edit__label')
    expect(root.querySelector('.mz-inline-edit__lead .mz-inline-edit__view')).toHaveTextContent('pcs')
  })

  it.each(['row', 'inline', 'lead'] as const)('edits, saves on Enter and gives focus back in %s', async (layout) => {
    const onSave = vi.fn()
    field(layout, { onSave })
    await userEvent.click(screen.getByRole('button', { name: /Unit/ }))
    expect(screen.getByRole('textbox', { name: 'Unit value' })).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: /Unit/ })).toHaveFocus()
  })
})
