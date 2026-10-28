import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import {
  Calendar,
  Combobox,
  DataTable,
  Dialog,
  DialogContent,
  DialogTitle,
  MorzeLocaleProvider,
  NumberInput,
  Sidebar,
  SidebarProvider,
  SidebarTrigger,
  Spinner,
  emptyQuery,
  useMorzeLocale,
  type DataTableColumn,
} from '../src'
import ru from '../src/locales/ru'

/**
 * A partial override looks done — the visible words are translated — while
 * the loading line, the failure line and the clear button's name stay English.
 * Installing the bundle once is what stops that (#12).
 */
describe('MorzeLocaleProvider', () => {
  it('translates every widget under it, the unseen strings included', async () => {
    const user = userEvent.setup()
    render(
      <MorzeLocaleProvider locale={ru} tag="ru-RU">
        <Combobox
          options={[{ value: 'a', label: 'Альфа' }]}
          defaultValue="a"
          aria-label="Поставщик"
        />
        <Spinner />
        <NumberInput aria-label="Количество" />
        <SidebarProvider storageKey={null}>
          <Sidebar />
          <SidebarTrigger />
        </SidebarProvider>
      </MorzeLocaleProvider>
    )
    // The × that empties the field: never on screen, only ever read.
    expect(screen.getByRole('button', { name: ru.combobox.clear })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(ru.common.loading)
    expect(screen.getByRole('button', { name: ru.common.increase })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: ru.common.toggleSidebar })).toBeInTheDocument()

    await user.click(screen.getByRole('combobox', { name: 'Поставщик' }))
    expect(screen.getByRole('searchbox')).toHaveAttribute('placeholder', ru.combobox.search)
  })

  it('gives the calendar its names and its language', () => {
    render(
      <MorzeLocaleProvider locale={ru} tag="ru-RU">
        <Calendar defaultMonth={new Date(2026, 2, 1)} />
      </MorzeLocaleProvider>
    )
    expect(screen.getByRole('button', { name: ru.calendar.previousMonth })).toBeInTheDocument()
    // The caption comes from Intl, through the provider's tag.
    expect(screen.getByText(/март/i)).toBeInTheDocument()
  })

  it('reaches the table and the close button of a dialog', async () => {
    type Row = { id: string }
    const columns: DataTableColumn<Row>[] = [{ id: 'id', header: 'Id', accessor: (r) => r.id }]
    render(
      <MorzeLocaleProvider locale={ru}>
        <DataTable columns={columns} data={[]} rowKey={(r) => r.id} query={emptyQuery} onQueryChange={() => {}} />
        <Dialog defaultOpen>
          <DialogContent>
            <DialogTitle>Окно</DialogTitle>
          </DialogContent>
        </Dialog>
      </MorzeLocaleProvider>
    )
    expect(screen.getAllByText(ru.dataTable.empty).length).toBeGreaterThan(0)
    expect(screen.queryByText('Nothing found')).toBeNull()
    expect(await screen.findByText(ru.common.close)).toBeInTheDocument()
  })

  it('lets a component’s own props win, key by key', () => {
    render(
      <MorzeLocaleProvider locale={ru}>
        <Combobox options={[]} labels={{ placeholder: 'Свой текст' }} />
        <Spinner label="Секунду" />
        <Calendar labels={{ nextMonth: 'Дальше' }} defaultMonth={new Date(2026, 2, 1)} />
      </MorzeLocaleProvider>
    )
    expect(screen.getByRole('combobox')).toHaveTextContent('Свой текст')
    expect(screen.getByRole('status')).toHaveTextContent('Секунду')
    expect(screen.getByRole('button', { name: 'Дальше' })).toBeInTheDocument()
    // The keys it did not name still come from the provider.
    expect(screen.getByRole('button', { name: ru.calendar.previousMonth })).toBeInTheDocument()
  })

  it('merges a nested provider over the one above it', () => {
    function Probe() {
      const { locale, tag } = useMorzeLocale()
      return (
        <span data-testid="probe">
          {locale.common?.close}|{locale.common?.more}|{tag}
        </span>
      )
    }
    render(
      <MorzeLocaleProvider locale={ru} tag="ru-RU">
        <MorzeLocaleProvider locale={{ common: { close: 'Закрыть окно' } }}>
          <Probe />
        </MorzeLocaleProvider>
      </MorzeLocaleProvider>
    )
    expect(screen.getByTestId('probe')).toHaveTextContent(`Закрыть окно|${ru.common.more}|ru-RU`)
  })

  it('changes nothing for an app without one', () => {
    render(<Spinner />)
    expect(screen.getByRole('status')).toHaveTextContent('Loading')
  })
})
