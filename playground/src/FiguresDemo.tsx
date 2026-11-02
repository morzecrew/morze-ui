import { useState } from 'react'

import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  ClampText,
  InlineEdit,
  Input,
  Meter,
  PageHeader,
  Pagination,
  SectionHeader,
  Stat,
  StatGroup,
  StepIndicator,
  Tabs,
  TabsList,
  TabsTrigger,
} from '@morze/ui'

/** The components that came out of erp-frontend (docs/gaps-erp-2026-11.md). */
export default function FiguresDemo() {
  const [figure, setFigure] = useState<string | null>('open')
  const [page, setPage] = useState(2)
  const [deadline, setDeadline] = useState('07.11.2026')
  const [draft, setDraft] = useState('')
  const pick = (id: string) => (on: boolean) => setFigure(on ? id : null)

  return (
    <div className="pg-col" style={{ gap: 20 }}>
      <PageHeader
        title="Orders"
        info="Customer orders take stock off the shelf; plans build a whole batch."
        meta={<Badge variant="soft">beta</Badge>}
        description="Customer orders, plans, purchases and outsourcing"
        actions={
          <>
            <Button variant="outline">When do we ship?</Button>
            <Button>Create</Button>
          </>
        }
      />

      <Tabs defaultValue="customer">
        <TabsList variant="line">
          <TabsTrigger value="customer" count={18}>
            Customer orders
          </TabsTrigger>
          <TabsTrigger value="plans" count={5}>
            Plans
          </TabsTrigger>
          <TabsTrigger value="purchases" count="…">
            Purchases
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <StatGroup aria-label="Order figures" minItemWidth={170}>
        <Stat label="Open" value={18} info="Agreed or shipping" selected={figure === 'open'} onSelectedChange={pick('open')} />
        <Stat label="Overdue" value={7} tone="warning" info="Deadline passed, not shipped" selected={figure === 'late'} onSelectedChange={pick('late')} />
        <Stat label="At risk" value={11} tone="danger" info="Forecast after the deadline" selected={figure === 'risk'} onSelectedChange={pick('risk')} />
        <Stat label="This week" value={undefined} loading selected={figure === 'week'} onSelectedChange={pick('week')} />
        <Stat label="Units" value={146} hint="in 99 warehouses" />
      </StatGroup>

      <div className="pg-row" style={{ justifyContent: 'space-between' }}>
        <Input
          className="pg-search"
          aria-label="Search"
          placeholder="Search: number, client, item"
          start={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          }
        />
        <Pagination page={page} pageCount={6} onPageChange={setPage} size="md" />
      </div>

      <div className="pg-row" style={{ gap: 24 }}>
        <div className="pg-col" style={{ width: 180 }}>
          <span style={{ fontSize: 12, color: 'var(--mz-text-muted)' }}>Meter</span>
          <Meter aria-label="Received" value={3} max={5} />
          <Meter aria-label="Late" value={34} max={60} tone="warning" />
          <Meter aria-label="Full" value={1} tone="success" size="sm" />
        </div>
        <StepIndicator total={6} current={3} label="Acceptance" />
        <div className="pg-row">
          {['ivanov', 'petrova', 'sidorov', 'kuznetsova', 'admin'].map((login) => (
            <Avatar key={login} seed={login}>
              <AvatarFallback>{login.slice(0, 2)}</AvatarFallback>
            </Avatar>
          ))}
        </div>
      </div>

      <SectionHeader title="Record fields" info="Hover a field to see its pencil." />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
        {[0, 1].map((i) => (
          <div key={i} style={{ padding: '10px 12px', borderRadius: 'var(--mz-radius-lg)', background: 'var(--mz-surface-2)' }}>
            <InlineEdit
              label={i ? 'Deadline' : 'Number'}
              view={i ? deadline : '45'}
              readOnly={!i}
              onEditStart={() => setDraft(deadline)}
              editor={<Input inputSize="sm" aria-label="Deadline" value={draft} onChange={(e) => setDraft(e.target.value)} />}
              onSave={() => setDeadline(draft)}
              saveDisabled={!draft}
            />
          </div>
        ))}
      </div>

      <ClampText lines={2}>
        A description that runs on for long enough to need clamping. It explains what the record is,
        where it came from, who agreed it, and what has to happen before it ships — the kind of text
        nobody reads at a glance but someone needs once, which is why it folds to two lines and
        opens on demand instead of pushing the table down the page.
      </ClampText>
    </div>
  )
}
