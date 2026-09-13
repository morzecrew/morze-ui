import type { DataTableLabels } from '../components/data-table/labels'
import type { CalendarLabels } from '../components/calendar'
import type { ComboboxLabels } from '../components/combobox'
import type { DatePickerLabels } from '../components/date-picker'

/**
 * Strings the rest of the kit takes as individual props: `Dialog`/`Sheet`
 * `closeLabel`, `Spinner` `label`, `Sidebar` `mobileTitle` /
 * `mobileDescription`, `SidebarTrigger` `label`, `Toaster` `closeLabel`,
 * `BreadcrumbEllipsis` `label`, `TabsList` `overflowLabel`.
 */
export type MorzeCommonLabels = {
  close: string
  loading: string
  /** What is behind a collapse: the breadcrumb ellipsis, the tab overflow. */
  more: string
  sidebarNavigation: string
  sidebarSections: string
  toggleSidebar: string
}

/** One language, complete. A missing key is a type error, not a silent drift. */
export type MorzeLocale = {
  dataTable: DataTableLabels
  calendar: CalendarLabels
  combobox: ComboboxLabels
  datePicker: DatePickerLabels
  common: MorzeCommonLabels
}
