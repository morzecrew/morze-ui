import { useMemo, useState } from 'react'
import {
  Badge,
  Button,
  DataTable,
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
    // The search box is part of the query now, so the stand-in backend has to
    // answer it like any other constraint.
    const needle = query.search?.trim().toLowerCase()
    if (needle) {
      rows = rows.filter((row) =>
        [row.number, row.client, row.manager, row.comment].some((field) =>
          field.toLowerCase().includes(needle)
        )
      )
    }
    for (const [id, filter] of Object.entries(query.filters)) {
      rows = rows.filter((row) => {
        const value = (row as unknown as Record<string, unknown>)[id]
        if (filter.type === 'text') {
          const haystack = String(value).toLowerCase()
          const term = filter.value.toLowerCase()
          if (filter.op === 'equals') return haystack === term
          if (filter.op === 'startsWith') return haystack.startsWith(term)
          return haystack.includes(term)
        }
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
  const [edits, setEdits] = useState<Record<string, string>>({})

  const columns: DataTableColumn<Order>[] = [
    {
      id: 'number', header: '#', label: 'Number', width: 120, minWidth: 90,
      sortable: true, pinned: 'left', hideable: false,
      cell: (row) => <b>{row.number}</b>,
      filter: { type: 'text', placeholder: 'ORD-…', ops: ['contains', 'equals', 'startsWith'] },
    },
    {
      id: 'client', header: 'Client', width: 200, sortable: true,
      accessor: (row) => row.client,
      footer: () => `${new Set(rows.map((row) => row.client)).size} on this page`,
      filter: {
        type: 'select',
        searchable: true,
        options: CLIENTS.map((c) => ({ value: c, label: c })),
      },
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
      headerTitle: 'Where the order sits in the pipeline',
      cell: (row) => (
        <Badge variant="soft" tone={STATUS[row.status].tone}>
          {STATUS[row.status].label}
        </Badge>
      ),
      filter: {
        type: 'select',
        multiple: false,
        options: Object.entries(STATUS).map(([value, s]) => ({ value, label: s.label })),
      },
    },
    {
      id: 'sum', header: 'Total', width: 150, align: 'right', sortable: true,
      // Biggest first: the ascending click on an amount column is a wasted one.
      sortDescFirst: true,
      accessor: (row) => row.sum.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }),
      footer: (page) =>
        page
          .reduce((total, row) => total + row.sum, 0)
          .toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }),
      filter: { type: 'number-range', step: 10_000, unit: '$' },
    },
    {
      id: 'date', header: 'Date', width: 130, sortable: true, sortDescFirst: true,
      accessor: (row) => new Date(row.date).toLocaleDateString('en-GB'),
      filter: {
        type: 'date-range',
        presets: [
          { label: 'This year', from: '2026-01-01', to: '2026-12-31' },
          { label: 'H1', from: '2026-01-01', to: '2026-06-30' },
        ],
      },
    },
    {
      id: 'comment', header: 'Comment', width: 320,
      // Deliberately a block-level child: a cell that reflows during a render
      // is what used to feed the scroll observer into a render loop, and the
      // playground never reproduced it while every cell held inline content.
      cell: (row) => (
        <a href="#orders" style={{ display: 'block', color: 'inherit' }}>
          {row.comment}
        </a>
      ),
    },
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
      // The header only sticks once the scroller has a height to scroll in.
      maxHeight={520}
      search={{ placeholder: 'Search orders…' }}
      summary
      selection={selection}
      onSelectionChange={setSelection}
      rowProps={(row) => ({ 'data-status': row.status })}
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
      caption="Orders"
    />
  )
}
