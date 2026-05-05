import { useEffect, useMemo, useRef, useState } from 'react'
import {
  useLocation,
  useSearchParams,
  type Location,
} from 'react-router-dom'

import {
  useAccountsFeedback,
  useAccountsForm,
  useServiceConnections,
  useTikTokAccounts,
} from '../hooks'
import { useFocusTrap } from '../hooks/useFocusTrap'
import {
  SERVICE_CONNECTION_FIELDS,
  SERVICE_PROVIDER_CATEGORY,
  type ServiceCategory,
  type ServiceProviderFieldConfig,
  createEmptyServiceForm,
} from '../types/services'
import type { ServiceProvider } from '../types'
import {
  deriveStatus,
  deriveTikTokStatus,
  parseScopes,
  type DerivedStatus,
} from '../utils/accountsHelpers'
import { getErrorMessage } from '../components/accounts/getErrorMessage'
import type {
  AccountsActionStatus,
  AccountsListRow,
} from '../components/accounts/AccountsList'

interface AccountsLocationState {
  tiktokOAuthSuccess?: string
  accountsWarning?: string
}

export function useTikTokAccountsController() {
  const location = useLocation() as Location<AccountsLocationState>
  const [searchParams, setSearchParams] = useSearchParams()
  const [isConnectingTikTok, setIsConnectingTikTok] = useState(false)
  const [pendingActions, setPendingActions] = useState<
    Record<string, AccountsActionStatus | null>
  >({})

  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<ServiceCategory | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | DerivedStatus>('all')
  const [connectMenuOpen, setConnectMenuOpen] = useState(false)
  const [stepperStep, setStepperStep] = useState(0)
  const [confirmName, setConfirmName] = useState('')
  const modalRef = useRef<HTMLDivElement | null>(null)

  const setPendingAction = (key: string, status: AccountsActionStatus | null) => {
    setPendingActions((current) => {
      if (status === null) {
        const next = { ...current }
        delete next[key]
        return next
      }
      return { ...current, [key]: status }
    })
  }

  const hasPendingAction = (
    key: string | null | undefined,
    status: AccountsActionStatus,
  ) => {
    if (!key) return false
    return pendingActions[key] === status
  }

  const initialFeedbackMessage = useMemo(
    () =>
      searchParams.get('tiktokSuccess') === '1'
        ? 'Compte TikTok connecté avec succès.'
        : location.state?.tiktokOAuthSuccess || location.state?.accountsWarning || null,
    [location.state, searchParams],
  )

  const {
    accounts: tiktokAccounts,
    connect,
    disconnect,
    error: accountsError,
  } = useTikTokAccounts()

  const {
    activeConnectionsByProvider,
    connectionsByProvider,
    save,
    validate,
    remove,
  } = useServiceConnections()

  const {
    feedbackItems,
    errorMessage,
    setErrorMessage,
    setSuccessMessage,
    showError,
    showSuccess,
  } = useAccountsFeedback(initialFeedbackMessage)

  const {
    openModalProviderKey,
    serviceForms,
    closeModal,
    resetProviderForm,
    setServiceForms,
    startNewServiceProfile,
    loadServiceProfile,
    updateServiceForm,
  } = useAccountsForm()

  useEffect(() => {
    setServiceForms((current) => {
      const next = { ...current }
      let hasChanges = false

      ;(Object.keys(SERVICE_CONNECTION_FIELDS) as ServiceProvider[]).forEach((providerKey) => {
        const activeConnection = activeConnectionsByProvider[providerKey] || null
        const currentForm = current[providerKey]
        const providerConnections = connectionsByProvider[providerKey] || []
        const shouldKeepEditingCurrentProfile =
          currentForm?.connectionId &&
          providerConnections.some((connection) => connection.id === currentForm.connectionId)
        const sourceConnection = shouldKeepEditingCurrentProfile
          ? providerConnections.find(
              (connection) => connection.id === currentForm.connectionId,
            ) || activeConnection
          : activeConnection
        const nextForm = {
          ...createEmptyServiceForm(sourceConnection),
          secretValue: currentForm?.secretValue || '',
          metadataJson: currentForm?.metadataJson || sourceConnection?.metadataJson || '',
        }

        const isSameForm =
          currentForm &&
          currentForm.connectionId === nextForm.connectionId &&
          currentForm.displayName === nextForm.displayName &&
          currentForm.baseUrl === nextForm.baseUrl &&
          currentForm.accountIdentifier === nextForm.accountIdentifier &&
          currentForm.secretValue === nextForm.secretValue &&
          currentForm.metadataJson === nextForm.metadataJson

        if (!isSameForm) {
          hasChanges = true
          next[providerKey] = nextForm
        }
      })

      return hasChanges ? next : current
    })
  }, [activeConnectionsByProvider, connectionsByProvider, setServiceForms])

  useEffect(() => {
    if (location.state?.tiktokOAuthSuccess || location.state?.accountsWarning) {
      window.history.replaceState({}, document.title)
    }
    if (searchParams.get('tiktokSuccess') === '1') {
      setSearchParams({}, { replace: true })
    }
  }, [location.state, searchParams, setSearchParams])

  useEffect(() => {
    if (openModalProviderKey) {
      setStepperStep(1)
      setConfirmName('')
    } else {
      setStepperStep(0)
    }
  }, [openModalProviderKey])

  useFocusTrap(modalRef, Boolean(openModalProviderKey), () => {
    if (openModalProviderKey) closeModal(openModalProviderKey)
  })

  const handleConnectTikTok = async () => {
    setIsConnectingTikTok(true)
    setSuccessMessage(null)
    setErrorMessage(null)
    try {
      const response = await connect('/accounts')
      window.location.assign(response.authUrl)
    } catch (requestError) {
      showError(getErrorMessage(requestError, 'Impossible de lancer la connexion TikTok.'))
      setIsConnectingTikTok(false)
    }
  }

  const handleSaveService = async (providerKey: ServiceProvider) => {
    setPendingAction(providerKey, 'saving')
    setSuccessMessage(null)
    setErrorMessage(null)
    try {
      const baseForm = serviceForms[providerKey] || createEmptyServiceForm(null, providerKey)
      const providerDefaults = SERVICE_CONNECTION_FIELDS[providerKey]
      const formWithDefaults = {
        ...baseForm,
        baseUrl: (baseForm.baseUrl || '').trim() || providerDefaults.defaultBaseUrl,
        metadataJson: (baseForm.metadataJson || '').trim() || providerDefaults.metadataPlaceholder,
      }
      await save(providerKey, formWithDefaults)
      resetProviderForm(providerKey)
      setStepperStep(3)
      showSuccess(`${SERVICE_CONNECTION_FIELDS[providerKey].title} validé et activé.`)
    } catch (requestError) {
      showError(getErrorMessage(requestError, `Impossible d'enregistrer ${providerKey}.`))
    } finally {
      setPendingAction(providerKey, null)
    }
  }

  const handleValidateService = async (providerKey: ServiceProvider, connectionId: number) => {
    const connectionKey = `${providerKey}-${connectionId}`
    setPendingAction(connectionKey, 'validating')
    setSuccessMessage(null)
    setErrorMessage(null)
    try {
      await validate(providerKey, connectionId)
      showSuccess(`${SERVICE_CONNECTION_FIELDS[providerKey].title} revalidé.`)
    } catch (requestError) {
      showError(getErrorMessage(requestError, `Impossible de valider ${providerKey}.`))
    } finally {
      setPendingAction(connectionKey, null)
    }
  }

  const handleDeleteService = async (providerKey: ServiceProvider, connectionId: number) => {
    const connectionKey = `${providerKey}-${connectionId}`
    setPendingAction(connectionKey, 'disconnecting')
    setSuccessMessage(null)
    setErrorMessage(null)
    try {
      await remove(providerKey, connectionId)
      if (serviceForms[providerKey]?.connectionId === connectionId) {
        startNewServiceProfile(providerKey)
      }
      showSuccess(`${SERVICE_CONNECTION_FIELDS[providerKey].title} supprimé.`)
    } catch (requestError) {
      showError(getErrorMessage(requestError, `Impossible de supprimer ${providerKey}.`))
    } finally {
      setPendingAction(connectionKey, null)
    }
  }

  const handleDisconnectTikTok = async (accountId: number) => {
    const accountKey = `TIKTOK-${accountId}`
    setPendingAction(accountKey, 'disconnecting')
    setSuccessMessage(null)
    setErrorMessage(null)
    try {
      await disconnect(accountId)
      showSuccess('Compte TikTok déconnecté.')
    } catch (requestError) {
      showError(getErrorMessage(requestError, 'Impossible de déconnecter le compte TikTok.'))
    } finally {
      setPendingAction(accountKey, null)
    }
  }

  const rows = useMemo<AccountsListRow[]>(() => {
    const out: AccountsListRow[] = []

    tiktokAccounts.forEach((account) => {
      out.push({
        key: `TIKTOK-${account.id}`,
        providerKey: 'TIKTOK',
        title: 'TikTok',
        detail: account.nickname || `Account #${account.id}`,
        status: deriveTikTokStatus(account),
        kind: 'OAuth',
        expiresAt: account.expiresAt ?? null,
        lastUsedAt: account.lastUsedAt ?? null,
        rateUsage: account.rateUsage ?? null,
        scopes: account.scopes ?? ['video.upload', 'video.publish'],
        isTikTok: true,
        accountId: account.id,
      })
    })

    ;(
      Object.entries(SERVICE_CONNECTION_FIELDS) as Array<
        [ServiceProvider, ServiceProviderFieldConfig]
      >
    ).forEach(([providerKey, providerConfig]) => {
      const connection = activeConnectionsByProvider[providerKey] || null
      const allConnections = connectionsByProvider[providerKey] || []
      const target = connection || allConnections[0] || null

      if (target) {
        out.push({
          key: `${providerKey}-${target.id}`,
          providerKey,
          title: providerConfig.title,
          detail: target.displayName || target.accountIdentifier || providerConfig.title,
          status: deriveStatus(target),
          kind: 'API key',
          expiresAt: target.expiresAt ?? null,
          lastUsedAt: target.lastUsedAt ?? target.lastValidatedAt ?? null,
          rateUsage: target.rateUsage ?? null,
          scopes: parseScopes(target.metadataJson),
          isTikTok: false,
          connection: target,
        })
      }
    })

    return out
  }, [tiktokAccounts, activeConnectionsByProvider, connectionsByProvider])

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((row) => {
      if (statusFilter !== 'all' && row.status !== statusFilter) return false
      if (activeCategory !== 'all') {
        const rowCategory =
          SERVICE_PROVIDER_CATEGORY[row.providerKey as keyof typeof SERVICE_PROVIDER_CATEGORY]
        if (rowCategory !== activeCategory) return false
      }
      if (!q) return true
      return (
        row.title.toLowerCase().includes(q) ||
        row.detail.toLowerCase().includes(q) ||
        row.providerKey.toLowerCase().includes(q)
      )
    })
  }, [rows, search, statusFilter, activeCategory])

  const countsByCategory = useMemo(() => {
    const counts: Record<string, number> = { all: rows.length }
    for (const row of rows) {
      const c =
        SERVICE_PROVIDER_CATEGORY[row.providerKey as keyof typeof SERVICE_PROVIDER_CATEGORY]
      if (c) counts[c] = (counts[c] || 0) + 1
    }
    return counts as Partial<Record<ServiceCategory | 'all', number>>
  }, [rows])

  const stats = useMemo(() => {
    const total = rows.length
    const healthy = rows.filter((r) => r.status === 'healthy').length
    const warning = rows.filter((r) => r.status === 'warning').length
    const off = rows.filter((r) => r.status === 'off').length
    return { total, healthy, warning, off }
  }, [rows])

  const availableProviders = useMemo(() => {
    const list: { key: string; title: string; kind: 'OAuth' | 'API key' }[] = []
    if (tiktokAccounts.length === 0) {
      list.push({ key: 'TIKTOK', title: 'TikTok', kind: 'OAuth' })
    }
    ;(
      Object.entries(SERVICE_CONNECTION_FIELDS) as Array<
        [ServiceProvider, ServiceProviderFieldConfig]
      >
    ).forEach(([providerKey, providerConfig]) => {
      list.push({
        key: providerKey,
        title: providerConfig.title,
        kind: 'API key',
      })
    })
    return list
  }, [tiktokAccounts])

  const activeProviderConfig = openModalProviderKey
    ? SERVICE_CONNECTION_FIELDS[openModalProviderKey]
    : null
  const activeForm = openModalProviderKey
    ? serviceForms[openModalProviderKey] ||
      createEmptyServiceForm(null, openModalProviderKey)
    : null
  const isEditingExistingProfile = Boolean(activeForm?.connectionId)

  return {
    // Data
    tiktokAccounts,
    accountsError,
    feedbackItems,
    errorMessage,
    rows,
    filteredRows,
    countsByCategory,
    stats,
    availableProviders,
    // Filters/UI state
    viewMode,
    setViewMode,
    search,
    setSearch,
    activeCategory,
    setActiveCategory,
    statusFilter,
    setStatusFilter,
    connectMenuOpen,
    setConnectMenuOpen,
    isConnectingTikTok,
    // Modal state
    openModalProviderKey,
    activeProviderConfig,
    activeForm,
    isEditingExistingProfile,
    stepperStep,
    setStepperStep,
    confirmName,
    setConfirmName,
    modalRef,
    // Handlers
    hasPendingAction,
    closeModal,
    handleConnectTikTok,
    handleSaveService,
    handleValidateService,
    handleDeleteService,
    handleDisconnectTikTok,
    loadServiceProfile,
    startNewServiceProfile,
    updateServiceForm,
  }
}
