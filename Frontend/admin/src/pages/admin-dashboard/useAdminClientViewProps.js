import { useMemo } from 'react'
import {
  buildClientDirectoryPanelProps,
  buildClientSelectionSidebarProps,
} from './clientPanelProps.js'

export default function useAdminClientViewProps({
  actions,
  derived,
  resources,
  state,
}) {
  const directoryPanelProps = useMemo(() => buildClientDirectoryPanelProps({
    actionInfo: resources.actionInfo,
    activeClient: resources.activeClient,
    activeClientId: resources.activeClientId,
    catalog: resources.catalog,
    clientConnectionFilter: state.clientConnectionFilter,
    clientPage: state.clientPage,
    clientSearch: state.clientSearch,
    clientSort: state.clientSort,
    clientStatusFilter: state.clientStatusFilter,
    clientVerificationFilter: state.clientVerificationFilter,
    clientsPerPage: state.clientsPerPage,
    isCatalogLoading: resources.isCatalogLoading,
    isBulkAccountStatusSubmitting: resources.isBulkAccountStatusSubmitting,
    onlineClientIdSet: resources.onlineClientIdSet,
    onlineClientTotal: resources.onlineClientIds.length,
    selectedClientConnectionFilter: state.selectedClientConnectionFilter,
    selectedClientIds: state.selectedClientIds,
    selectedClientSelectionModel: state.selectionModel,
    selectedClientSort: state.selectedClientSort,
    selectedClientStatusFilter: state.selectedClientStatusFilter,
    selectedClientSummary: state.selectedClientSummary,
    selectedClientVerificationFilter: state.selectedClientVerificationFilter,
    selectedClientsPerPage: state.selectedClientsPerPage,
    visibleClients: derived.visibleClients,
    onChangeConnectionFilter: state.setClientConnectionFilter,
    onChangePage: state.setClientPage,
    onChangePageSize: state.setClientsPerPage,
    onChangeSearch: state.setClientSearch,
    onChangeSort: state.setClientSort,
    onChangeStatusFilter: state.setClientStatusFilter,
    onChangeVerificationFilter: state.setClientVerificationFilter,
    onDeactivateSelectedClients: actions.onDeactivateSelectedClients,
    onActivateSelectedClients: actions.onActivateSelectedClients,
    onToggleSelectedClients: actions.onToggleSelectedClients,
    onClearVisibleSelection: state.handleClearVisibleSelection,
    onSelectClient: actions.onSelectClient,
    onSelectVisibleClients: state.handleSelectVisibleClients,
    onToggleClientSelection: state.handleToggleClientSelection,
    openCatalogMenu: state.openCatalogMenu,
    setActionInfo: resources.setActionInfo,
    setOpenCatalogMenu: state.setOpenCatalogMenu,
  }), [
    actions,
    derived.visibleClients,
    resources,
    state,
  ])

  const selectionSidebarProps = useMemo(() => buildClientSelectionSidebarProps({
    activeClient: resources.activeClient,
    clientProfile: resources.clientProfile,
    deliveryAddresses: resources.deliveryAddresses,
    deliveryError: resources.deliveryError,
    isAccountStatusSubmitting: resources.isAccountStatusSubmitting,
    isDeliveryLoading: resources.isDeliveryLoading,
    isDeliveryUpdating: resources.isDeliveryUpdating,
    isPaymentLoading: resources.isPaymentLoading,
    isPaymentUpdating: resources.isPaymentUpdating,
    isProfileLoading: resources.isProfileLoading,
    isProfileUpdating: resources.isProfileUpdating,
    onToggleClientAccountStatus: actions.onToggleClientAccountStatus,
    onlineClientIdSet: resources.onlineClientIdSet,
    paymentError: resources.paymentError,
    paymentMethods: resources.paymentMethods,
    profileError: resources.profileError,
  }), [
    actions,
    resources,
  ])

  return {
    directoryPanelProps,
    selectionSidebarProps,
  }
}
