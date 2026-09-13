/**
 * English — the kit's defaults, re-exported as a bundle so a host can pin the
 * language explicitly instead of relying on whatever the defaults happen to be.
 *
 *   import { dataTable } from '@morze/ui/locales/en'
 *
 * Pure data: no React, no styles, safe to import from a server component.
 */
import { defaultDataTableLabels } from '../components/data-table/labels'
import type { CalendarLabels } from '../components/calendar'
import type { ComboboxLabels } from '../components/combobox'
import type { DatePickerLabels } from '../components/date-picker'
import type { MorzeCommonLabels, MorzeLocale } from './types'

export const dataTable = defaultDataTableLabels

export const calendar: CalendarLabels = {
  previousMonth: 'Previous month',
  nextMonth: 'Next month',
  month: 'Month',
  year: 'Year',
  weekNumber: 'Week',
}

export const combobox: ComboboxLabels = {
  placeholder: 'Select…',
  search: 'Search…',
  empty: 'Nothing matches',
  loading: 'Loading',
  failed: 'The options could not be loaded',
  clear: 'Clear',
  selectAll: 'All',
  clearAll: 'None',
  andMore: (count) => `+${count}`,
  typeMore: (count) => `Type ${count} characters or more`,
}

export const datePicker: DatePickerLabels = {
  placeholder: 'Pick a date',
  clear: 'Clear',
  open: 'Open the calendar',
}

export const common: MorzeCommonLabels = {
  close: 'Close',
  loading: 'Loading',
  more: 'More',
  sidebarNavigation: 'Navigation',
  sidebarSections: 'Application sections',
  toggleSidebar: 'Toggle sidebar',
}

export const en: MorzeLocale = { dataTable, calendar, combobox, datePicker, common }
export default en
