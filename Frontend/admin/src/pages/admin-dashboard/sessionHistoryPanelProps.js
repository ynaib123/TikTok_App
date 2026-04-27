import {
  buildSessionActivityContext,
  buildSessionActivityDetails,
  buildSessionActivityHeadline,
  buildSessionActivityMeta,
  formatOrderDate,
  getSessionActivityIcon,
  getSessionActivityTone,
} from './utils.js'

export function buildSessionHistoryToolbarProps(options) {
  return {
    changeModule: options.changeModule,
    changeSearch: options.changeSearch,
    changeStatus: options.changeStatus,
    openCatalogMenu: options.openCatalogMenu,
    resetSessionActivityFilters: options.resetSessionActivityFilters,
    selectedSessionActivityFilter: options.selectedSessionActivityFilter,
    selectedSessionActivityModule: options.selectedSessionActivityModule,
    selectedSessionActivityStatus: options.selectedSessionActivityStatus,
    sessionActivityFilter: options.sessionActivityFilter,
    sessionActivityModule: options.sessionActivityModule,
    sessionActivitySearch: options.sessionActivitySearch,
    sessionActivityStatus: options.sessionActivityStatus,
    setOpenCatalogMenu: options.setOpenCatalogMenu,
    toggleSessionActivityFilter: options.toggleSessionActivityFilter,
  }
}

export function buildSessionHistoryListProps(options) {
  return {
    currentPage: options.currentPage,
    entries: options.entries,
    formatOrderDate,
    getSessionActivityContext: buildSessionActivityContext,
    getSessionActivityDetails: buildSessionActivityDetails,
    getSessionActivityIcon,
    getSessionActivityHeadline: buildSessionActivityHeadline,
    getSessionActivityMeta: buildSessionActivityMeta,
    getSessionActivityTone,
    onChangePage: options.onChangePage,
    onChangePageSize: options.onChangePageSize,
    openCatalogMenu: options.openCatalogMenu,
    pageSize: options.pageSize,
    selectedPageSizeLabel: options.selectedPageSizeLabel,
    setOpenCatalogMenu: options.setOpenCatalogMenu,
    totalPages: options.totalPages,
  }
}
