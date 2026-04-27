import { useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  buildActiveClientErrorBanner,
  getVisibleClients,
  parseRouteClientId,
} from './clientPageState.js'
import {
  buildClientBulkActionHandlers,
  getPendingClientHydrationId,
  shouldRedirectToClientDirectory,
} from './adminClientsPageControllerState.js'
import useAdminClientCatalogState from './useAdminClientCatalogState.js'
import useAdminClientResources from './useAdminClientResources.js'
import useAdminClientUiActions from './useAdminClientUiActions.js'
import useAdminClientViewProps from './useAdminClientViewProps.js'

export default function useAdminClientsPageController() {
  const navigate = useNavigate()
  const { clientId } = useParams()
  const routeClientId = parseRouteClientId(clientId)
  const clientCatalogState = useAdminClientCatalogState()

  const resources = useAdminClientResources({
    connectionFilter: clientCatalogState.clientConnectionFilter,
    page: clientCatalogState.clientPage,
    search: clientCatalogState.debouncedClientSearch,
    size: clientCatalogState.clientsPerPage,
    sort: clientCatalogState.clientSort,
    statusFilter: clientCatalogState.clientStatusFilter,
    verificationFilter: clientCatalogState.clientVerificationFilter,
  })
  const {
    actionInfo,
    activeClientId,
    appendClientSessionActivity,
    catalog,
    clientMap,
    loadClientsByIds,
    setActionInfo,
    setActiveClientId,
    toggleClientAccountStatus,
    toggleSelectedClientAccountStatuses,
    updateSelectedClientAccountStatuses,
  } = resources

  const uiActions = useAdminClientUiActions({
    appendClientSessionActivity,
    clientMap,
    navigate,
    routeClientId,
    setActionInfo,
    setActiveClientId,
  })

  useEffect(() => {
    if (routeClientId == null) return
    setActiveClientId(routeClientId)
  }, [routeClientId, setActiveClientId])

  useEffect(() => {
    const hydrationClientId = getPendingClientHydrationId({
      activeClientId,
      clientMap,
    })
    if (hydrationClientId == null) return
    void loadClientsByIds([hydrationClientId])
  }, [activeClientId, clientMap, loadClientsByIds])

  useEffect(() => {
    if (!activeClientId) return
    uiActions.syncRouteWithActiveClient(activeClientId)
  }, [activeClientId, uiActions])

  useEffect(() => {
    if (!shouldRedirectToClientDirectory({
      routeClientId,
      totalItems: catalog.totalItems,
    })) {
      return
    }

    uiActions.redirectToClientDirectory()
  }, [catalog.totalItems, routeClientId, uiActions])

  useEffect(() => {
    if (!actionInfo) return undefined
    const timeoutId = window.setTimeout(() => uiActions.clearActionInfo(), 4000)
    return () => window.clearTimeout(timeoutId)
  }, [actionInfo, uiActions])

  const visibleClients = useMemo(() => getVisibleClients(resources.catalog), [resources.catalog])
  const clientActions = useMemo(() => buildClientBulkActionHandlers({
    handleSelectClient: uiActions.handleSelectClient,
    selectedClientIds: clientCatalogState.selectedClientIds,
    toggleClientAccountStatus,
    toggleSelectedClientAccountStatuses,
    updateSelectedClientAccountStatuses,
  }), [
    clientCatalogState.selectedClientIds,
    toggleClientAccountStatus,
    toggleSelectedClientAccountStatuses,
    updateSelectedClientAccountStatuses,
    uiActions.handleSelectClient,
  ])

  const {
    directoryPanelProps,
    selectionSidebarProps,
  } = useAdminClientViewProps({
    actions: clientActions,
    derived: {
      visibleClients,
    },
    resources: {
      actionInfo: resources.actionInfo,
      activeClient: resources.activeClient,
      activeClientId: resources.activeClientId,
      catalog: resources.catalog,
      clientProfile: resources.clientProfile,
      deliveryAddresses: resources.deliveryAddresses,
      deliveryError: resources.deliveryError,
      isAccountStatusSubmitting: resources.isAccountStatusSubmitting,
      isBulkAccountStatusSubmitting: resources.isBulkAccountStatusSubmitting,
      isCatalogLoading: resources.isCatalogLoading,
      isDeliveryLoading: resources.isDeliveryLoading,
      isDeliveryUpdating: resources.isDeliveryUpdating,
      isPaymentLoading: resources.isPaymentLoading,
      isPaymentUpdating: resources.isPaymentUpdating,
      isProfileLoading: resources.isProfileLoading,
      isProfileUpdating: resources.isProfileUpdating,
      onlineClientIdSet: resources.onlineClientIdSet,
      onlineClientIds: resources.onlineClientIds,
      paymentError: resources.paymentError,
      paymentMethods: resources.paymentMethods,
      profileError: resources.profileError,
      setActionInfo: resources.setActionInfo,
    },
    state: clientCatalogState,
  })

  const activeErrorBanner = useMemo(() => buildActiveClientErrorBanner({
    actionError: resources.actionError,
    catalogError: resources.catalogError,
    deliveryError: resources.deliveryError,
    paymentError: resources.paymentError,
    profileError: resources.profileError,
    setActionError: resources.setActionError,
    setCatalogError: resources.setCatalogError,
    setDeliveryError: resources.setDeliveryError,
    setPaymentError: resources.setPaymentError,
    setProfileError: resources.setProfileError,
  }), [
    resources.actionError,
    resources.catalogError,
    resources.deliveryError,
    resources.paymentError,
    resources.profileError,
    resources.setActionError,
    resources.setCatalogError,
    resources.setDeliveryError,
    resources.setPaymentError,
    resources.setProfileError,
  ])

  return {
    activeClientId: resources.activeClientId,
    activeErrorBanner,
    blockingMessage: (
      resources.isBulkAccountStatusSubmitting
        ? 'Traitement en cours...'
        : "Chargement de l'espace admin..."
    ),
    directoryPanelProps,
    isBlocking: Boolean(resources.isBulkAccountStatusSubmitting),
    selectionSidebarProps,
  }
}
