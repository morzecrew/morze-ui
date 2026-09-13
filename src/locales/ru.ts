/**
 * Russian.
 *
 *   import { dataTable as ru } from '@morze/ui/locales/ru'
 *   <DataTable labels={ru} locale="ru-RU" … />
 *
 * Pure data: no React, no styles, safe to import from a server component.
 */
import type { DataTableLabels } from '../components/data-table/labels'
import type { CalendarLabels } from '../components/calendar'
import type { ComboboxLabels } from '../components/combobox'
import type { DatePickerLabels } from '../components/date-picker'
import type { MorzeCommonLabels, MorzeLocale } from './types'

export const dataTable: DataTableLabels = {
  filter: 'Фильтр',
  filterFor: (column) => `Фильтр: ${column}`,
  filterActive: 'активен',
  contains: 'Содержит…',
  opContains: 'Содержит',
  opEquals: 'Равно',
  opStartsWith: 'Начинается с',
  searchOptions: 'Поиск…',
  noOptions: 'Ничего не подходит',
  selectAllOptions: 'Все',
  clearAllOptions: 'Ничего',
  andMore: (count) => `ещё ${count}`,
  apply: 'Применить',
  reset: 'Сбросить',
  resetAll: 'Сбросить всё',
  resetFilters: 'Сбросить фильтры',
  clearFilter: 'Очистить фильтр',
  rangeFrom: 'от',
  rangeTo: 'до',
  dateFrom: 'С',
  dateTo: 'По',
  yes: 'Да',
  no: 'Нет',

  columns: 'Колонки',
  searchColumns: 'Найти колонку…',
  noColumns: 'Такой колонки нет',
  showAllColumns: 'Показать все',
  hideAllColumns: 'Скрыть все',
  moveUp: (column) => `Переместить «${column}» выше`,
  moveDown: (column) => `Переместить «${column}» ниже`,
  pinning: (column, side) => `Закрепление колонки «${column}»: ${side}`,
  pinnedLeft: 'Слева',
  pinnedRight: 'Справа',
  notPinned: 'Не закреплена',
  show: (column) => `Показать «${column}»`,
  hide: (column) => `Скрыть «${column}»`,

  sortBy: (column) => `Сортировать по «${column}» (Shift — добавить к сортировке)`,
  columnWidth: (column) => `Ширина колонки «${column}»`,
  autoWidth: (column) => `Автоширина для «${column}»`,
  selectPage: 'Выбрать страницу',
  selectRow: 'Выбрать строку',
  expandRow: 'Развернуть',
  collapseRow: 'Свернуть',
  details: 'Подробности',

  empty: 'Ничего не найдено',
  retry: 'Повторить',
  search: 'Поиск…',
  saveFailed: 'Не удалось сохранить',
  summary: 'Итого',
  expandAll: 'Развернуть все',
  collapseAll: 'Свернуть все',

  rowsPerPage: 'Строк на странице',
  nothingFound: 'Ничего не найдено',
  of: 'из',
  firstPage: 'Первая страница',
  previousPage: 'Предыдущая страница',
  nextPage: 'Следующая страница',
  lastPage: 'Последняя страница',
  loadMore: 'Показать ещё',
  loadingMore: 'Загрузка…',

  selectedCount: (count) => `Выбрано: ${count}`,
  allMatchingSuffix: ' (все подходящие)',
  selectAllMatching: (total) => `Выбрать все ${total}`,
  clearSelection: 'Снять выделение',
  bulkActions: 'Действия над выбранными строками',
}

export const calendar: CalendarLabels = {
  previousMonth: 'Предыдущий месяц',
  nextMonth: 'Следующий месяц',
  month: 'Месяц',
  year: 'Год',
  weekNumber: 'Неделя',
}

export const combobox: ComboboxLabels = {
  placeholder: 'Выберите…',
  search: 'Поиск…',
  empty: 'Ничего не подходит',
  loading: 'Загрузка',
  failed: 'Не удалось загрузить список',
  clear: 'Очистить',
  selectAll: 'Все',
  clearAll: 'Ничего',
  // A "+3" is the same three characters in both languages; it is here so the
  // bundle stays complete, not because it differs.
  andMore: (count) => `+${count}`,
  typeMore: (count) => `Введите не менее ${count} символов`,
}

export const datePicker: DatePickerLabels = {
  placeholder: 'Выберите дату',
  clear: 'Очистить',
  open: 'Открыть календарь',
}

export const common: MorzeCommonLabels = {
  close: 'Закрыть',
  loading: 'Загрузка',
  more: 'Ещё',
  sidebarNavigation: 'Навигация',
  sidebarSections: 'Разделы приложения',
  toggleSidebar: 'Свернуть или развернуть меню',
}

export const ru: MorzeLocale = { dataTable, calendar, combobox, datePicker, common }
export default ru
