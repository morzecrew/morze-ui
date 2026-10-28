/**
 * The English strings of the components that take one label each — what they
 * fall back to with no `labels`, no `MorzeLocaleProvider`, nothing. Plain data,
 * so the `en` bundle can re-export it without pulling in React.
 */
import type { MorzeCommonLabels } from './types'

export const defaultCommonLabels: MorzeCommonLabels = {
  close: 'Close',
  loading: 'Loading',
  more: 'More',
  sidebarNavigation: 'Navigation',
  sidebarSections: 'Application sections',
  toggleSidebar: 'Toggle sidebar',
  increase: 'Increase',
  decrease: 'Decrease',
  commandPalette: 'Command palette',
  commandPaletteDescription: 'Search for a command to run',
}
