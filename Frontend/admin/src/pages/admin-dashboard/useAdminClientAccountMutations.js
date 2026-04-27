import { useCallback, useState } from 'react'
import { apiPut } from '../../services/adminApiClient.js'
import { ADMIN_ERROR_MESSAGES } from './feedbackMessages.js'
import { createSessionActivityEntry } from './utils.js'

function normalizeClientIds(clientIds = []) {
  return Array.from(new Set(
    (Array.isArray(clientIds) ? clientIds : [])
      .map((clientId) => Number(clientId))
      .filter(Number.isFinite)
  ))
}

export function resolveSelectedClientAccountStatusAction(clients = []) {
  if (!Array.isArray(clients) || clients.length === 0) {
    return { kind: 'empty', nextActive: null }
  }

  const allActive = clients.every((client) => client?.compteActif !== false)
  const allInactive = clients.every((client) => client?.compteActif === false)

  if (allActive) {
    return { kind: 'deactivate', nextActive: false }
  }

  if (allInactive) {
    return { kind: 'activate', nextActive: true }
  }

  return { kind: 'mixed', nextActive: null }
}

export default function useAdminClientAccountMutations({
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
}) {
  const [isAccountStatusSubmitting, setIsAccountStatusSubmitting] = useState(false)
  const [isBulkAccountStatusSubmitting, setIsBulkAccountStatusSubmitting] = useState(false)

  const toggleClientAccountStatus = useCallback(async () => {
    if (!activeClient?.id) return
    setIsAccountStatusSubmitting(true)
    setActionError(null)
    setActionInfo(null)

    try {
      const nextActive = !(clientProfile?.client || activeClient)?.compteActif
      const response = await apiPut(`/clients/${activeClient.id}/admin-account-status`, {
        active: nextActive,
      })
      setActionInfo(nextActive ? 'Compte client reactive avec succes.' : 'Compte client desactive avec succes.')
      setClientProfile((prev) => prev ? {
        ...prev,
        client: {
          ...(prev.client || {}),
          compteActif: Boolean(response?.compteActif),
        },
      } : prev)
      appendClientSessionActivity(createSessionActivityEntry(
        nextActive ? 'Activation du compte' : 'Desactivation du compte',
        {
          ...(clientProfile?.client || activeClient || {}),
          compteActif: Boolean(response?.compteActif),
          details: nextActive
            ? 'Le compte client a ete reactive par un administrateur.'
            : 'Le compte client a ete desactive par un administrateur.',
          id: activeClient.id,
        },
        'client'
      ))
      await refreshActiveClient()
    } catch (err) {
      setActionError(err.message || ADMIN_ERROR_MESSAGES.updateClientAccountStatus)
    } finally {
      setIsAccountStatusSubmitting(false)
    }
  }, [activeClient, appendClientSessionActivity, clientProfile?.client, refreshActiveClient, setActionError, setActionInfo, setClientProfile])

  const updateSelectedClientAccountStatuses = useCallback(async (clientIds = [], active = true) => {
    const normalizedIds = normalizeClientIds(clientIds)

    if (normalizedIds.length === 0) {
      setActionError('Selectionnez au moins un client.')
      return
    }

    setIsBulkAccountStatusSubmitting(true)
    setActionError(null)
    setActionInfo(null)

    try {
      const response = await apiPut('/clients/admin/account-status/bulk', {
        clientIds: normalizedIds,
        active: Boolean(active),
      })

      const updatedCount = Number(response?.updatedCount || normalizedIds.length || 0)
      const nextActive = Boolean(active)
      const nextClientsById = new Map()

      normalizedIds.forEach((clientId) => {
        const existingClient = clientMapRef.current.get(clientId) || { id: clientId }
        nextClientsById.set(clientId, {
          ...existingClient,
          compteActif: nextActive,
        })
      })

      mergeClientsIntoCache(Array.from(nextClientsById.values()))
      setCatalog((prev) => ({
        ...prev,
        items: (Array.isArray(prev?.items) ? prev.items : []).map((client) => (
          normalizedIds.includes(Number(client?.id))
            ? { ...client, compteActif: nextActive }
            : client
        )),
      }))
      setClientProfile((prev) => {
        const currentClientId = Number(prev?.client?.id)
        if (!Number.isFinite(currentClientId) || !normalizedIds.includes(currentClientId)) {
          return prev
        }

        return {
          ...prev,
          client: {
            ...(prev.client || {}),
            compteActif: nextActive,
          },
        }
      })

      setActionInfo(
        response?.message
        || (nextActive ? 'Comptes clients reactives avec succes.' : 'Comptes clients desactives avec succes.')
      )
      appendClientSessionActivity(normalizedIds.map((clientId) => {
        const client = nextClientsById.get(clientId) || { id: clientId }
        return createSessionActivityEntry(
          nextActive ? 'Activation du compte' : 'Desactivation du compte',
          {
            ...client,
            compteActif: nextActive,
            details: nextActive
              ? 'Le compte client a ete reactive par un administrateur.'
              : 'Le compte client a ete desactive par un administrateur.',
          },
          'client'
        )
      }))

      if (updatedCount > 0) {
        invalidateQueries((key) => (
          key.includes('"admin-client-directory"')
          || key.includes('"admin-client-detail"')
          || key.includes('"admin-client-lookup"')
        ))
      }
    } catch (err) {
      setActionError(err.message || ADMIN_ERROR_MESSAGES.updateClientAccountStatuses)
    } finally {
      setIsBulkAccountStatusSubmitting(false)
    }
  }, [
    appendClientSessionActivity,
    clientMapRef,
    invalidateQueries,
    mergeClientsIntoCache,
    setActionError,
    setActionInfo,
    setCatalog,
    setClientProfile,
  ])

  const toggleSelectedClientAccountStatuses = useCallback(async (clientIds = []) => {
    const normalizedIds = normalizeClientIds(clientIds)

    if (normalizedIds.length === 0) {
      setActionError('Selectionnez au moins un client.')
      return
    }

    setActionError(null)
    setActionInfo(null)

    const currentClientMap = clientMapRef.current
    const missingIds = normalizedIds.filter((clientId) => !currentClientMap.has(clientId))

    if (missingIds.length > 0) {
      await loadClientsByIds(missingIds)
    }

    const resolvedClients = normalizedIds
      .map((clientId) => clientMapRef.current.get(clientId))
      .filter(Boolean)

    if (resolvedClients.length !== normalizedIds.length) {
      setActionError('Impossible de determiner le statut de tous les clients selectionnes.')
      return
    }

    const selectionAction = resolveSelectedClientAccountStatusAction(resolvedClients)

    if (selectionAction.kind === 'deactivate') {
      await updateSelectedClientAccountStatuses(normalizedIds, false)
      return
    }

    if (selectionAction.kind === 'activate') {
      await updateSelectedClientAccountStatuses(normalizedIds, true)
      return
    }

    setActionError('La selection contient des comptes actifs et suspendus. Affinez la selection pour appliquer une action unique.')
  }, [
    clientMapRef,
    loadClientsByIds,
    setActionError,
    setActionInfo,
    updateSelectedClientAccountStatuses,
  ])

  return {
    isAccountStatusSubmitting,
    isBulkAccountStatusSubmitting,
    toggleClientAccountStatus,
    toggleSelectedClientAccountStatuses,
    updateSelectedClientAccountStatuses,
  }
}
