import type { DataTableLabels } from '../components/data-table/labels'

/**
 * Strings the rest of the kit takes as individual props: `Dialog`/`Sheet`
 * `closeLabel`, `Spinner` `label`, `Sidebar` `mobileTitle` /
 * `mobileDescription`, `SidebarTrigger` `label`.
 */
export type MorzeCommonLabels = {
  close: string
  loading: string
  sidebarNavigation: string
  sidebarSections: string
  toggleSidebar: string
}

/** One language, complete. A missing key is a type error, not a silent drift. */
export type MorzeLocale = {
  dataTable: DataTableLabels
  common: MorzeCommonLabels
}
