import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { apiGet } from '../../services/adminApiClient.js'
import { ADMIN_SESSION_ACTIVITY_STORAGE_KEY } from './constants.js'
import { ADMIN_ERROR_MESSAGES } from './feedbackMessages.js'
import { appendStoredSessionActivity } from './sessionActivityStorage.js'
import {
  buildClientDirectoryQuery,
  normalizeClientCatalogResponse,
  normalizeDeliveryAddresses,
  normalizePaymentMethods,
} from './adminClientState.js'
import useAdminQueryCache from './useAdminQueryCache.js'
import useAdminClientPresence from './useAdminClientPresence.js'
import useAdminClientAccountMutations from './useAdminClientAccountMutations.js'

const DIRECTORY_STALE_TIME = 30_000
const DETAIL_STALE_TIME = 15_000

export default function useAdminClientResources({
  connectionFilter,
  search,
  sort,
  page,
  size,
  statusFilter,
  verificationFilter,
}) {
  const [catalog, setCatalog] = useState({ items: [], page: 1, size: 12, totalItems: 0, totalPages: 0 })
  const [clients, setClients] = useState([])
  const [isCatalogLoading, setIsCatalogLoading] = useState(false)
  const [catalogError, setCatalogError] = useState(null)
  const [activeClientId, setActiveClientId] = useState(null)
  const [clientProfile, setClientProfile] = useState(null)
  const [isProfileLoading, setIsProfileLoading] = useState(false)
  const [profileError, setProfileError] = useState(null)
  const [deliveryAddresses, setDeliveryAddresses] = useState([])
  const [deliveryError, setDeliveryError] = useState(null)
  const [isDeliveryLoading, setIsDeliveryLoading] = useState(false)
  const [paymentMethods, setPaymentMethods] = useState([])
  const [paymentError, setPaymentError] = useState(null)
  const [isPaymentLoading, setIsPaymentLoading] = useState(false)
  const [actionError, setActionError] = useState(null)
  const [actionInfo, setActionInfo] = useState(null)
  const requestIdRef = useRef(0)
  const detailRequestIdRef = useRef(0)
  const clientMapRef = useRef(new Map())
  const { fetchQuery, invalidateQueries } = useAdminQueryCache()
  const presence = useAdminClientPresence()

  const mergeClientsIntoCache = useCallback((incomingClients) => {
    setClients((prev) => {
      const nextById = new Map(
        (Array.isArray(prev) ? prev : [])
          .map((client) => [Number(client?.id), client])
          .filter(([clientId]) => Number.isFinite(clientId))
      )

      ;(Array.isArray(incomingClients) ? incomingClients : []).forEach((client) => {
        const clientId = Number(client?.id)
        if (!Number.isFinite(clientId)) return
        nextById.set(clientId, client)
      })

      const nextClients = Array.from(nextById.values())
      const previousClients = Array.isArray(prev) ? prev : []
      const hasChanged = nextClients.length !== previousClients.length
        || nextClients.some((client, index) => client !== previousClients[index])

      return hasChanged ? nextClients : prev
    })
  }, [])

  const clientMap = useMemo(() => (
    new Map(
      clients
        .map((client) => [Number(client?.id), client])
        .filter(([clientId]) => Number.isFinite(clientId))
    )
  ), [clients])

  useEffect(() => {
    clientMapRef.current = clientMap
  }, [clientMap])

  const appendClientSessionActivity = useCallback((entries) => {
    appendStoredSessionActivity(entries, {
      storageKey: ADMIN_SESSION_ACTIVITY_STORAGE_KEY,
    })
  }, [])

  const loadCatalog = useCallback(async () => {
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    setIsCatalogLoading(true)
    setCatalogError(null)

    try {
      const serializedQuery = buildClientDirectoryQuery({
        connectionFilter,
        page,
        search,
        size,
        sort,
        statusFilter,
        verificationFilter,
      })
      const response = await fetchQuery({
        key: ['admin-client-directory', serializedQuery],
        staleTime: DIRECTORY_STALE_TIME,
        fetcher: () => apiGet(`/clients/admin/directory?${serializedQuery}`),
      })

      if (requestIdRef.current !== requestId) return
      const normalizedCatalog = normalizeClientCatalogResponse(response)
      setCatalog(normalizedCatalog)
      mergeClientsIntoCache(normalizedCatalog.items)
    } catch (err) {
      if (requestIdRef.current !== requestId) return
      setCatalogError(err.message || ADMIN_ERROR_MESSAGES.loadClients)
      setCatalog({ items: [], page, size, totalItems: 0, totalPages: 0 })
    } finally {
      if (requestIdRef.current === requestId) {
        setIsCatalogLoading(false)
      }
    }
  }, [connectionFilter, fetchQuery, mergeClientsIntoCache, page, search, size, sort, statusFilter, verificationFilter])

  useEffect(() => {
    void loadCatalog()
  }, [loadCatalog])

  useEffect(() => {
    if (catalog.items.length === 0) {
      if (isCatalogLoading) return

      const normalizedActiveClientId = Number(activeClientId)
      if (Number.isFinite(normalizedActiveClientId) && clientMap.has(normalizedActiveClientId)) {
        return
      }

      setActiveClientId(null)
      return
    }

    if (activeClientId != null && clientMap.has(Number(activeClientId))) return

    const currentClient = catalog.items.find((client) => Number(client?.id) === Number(activeClientId))
    if (currentClient) return
    setActiveClientId(Number(catalog.items[0].id))
  }, [activeClientId, catalog.items, clientMap, isCatalogLoading])

  const activeClient = useMemo(() => (
    clientMap.get(Number(activeClientId))
    || catalog.items.find((client) => Number(client?.id) === Number(activeClientId))
    || null
  ), [activeClientId, catalog.items, clientMap])

  const loadClientsByIds = useCallback(async (clientIds = []) => {
    const normalizedIds = Array.from(new Set(
      (Array.isArray(clientIds) ? clientIds : [])
        .map((clientId) => Number(clientId))
        .filter(Number.isFinite)
    ))

    const currentClientMap = clientMapRef.current
    const missingIds = normalizedIds.filter((clientId) => !currentClientMap.has(clientId))
    if (missingIds.length === 0) {
      return normalizedIds
        .map((clientId) => currentClientMap.get(clientId))
        .filter(Boolean)
    }

    try {
      const response = await fetchQuery({
        key: ['admin-client-lookup', missingIds.join(',')],
        staleTime: DETAIL_STALE_TIME,
        fetcher: () => apiGet(`/clients/admin/lookup?ids=${missingIds.join(',')}`),
      })
      mergeClientsIntoCache(response)
      return response
    } catch (err) {
      setActionError(err.message || 'Impossible de charger les clients selectionnes.')
      return []
    }
  }, [fetchQuery, mergeClientsIntoCache])

  useEffect(() => {
    if (!activeClient?.id) {
      setClientProfile(null)
      setDeliveryAddresses([])
      setPaymentMethods([])
      setProfileError(null)
      setDeliveryError(null)
      setPaymentError(null)
      setIsProfileLoading(false)
      setIsDeliveryLoading(false)
      setIsPaymentLoading(false)
      return
    }

    const requestId = detailRequestIdRef.current + 1
    detailRequestIdRef.current = requestId

    const loadProfile = async () => {
      setIsProfileLoading(true)
      setIsDeliveryLoading(true)
      setIsPaymentLoading(true)
      setProfileError(null)
      setDeliveryError(null)
      setPaymentError(null)

      try {
        const response = await fetchQuery({
          key: ['admin-client-detail', String(activeClient.id)],
          staleTime: DETAIL_STALE_TIME,
          fetcher: () => apiGet(`/clients/${activeClient.id}/admin-detail?recentOrdersLimit=5`),
        })
        if (detailRequestIdRef.current !== requestId) return
        setClientProfile(response?.profile || null)
        setDeliveryAddresses(normalizeDeliveryAddresses(response?.deliveryAddresses))
        setPaymentMethods(normalizePaymentMethods(response?.paymentMethods))
      } catch (err) {
        if (detailRequestIdRef.current !== requestId) return
        setProfileError(err.message || 'Impossible de charger le profil du client.')
        setDeliveryError(err.message || 'Impossible de charger les adresses.')
        setPaymentError(err.message || 'Impossible de charger les moyens de paiement.')
      } finally {
        if (detailRequestIdRef.current === requestId) {
          setIsProfileLoading(false)
          setIsDeliveryLoading(false)
          setIsPaymentLoading(false)
        }
      }
    }

    void loadProfile()
  }, [activeClient?.id, fetchQuery])

  useEffect(() => {
    if (!clientProfile?.client?.id) return
    mergeClientsIntoCache([clientProfile.client])
  }, [clientProfile?.client, mergeClientsIntoCache])

  const refreshDirectory = useCallback(() => {
    invalidateQueries((key) => key.includes('"admin-client-directory"'))
    void loadCatalog()
  }, [invalidateQueries, loadCatalog])

  const refreshActiveClient = useCallback(async () => {
    if (!activeClient?.id) return
    invalidateQueries((key) => (
      key.includes(`"admin-client-detail","${activeClient.id}"`)
      || key.includes('"admin-client-lookup"')
    ))
    invalidateQueries((key) => key.includes('"admin-client-directory"'))
    await loadCatalog()
    await loadClientsByIds([activeClient.id])
    setActiveClientId(Number(activeClient.id))
  }, [activeClient?.id, invalidateQueries, loadCatalog, loadClientsByIds])

  const accountMutations = useAdminClientAccountMutations({
    activeClient,
    appendClientSessionActivity,
    clientMapRef,
    clientProfile,
    invalidateQueries,
    loadClientsByIds,
    mergeClientsIntoCache,
    refreshActiveClient,
    setActionError,
    setActionInfo,
    setCatalog,
    setClientProfile,
  })

  return {
    activeClient,
    activeClientId,
    actionError,
    actionInfo,
    appendClientSessionActivity,
    catalog,
    catalogError,
    clientMap,
    clientProfile,
    clients,
    deliveryAddresses,
    deliveryError,
    isCatalogLoading,
    isDeliveryLoading,
    isDeliveryUpdating: isDeliveryLoading && deliveryAddresses.length > 0,
    isPaymentLoading,
    isPaymentUpdating: isPaymentLoading && paymentMethods.length > 0,
    isProfileLoading,
    isProfileUpdating: isProfileLoading && clientProfile != null,
    loadClientsByIds,
    mergeClientsIntoCache,
    paymentError,
    paymentMethods,
    profileError,
    refreshDirectory,
    setActionError,
    setActionInfo,
    setActiveClientId,
    setCatalogError,
    setDeliveryError,
    setPaymentError,
    setProfileError,
    ...presence,
    ...accountMutations,
  }
}
