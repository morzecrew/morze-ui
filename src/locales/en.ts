/**
 * English — the kit's defaults, re-exported as a bundle so a host can pin the
 * language explicitly instead of relying on whatever the defaults happen to be.
 *
 *   import { dataTable } from '@morze/ui/locales/en'
 *
 * Pure data: no React, no styles, safe to import from a server component.
 */
import { defaultDataTableLabels } from '../components/data-table/labels'
import type { MorzeCommonLabels, MorzeLocale } from './types'

export const dataTable = defaultDataTableLabels

export const common: MorzeCommonLabels = {
  close: 'Close',
  loading: 'Loading',
  sidebarNavigation: 'Navigation',
  sidebarSections: 'Application sections',
  toggleSidebar: 'Toggle sidebar',
}

export const en: MorzeLocale = { dataTable, common }
export default en
