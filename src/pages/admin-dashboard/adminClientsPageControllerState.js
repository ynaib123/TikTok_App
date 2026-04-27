export function buildClientBulkActionHandlers({
  handleSelectClient,
  selectedClientIds,
  toggleClientAccountStatus,
  toggleSelectedClientAccountStatuses,
  updateSelectedClientAccountStatuses,
}) {
  const hasSelection = selectedClientIds.length > 0

  return {
    onActivateSelectedClients: () => (
      hasSelection
        ? updateSelectedClientAccountStatuses(selectedClientIds, true)
        : undefined
    ),
    onDeactivateSelectedClients: () => (
      hasSelection
        ? updateSelectedClientAccountStatuses(selectedClientIds, false)
        : undefined
    ),
    onSelectClient: handleSelectClient,
    onToggleClientAccountStatus: toggleClientAccountStatus,
    onToggleSelectedClients: () => (
      hasSelection
        ? toggleSelectedClientAccountStatuses(selectedClientIds)
        : undefined
    ),
  }
}

export function getPendingClientHydrationId({
  activeClientId,
  clientMap,
}) {
  const normalizedActiveClientId = Number(activeClientId)
  if (!Number.isFinite(normalizedActiveClientId)) return null
  if (clientMap.has(normalizedActiveClientId)) return null
  return normalizedActiveClientId
}

export function shouldRedirectToClientDirectory({
  routeClientId,
  totalItems,
}) {
  return !totalItems && routeClientId != null
}
