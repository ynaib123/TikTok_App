import { useMemo } from 'react'
import { createSessionActivityEntry } from './utils.js'

export function createClientNavigationActions({
  appendClientSessionActivity,
  clientMap,
  navigate,
  routeClientId,
  setActionInfo,
  setActiveClientId,
}) {
  return {
    clearActionInfo() {
      setActionInfo(null)
    },
    handleSelectClient(nextClientId) {
      const normalizedId = Number(nextClientId)
      if (!Number.isFinite(normalizedId)) return
      appendClientSessionActivity?.(createSessionActivityEntry(
        'Consultation',
        clientMap?.get(normalizedId) || { id: normalizedId },
        'client'
      ))
      setActiveClientId(normalizedId)
      navigate(`/clients/${normalizedId}`)
    },
    redirectToClientDirectory() {
      navigate('/clients', { replace: true })
    },
    syncRouteWithActiveClient(activeClientId) {
      const normalizedId = Number(activeClientId)
      if (!Number.isFinite(normalizedId)) return
      if (routeClientId === normalizedId) return
      navigate(`/clients/${normalizedId}`, { replace: routeClientId == null })
    },
  }
}

export default function useAdminClientUiActions({
  appendClientSessionActivity,
  clientMap,
  navigate,
  routeClientId,
  setActionInfo,
  setActiveClientId,
}) {
  return useMemo(() => createClientNavigationActions({
    appendClientSessionActivity,
    clientMap,
    navigate,
    routeClientId,
    setActionInfo,
    setActiveClientId,
  }), [appendClientSessionActivity, clientMap, navigate, routeClientId, setActionInfo, setActiveClientId])
}
