import type { DataTableLabels } from '../components/data-table/labels'
import type { CalendarLabels } from '../components/calendar'
import type { ComboboxLabels } from '../components/combobox'
import type { DatePickerLabels } from '../components/date-picker'

/**
 * Strings the rest of the kit takes as individual props: `Dialog`/`Sheet`
 * `closeLabel`, `Spinner` `label`, `Sidebar` `mobileTitle` /
 * `mobileDescription`, `SidebarTrigger` / `SidebarRail` `label`, `Toaster`
 * `closeLabel`, `BreadcrumbEllipsis` `label`, `TabsList` `overflowLabel`,
 * `NumberInput` `labels`, `CommandDialog` `title` / `description`.
 */
export type MorzeCommonLabels = {
  close: string
  loading: string
  /** What is behind a collapse: the breadcrumb ellipsis, the tab overflow. */
  more: string
  sidebarNavigation: string
  sidebarSections: string
  toggleSidebar: string
  /** The number field's stepper buttons. */
  increase: string
  decrease: string
  /** The command palette's accessible name and description. */
  commandPalette: string
  commandPaletteDescription: string
}

/**
 * A bundle as `MorzeLocaleProvider` takes it: any of the sections, each of
 * them partial. A whole `MorzeLocale` is one of these.
 */
export type MorzeLocaleBundle = { [K in keyof MorzeLocale]?: Partial<MorzeLocale[K]> }

/** One language, complete. A missing key is a type error, not a silent drift. */
export type MorzeLocale = {
  dataTable: DataTableLabels
  calendar: CalendarLabels
  combobox: ComboboxLabels
  datePicker: DatePickerLabels
  common: MorzeCommonLabels
}
