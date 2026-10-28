import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { DataTable, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, emptyQuery } from '../src'

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
