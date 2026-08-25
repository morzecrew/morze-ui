/**
 * Morze UI — a shadcn/ui-shaped component kit with the Morze convex look.
 *
 *   import { Button } from '@morze/ui'
 *   import '@morze/ui/styles.css'
 */

export { cn } from './lib/utils'
export type { Tone } from './lib/utils'

export { MorzeThemeProvider, useMorzeTheme } from './components/theme-provider'
export type { MorzeTheme, MorzeThemeProviderProps } from './components/theme-provider'

export { Button, buttonVariants } from './components/button'
export type { ButtonProps } from './components/button'
export { Badge, badgeVariants } from './components/badge'
export { Toggle, toggleVariants } from './components/toggle'
export { ToggleGroup, ToggleGroupItem } from './components/toggle-group'
export { Checkbox } from './components/checkbox'
export type { CheckboxProps } from './components/checkbox'
export { RadioGroup, RadioGroupItem } from './components/radio-group'
export { Switch } from './components/switch'
export type { SwitchProps } from './components/switch'
export { Slider } from './components/slider'

export { Input } from './components/input'
export type { InputProps } from './components/input'
export { Textarea } from './components/textarea'
export { Label } from './components/label'
export { Field, FieldHint, FieldError } from './components/field'

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from './components/select'

export { Tabs, TabsList, TabsTrigger, TabsContent } from './components/tabs'

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
} from './components/card'

export { Alert, AlertTitle, AlertDescription } from './components/alert'
export { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from './components/accordion'
export { Progress } from './components/progress'
export { Avatar, AvatarImage, AvatarFallback } from './components/avatar'
export { Separator } from './components/separator'
export { Skeleton } from './components/skeleton'
export { Spinner } from './components/spinner'

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from './components/dialog'

export {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverAnchor,
  PopoverHeader,
  PopoverTitle,
  PopoverDescription,
} from './components/popover'

export {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from './components/dropdown-menu'

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './components/tooltip'

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetPortal,
  SheetOverlay,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from './components/sheet'

export {
  useSidebar,
  SidebarProvider,
  Sidebar,
  SidebarTrigger,
  SidebarRail,
  SidebarInset,
  SidebarPanel,
  SidebarInput,
  SidebarHeader,
  SidebarFooter,
  SidebarSeparator,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from './components/sidebar'
export type {
  SidebarProps,
  SidebarProviderProps,
  SidebarMenuButtonProps,
} from './components/sidebar'
export { useIsMobile } from './lib/use-is-mobile'

export {
  DataTable,
  DataTablePagination,
  ColumnManager,
  ColumnFilter,
  FilterChip,
  useTableQuery,
  useSavedViews,
  useColumnLayout,
  useRowSelection,
  activeFilters,
  isFilterActive,
  pageCount,
  parseSort,
  serializeSort,
  setFilter,
  sortStateOf,
  toggleSort,
  emptyQuery,
  defaultDataTableLabels,
  resolveLabels,
} from './components/data-table'
export type {
  DataTableProps,
  ColumnFilterDef,
  ColumnLayout,
  CustomFilterContext,
  DataTableColumn,
  DataTableFilters,
  DataTableQuery,
  DataTableSort,
  EditableDef,
  FilterValue,
  RowAttributes,
  RowSelectionState,
  SavedView,
  SelectOptionDef,
  SortDir,
  UseTableQueryOptions,
  UseSavedViewsOptions,
  DataTableLabels,
} from './components/data-table'

/** Locale bundles live behind their own entry points: `@morze/ui/locales/ru`. */
export type { MorzeCommonLabels, MorzeLocale } from './locales/types'
