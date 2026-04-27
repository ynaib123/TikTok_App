import { useCallback, useMemo, useState } from 'react'
import {
  CLIENT_ACCOUNT_FILTER_OPTIONS,
  CLIENT_CONNECTION_FILTER_OPTIONS,
  CLIENT_DIRECTORY_PREFERENCES_STORAGE_KEY,
  CLIENT_PAGE_SIZE_OPTIONS,
  CLIENT_SELECTION_STORAGE_KEY,
  CLIENT_SORT_OPTIONS,
  CLIENT_VERIFICATION_FILTER_OPTIONS,
} from './constants'
import { buildClientCatalogInsights, buildClientFilterSummary } from './adminClientState'
import {
  buildClientSelectionModel,
  clearVisibleClientSelection,
  normalizeClientSelection,
  selectVisibleClients,
  summarizeSelectedClients,
  toggleClientSelection,
} from './clientSelectionState'
import useDebouncedStorageEffect from './useDebouncedStorageEffect'
import useDebouncedValue from './useDebouncedValue'
import useAdminCatalogMenuState from './useAdminCatalogMenuState'

function readStoredDirectoryPreferences() {
  if (typeof window === 'undefined') return null

  try {
    const rawValue = window.localStorage.getItem(CLIENT_DIRECTORY_PREFERENCES_STORAGE_KEY)
    const parsedValue = rawValue ? JSON.parse(rawValue) : null
    if (!parsedValue || typeof parsedValue !== 'object' || Array.isArray(parsedValue)) return null
    return parsedValue
  } catch {
    return null
  }
}

function readStoredClientSelection() {
  if (typeof window === 'undefined') return []

  try {
    const rawValue = window.sessionStorage.getItem(CLIENT_SELECTION_STORAGE_KEY)
    const parsedValue = rawValue ? JSON.parse(rawValue) : []
    return normalizeClientSelection(parsedValue)
  } catch {
    return []
  }
}

export default function useAdminClientCatalogState({
  catalog = { items: [], totalPages: 0 },
  clientMap = new Map(),
  onlineClientIdSet = new Set(),
} = {}) {
  const storedPreferences = useMemo(() => readStoredDirectoryPreferences(), [])

  const [clientSearch, setClientSearch] = useState(storedPreferences?.search || '')
  const [clientSort, setClientSort] = useState(storedPreferences?.sort || 'activity_desc')
  const [clientStatusFilter, setClientStatusFilter] = useState(storedPreferences?.statusFilter || 'all')
  const [clientConnectionFilter, setClientConnectionFilter] = useState(storedPreferences?.connectionFilter || 'all')
  const [clientVerificationFilter, setClientVerificationFilter] = useState(storedPreferences?.verificationFilter || 'all')
  const [clientsPerPage, setClientsPerPage] = useState(Number(storedPreferences?.pageSize) || 12)
  const [requestedClientPage, setRequestedClientPage] = useState(1)
  const [selectedClientIds, setSelectedClientIds] = useState(() => readStoredClientSelection())
  const debouncedClientSearch = useDebouncedValue(clientSearch, 250)
  const { openCatalogMenu, setOpenCatalogMenu } = useAdminCatalogMenuState()
  const totalPages = useMemo(() => Math.max(1, Number(catalog?.totalPages || 1)), [catalog?.totalPages])
  const clientPage = useMemo(() => (
    Math.min(totalPages, Math.max(1, Number(requestedClientPage || 1)))
  ), [requestedClientPage, totalPages])

  useDebouncedStorageEffect({
    key: CLIENT_DIRECTORY_PREFERENCES_STORAGE_KEY,
    value: {
      connectionFilter: clientConnectionFilter,
      pageSize: clientsPerPage,
      search: clientSearch,
      sort: clientSort,
      statusFilter: clientStatusFilter,
      verificationFilter: clientVerificationFilter,
    },
  })

  useDebouncedStorageEffect({
    key: CLIENT_SELECTION_STORAGE_KEY,
    storage: 'session',
    value: normalizeClientSelection(selectedClientIds),
  })

  const visibleClients = useMemo(() => (
    Array.isArray(catalog?.items) ? catalog.items : []
  ), [catalog?.items])

  const selectedClients = useMemo(() => (
    normalizeClientSelection(selectedClientIds)
      .map((clientId) => clientMap.get(Number(clientId)))
      .filter(Boolean)
  ), [clientMap, selectedClientIds])

  const selectedClientSummary = useMemo(() => (
    summarizeSelectedClients(selectedClientIds, selectedClients, onlineClientIdSet)
  ), [onlineClientIdSet, selectedClientIds, selectedClients])

  const selectionModel = useMemo(() => buildClientSelectionModel({
    activeClientId: null,
    selectedClientIds,
    visibleClients,
  }), [selectedClientIds, visibleClients])

  const selectedClientSort = useMemo(() => (
    CLIENT_SORT_OPTIONS.find((option) => option.value === clientSort) || CLIENT_SORT_OPTIONS[0]
  ), [clientSort])

  const selectedClientStatusFilter = useMemo(() => (
    CLIENT_ACCOUNT_FILTER_OPTIONS.find((option) => option.value === clientStatusFilter) || CLIENT_ACCOUNT_FILTER_OPTIONS[0]
  ), [clientStatusFilter])

  const selectedClientConnectionFilter = useMemo(() => (
    CLIENT_CONNECTION_FILTER_OPTIONS.find((option) => option.value === clientConnectionFilter) || CLIENT_CONNECTION_FILTER_OPTIONS[0]
  ), [clientConnectionFilter])

  const selectedClientVerificationFilter = useMemo(() => (
    CLIENT_VERIFICATION_FILTER_OPTIONS.find((option) => option.value === clientVerificationFilter) || CLIENT_VERIFICATION_FILTER_OPTIONS[0]
  ), [clientVerificationFilter])

  const selectedClientsPerPage = useMemo(() => (
    CLIENT_PAGE_SIZE_OPTIONS.find((option) => option.value === clientsPerPage) || CLIENT_PAGE_SIZE_OPTIONS[0]
  ), [clientsPerPage])

  const setClientPage = useCallback((nextPage) => {
    setRequestedClientPage(Math.max(1, Number(nextPage || 1)))
  }, [])

  const setClientSearchWithReset = useCallback((nextSearch) => {
    setClientSearch(nextSearch)
    setRequestedClientPage(1)
  }, [])

  const setClientSortWithReset = useCallback((nextSort) => {
    setClientSort(nextSort)
    setRequestedClientPage(1)
  }, [])

  const setClientStatusFilterWithReset = useCallback((nextStatusFilter) => {
    setClientStatusFilter(nextStatusFilter)
    setRequestedClientPage(1)
  }, [])

  const setClientConnectionFilterWithReset = useCallback((nextConnectionFilter) => {
    setClientConnectionFilter(nextConnectionFilter)
    setRequestedClientPage(1)
  }, [])

  const setClientVerificationFilterWithReset = useCallback((nextVerificationFilter) => {
    setClientVerificationFilter(nextVerificationFilter)
    setRequestedClientPage(1)
  }, [])

  const setClientsPerPageWithReset = useCallback((nextPageSize) => {
    setClientsPerPage(nextPageSize)
    setRequestedClientPage(1)
  }, [])

  const selectedClientFilterSummary = useMemo(() => (
    buildClientFilterSummary({
      clientStatusFilter,
      connectionFilter: clientConnectionFilter,
      verificationFilter: clientVerificationFilter,
      selectedClientStatusFilter,
      selectedClientConnectionFilter,
      selectedClientVerificationFilter,
    })
  ), [
    clientConnectionFilter,
    clientStatusFilter,
    clientVerificationFilter,
    selectedClientConnectionFilter,
    selectedClientStatusFilter,
    selectedClientVerificationFilter,
  ])

  const clientInsights = useMemo(() => (
    buildClientCatalogInsights(visibleClients, onlineClientIdSet)
  ), [onlineClientIdSet, visibleClients])

  const handleToggleClientSelection = useCallback((clientId) => {
    setSelectedClientIds((prev) => toggleClientSelection(prev, clientId))
  }, [])

  const handleSelectVisibleClients = useCallback(() => {
    setSelectedClientIds((prev) => selectVisibleClients(prev, visibleClients))
  }, [visibleClients])

  const handleClearVisibleSelection = useCallback(() => {
    setSelectedClientIds((prev) => clearVisibleClientSelection(prev, visibleClients))
  }, [visibleClients])

  const handleClearAllSelectedClients = useCallback(() => {
    setSelectedClientIds([])
  }, [])

  const handleResetClientFilters = useCallback(() => {
    setClientSearch('')
    setClientSort('activity_desc')
    setClientStatusFilter('all')
    setClientConnectionFilter('all')
    setClientVerificationFilter('all')
    setClientsPerPage(12)
    setRequestedClientPage(1)
    setOpenCatalogMenu(null)
  }, [setOpenCatalogMenu])

  return {
    clientConnectionFilter,
    clientInsights,
    clientPage,
    clientSearch,
    clientSort,
    clientStatusFilter,
    clientVerificationFilter,
    clientsPerPage,
    debouncedClientSearch,
    handleClearAllSelectedClients,
    handleClearVisibleSelection,
    handleResetClientFilters,
    handleSelectVisibleClients,
    handleToggleClientSelection,
    openCatalogMenu,
    selectedClientConnectionFilter,
    selectedClientFilterSummary,
    selectedClientIds,
    selectedClientSort,
    selectedClientStatusFilter,
    selectedClients,
    selectionModel,
    selectedClientSummary,
    selectedClientVerificationFilter,
    selectedClientsPerPage,
    setClientConnectionFilter: setClientConnectionFilterWithReset,
    setClientPage,
    setClientSearch: setClientSearchWithReset,
    setClientSort: setClientSortWithReset,
    setClientStatusFilter: setClientStatusFilterWithReset,
    setClientVerificationFilter: setClientVerificationFilterWithReset,
    setClientsPerPage: setClientsPerPageWithReset,
    setOpenCatalogMenu,
    setSelectedClientIds,
    visibleClients,
  }
}
