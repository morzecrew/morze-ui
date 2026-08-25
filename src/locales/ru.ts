/**
 * Russian.
 *
 *   import { dataTable as ru } from '@morze/ui/locales/ru'
 *   <DataTable labels={ru} locale="ru-RU" … />
 *
 * Pure data: no React, no styles, safe to import from a server component.
 */
import type { DataTableLabels } from '../components/data-table/labels'
import type { MorzeCommonLabels, MorzeLocale } from './types'

export const dataTable: DataTableLabels = {
  filter: 'Фильтр',
  filterFor: (column) => `Фильтр: ${column}`,
  filterActive: 'активен',
  contains: 'Содержит…',
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
  selectPage: 'Выбрать страницу',
  selectRow: 'Выбрать строку',
  expandRow: 'Развернуть',
  collapseRow: 'Свернуть',
  details: 'Подробности',

  empty: 'Ничего не найдено',
  retry: 'Повторить',

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

export const common: MorzeCommonLabels = {
  close: 'Закрыть',
  loading: 'Загрузка',
  sidebarNavigation: 'Навигация',
  sidebarSections: 'Разделы приложения',
  toggleSidebar: 'Свернуть или развернуть меню',
}

export const ru: MorzeLocale = { dataTable, common }
export default ru
