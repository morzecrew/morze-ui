import { useMemo, useState } from 'react'
import {
  Badge,
  Button,
  DataTable,
  Input,
  useTableQuery,
  type DataTableColumn,
  type RowSelectionState,
} from '@morze/ui'

type Order = {
  id: string
  number: string
  client: string
  manager: string
  status: 'new' | 'work' | 'done'
  sum: number
  date: string
  comment: string
}

const STATUS = {
  new: { label: 'New', tone: 'info' as const },
  work: { label: 'In progress', tone: 'warning' as const },
  done: { label: 'Done', tone: 'accent' as const },
}

const CLIENTS = ['EFA Medica', 'Radioavionika', 'Sevzapmontazh', 'Balt-Systems', 'Neva-Trade']
const MANAGERS = ['Sokolov', 'Danilova', 'Petrenko', 'Kim']

const ALL: Order[] = Array.from({ length: 137 }, (_, i) => ({
  id: `o-${i + 1}`,
  number: `ORD-${2400 + i}`,
  client: CLIENTS[i % CLIENTS.length]!,
  manager: MANAGERS[i % MANAGERS.length]!,
  status: (['new', 'work', 'done'] as const)[i % 3]!,
  sum: 120_000 + ((i * 37_500) % 4_800_000),
  date: `2026-0${(i % 8) + 1}-${String((i % 27) + 1).padStart(2, '0')}`,
  comment: `Line ${i + 1}: equipment delivery and commissioning`,
}))

/** Stands in for the backend: sorting, filtering and paging all happen here. */
function useOrders(query: ReturnType<typeof useTableQuery>['query']) {
  return useMemo(() => {
    let rows = [...ALL]
    for (const [id, filter] of Object.entries(query.filters)) {
      rows = rows.filter((row) => {
        const value = (row as unknown as Record<string, unknown>)[id]
        if (filter.type === 'text') return String(value).toLowerCase().includes(filter.value.toLowerCase())
        if (filter.type === 'select') return filter.value.includes(String(value))
        if (filter.type === 'number-range') {
          const n = Number(value)
          return (filter.min === undefined || n >= filter.min) && (filter.max === undefined || n <= filter.max)
        }
        if (filter.type === 'date-range') {
          const d = String(value)
          return (!filter.from || d >= filter.from) && (!filter.to || d <= filter.to)
        }
        return true
      })
    }
    for (const sort of [...query.sort].reverse()) {
      rows.sort((a, b) => {
        const av = (a as unknown as Record<string, unknown>)[sort.id]
        const bv = (b as unknown as Record<string, unknown>)[sort.id]
        const cmp = typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : String(av).localeCompare(String(bv))
        return sort.dir === 'asc' ? cmp : -cmp
      })
    }
    const start = (query.page - 1) * query.pageSize
    return { rows: rows.slice(start, start + query.pageSize), total: rows.length }
  }, [query])
}

export default function TableDemo() {
  const { query, setQuery } = useTableQuery({
    initial: { sort: [{ id: 'date', dir: 'desc' }], pageSize: 10 },
    urlKey: 'orders.',
  })
  const { rows, total } = useOrders(query)
  const [selection, setSelection] = useState<RowSelectionState>({ keys: [], allMatching: false })
  const [search, setSearch] = useState('')
  const [edits, setEdits] = useState<Record<string, string>>({})

  const columns: DataTableColumn<Order>[] = [
    {
      id: 'number', header: '#', label: 'Number', width: 120, minWidth: 90,
      sortable: true, pinned: 'left', hideable: false,
      cell: (row) => <b>{row.number}</b>,
      filter: { type: 'text', placeholder: 'ORD-…' },
    },
    {
      id: 'client', header: 'Client', width: 200, sortable: true,
      accessor: (row) => row.client,
      filter: { type: 'select', options: CLIENTS.map((c) => ({ value: c, label: c })) },
    },
    {
      id: 'manager', header: 'Manager', width: 150, sortable: true,
      accessor: (row) => edits[row.id] ?? row.manager,
      filter: { type: 'select', options: MANAGERS.map((m) => ({ value: m, label: m })) },
      editable: {
        type: 'select',
        options: MANAGERS.map((m) => ({ value: m, label: m })),
        value: (row) => edits[row.id] ?? row.manager,
        onSave: async (row, value) => {
          await new Promise((r) => setTimeout(r, 250))
          setEdits((c) => ({ ...c, [row.id]: value }))
        },
      },
    },
    {
      id: 'status', header: 'Status', width: 140,
      cell: (row) => (
        <Badge variant="soft" tone={STATUS[row.status].tone}>
          {STATUS[row.status].label}
        </Badge>
      ),
      filter: {
        type: 'select',
        options: Object.entries(STATUS).map(([value, s]) => ({ value, label: s.label })),
      },
    },
    {
      id: 'sum', header: 'Total', width: 150, align: 'right', sortable: true,
      accessor: (row) => row.sum.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }),
      filter: { type: 'number-range', step: 10_000 },
    },
    {
      id: 'date', header: 'Date', width: 130, sortable: true,
      accessor: (row) => new Date(row.date).toLocaleDateString('en-GB'),
      filter: { type: 'date-range' },
    },
    { id: 'comment', header: 'Comment', width: 320, accessor: (row) => row.comment },
  ]

  return (
    <DataTable
      columns={columns}
      data={rows}
      total={total}
      rowKey={(row) => row.id}
      query={query}
      onQueryChange={setQuery}
      persistKey="playground.orders"
      selection={selection}
      onSelectionChange={setSelection}
      bulkActions={() => (
        <>
          <Button size="sm" variant="secondary">Export</Button>
          <Button size="sm" variant="destructive">Delete</Button>
        </>
      )}
      renderExpanded={(row) => (
        <div style={{ display: 'grid', gap: 6, fontSize: 13 }}>
          <div><b>{row.number}</b> · {row.client}</div>
          <div style={{ color: 'var(--mz-text-dim)' }}>{row.comment}</div>
        </div>
      )}
      toolbar={
        <Input
          inputSize="sm"
          placeholder="Search orders…"
          value={search}
          style={{ width: 240 }}
          onChange={(e) => setSearch(e.target.value)}
        />
      }
      caption="Orders"
    />
  )
}
