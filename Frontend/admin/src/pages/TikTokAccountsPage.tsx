import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useSearchParams, type Location } from 'react-router-dom'

import AdminShell from '../components/AdminShell'
import {
  ProviderGlyph,
  StatTile,
  StatusPill,
} from '../components/accounts/AccountsPresenters'
import { getErrorMessage } from '../components/accounts/getErrorMessage'
import {
  useAccountsFeedback,
  useAccountsForm,
  useServiceConnections,
  useTikTokAccounts,
} from '../hooks'
import {
  SERVICE_CONNECTION_FIELDS,
  createEmptyServiceForm,
  type ServiceProviderFieldConfig,
} from '../types/services'
import type { ServiceConnection, ServiceProvider, TikTokAccount } from '../types'
import {
  deriveStatus,
  deriveTikTokStatus,
  formatExpiry,
  formatRelative,
  parseScopes,
  type DerivedStatus,
} from '../utils/accountsHelpers'
import '../styles/features/journey.css'
import '../styles/features/accounts.css'

type AccountsLocationState = {
  tiktokOAuthSuccess?: string
  accountsWarning?: string
}

type ActionStatus = 'saving' | 'disconnecting' | 'activating' | 'validating'

export default function TikTokAccountsPage() {
  const location = useLocation() as Location<AccountsLocationState>
  const [searchParams, setSearchParams] = useSearchParams()
  const [isConnectingTikTok, setIsConnectingTikTok] = useState(false)
  const [pendingActions, setPendingActions] = useState<Record<string, ActionStatus | null>>({})

  // New UI state
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | DerivedStatus>('all')
  const [connectMenuOpen, setConnectMenuOpen] = useState(false)
  const [stepperStep, setStepperStep] = useState(0) // 0=closed, 1=auth, 2=scopes, 3=done
  const [confirmName, setConfirmName] = useState('')
  const modalRef = useRef<HTMLDivElement | null>(null)

  const setPendingAction = (key: string, status: ActionStatus | null) => {
    setPendingActions((current) => {
      if (status === null) {
        const next = { ...current }
        delete next[key]
        return next
      }
      return { ...current, [key]: status }
    })
  }

  const hasPendingAction = (key: string | null | undefined, status: ActionStatus) => {
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
    activate: _activate,
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

  /* ------------------------------------------------------------------ */
  /* Sync forms with active connections (preserved from original)        */
  /* ------------------------------------------------------------------ */
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
          ? providerConnections.find((connection) => connection.id === currentForm.connectionId) || activeConnection
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

  /* ------------------------------------------------------------------ */
  /* Reset stepper when the active provider modal changes                */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    if (openModalProviderKey) {
      setStepperStep(1)
      setConfirmName('')
    } else {
      setStepperStep(0)
    }
  }, [openModalProviderKey])

  useEffect(() => {
    if (!openModalProviderKey || !modalRef.current) return

    const modalElement = modalRef.current
    const focusableElements = Array.from(
      modalElement.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      ),
    )
    const firstFocusable = focusableElements[0]
    const lastFocusable = focusableElements[focusableElements.length - 1]
    firstFocusable?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeModal(openModalProviderKey)
        return
      }

      if (event.key !== 'Tab' || focusableElements.length === 0) return

      if (event.shiftKey && document.activeElement === firstFocusable) {
        event.preventDefault()
        lastFocusable?.focus()
      } else if (!event.shiftKey && document.activeElement === lastFocusable) {
        event.preventDefault()
        firstFocusable?.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [closeModal, openModalProviderKey, stepperStep])

  /* ------------------------------------------------------------------ */
  /* Action handlers (preserved from original — same hooks)              */
  /* ------------------------------------------------------------------ */
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
      await save(providerKey, serviceForms[providerKey] || createEmptyServiceForm(null, providerKey))
      resetProviderForm(providerKey)
      setStepperStep(3) // jump to done step instead of closing
      showSuccess(`${SERVICE_CONNECTION_FIELDS[providerKey].title} validé et activé.`)
    } catch (requestError) {
      showError(getErrorMessage(requestError, `Impossible d'enregistrer ${providerKey}.`))
    } finally {
      setPendingAction(providerKey, null)
    }
  }

  const _handleActivateService = async (providerKey: ServiceProvider, connectionId: number) => {
    const connectionKey = `${providerKey}-${connectionId}`
    setPendingAction(connectionKey, 'activating')
    setSuccessMessage(null)
    setErrorMessage(null)
    try {
      await _activate(providerKey, connectionId)
      showSuccess(`${SERVICE_CONNECTION_FIELDS[providerKey].title} activé.`)
    } catch (requestError) {
      showError(getErrorMessage(requestError, `Impossible d'activer ${providerKey}.`))
    } finally {
      setPendingAction(connectionKey, null)
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

  /* ------------------------------------------------------------------ */
  /* Derived rows: unified list of TikTok + service connections          */
  /* ------------------------------------------------------------------ */
  type Row = {
    key: string
    providerKey: string
    title: string
    detail: string
    status: DerivedStatus
    kind: 'OAuth' | 'API key'
    expiresAt: string | null
    lastUsedAt: string | null
    rateUsage: { used: number; limit: number } | null
    scopes: string[]
    isTikTok: boolean
    accountId?: number
    connection?: ServiceConnection
  }

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = []

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

    ;(Object.entries(SERVICE_CONNECTION_FIELDS) as Array<[ServiceProvider, ServiceProviderFieldConfig]>).forEach(([providerKey, providerConfig]) => {
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
      if (!q) return true
      return (
        row.title.toLowerCase().includes(q) ||
        row.detail.toLowerCase().includes(q) ||
        row.providerKey.toLowerCase().includes(q)
      )
    })
  }, [rows, search, statusFilter])

  /* ------------------------------------------------------------------ */
  /* Stats                                                               */
  /* ------------------------------------------------------------------ */
  const stats = useMemo(() => {
    const total = rows.length
    const healthy = rows.filter((r) => r.status === 'healthy').length
    const warning = rows.filter((r) => r.status === 'warning').length
    const off = rows.filter((r) => r.status === 'off').length
    return { total, healthy, warning, off }
  }, [rows])

  /* ------------------------------------------------------------------ */
  /* Available providers for "Connect" menu                              */
  /* ------------------------------------------------------------------ */
  const availableProviders = useMemo(() => {
    const list: { key: string; title: string; kind: 'OAuth' | 'API key' }[] = []
    if (tiktokAccounts.length === 0) {
      list.push({ key: 'TIKTOK', title: 'TikTok', kind: 'OAuth' })
    }
    ;(Object.entries(SERVICE_CONNECTION_FIELDS) as Array<[ServiceProvider, ServiceProviderFieldConfig]>).forEach(([providerKey, providerConfig]) => {
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
    ? serviceForms[openModalProviderKey] || createEmptyServiceForm(null, openModalProviderKey)
    : null
  const isEditingExistingProfile = Boolean(activeForm?.connectionId)
  const _activeProviderKind: 'OAuth' | 'API key' = 'API key'

  /* ====================================================================
     Render
     ================================================================== */
  return (
    <div className="admin-page video-ops-page accounts-page-v2">
      <AdminShell
        activeNavId="accounts"
        feedbackItems={[
          { type: 'error', message: accountsError?.message || errorMessage || null },
          ...feedbackItems.filter((item) => item.type === 'success'),
        ]}
      >
        <div className="video-ops-shell">
          {/* ------------------------------------------------------- */}
          {/* Heading                                                  */}
          {/* ------------------------------------------------------- */}
          <header className="journey-page-head">
            <div className="journey-page-head-copy">
              <h1>Tous tes comptes et services en un seul endroit</h1>
              <p>Connecte, surveille et fais tourner TikTok et tes services automatises depuis une seule console.</p>
            </div>
            <div className="journey-page-head-actions">
              <div className="accounts-connect-menu">
                <button
                  type="button"
                  className="journey-btn is-primary"
                  onClick={() => setConnectMenuOpen((v) => !v)}
                  disabled={isConnectingTikTok}
                >
                  + Connecter un service
                </button>
                {connectMenuOpen ? (
                  <div className="accounts-connect-menu-popover" role="menu">
                    {availableProviders.map((p) => (
                      <button
                        key={p.key}
                        type="button"
                        className="accounts-connect-menu-item"
                        onClick={() => {
                          setConnectMenuOpen(false)
                          if (p.key === 'TIKTOK') {
                            void handleConnectTikTok()
                          } else {
                            startNewServiceProfile(p.key as ServiceProvider)
                          }
                        }}
                      >
                        <ProviderGlyph providerKey={p.key} />
                        <span className="accounts-connect-menu-item-text">
                          <strong>{p.title}</strong>
                          <small>{p.kind}</small>
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </header>

          {/* ------------------------------------------------------- */}
          {/* Stat tiles                                               */}
          {/* ------------------------------------------------------- */}
          <section className="journey-stats" aria-label="Statistiques comptes">
            <StatTile label="Total" value={stats.total} delta="Tous services confondus" />
            <StatTile
              label="Healthy"
              value={stats.healthy}
              delta={stats.healthy === stats.total ? 'All good' : 'Operationnels'}
              trend="up"
            />
            <StatTile
              label="Warning"
              value={stats.warning}
              delta={stats.warning > 0 ? 'A verifier' : 'Aucun'}
              trend={stats.warning > 0 ? 'warn' : null}
            />
            <StatTile
              label="Off"
              value={stats.off}
              delta={stats.off > 0 ? 'Action requise' : 'Aucun'}
              trend={stats.off > 0 ? 'warn' : null}
            />
          </section>

          {/* ------------------------------------------------------- */}
          {/* Toolbar                                                  */}
          {/* ------------------------------------------------------- */}
          <section className="accounts-toolbar">
            <div className="accounts-toolbar-search">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un service ou un compte…"
              />
            </div>
            <div className="accounts-toolbar-filters">
              {(['all', 'healthy', 'warning', 'off'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  className={`accounts-filter-chip ${statusFilter === f ? 'is-active' : ''}`}
                  onClick={() => setStatusFilter(f)}
                >
                  {f === 'all' ? 'Tous' : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
            <div className="accounts-toolbar-view">
              <button
                type="button"
                className={`accounts-view-toggle ${viewMode === 'cards' ? 'is-active' : ''}`}
                onClick={() => setViewMode('cards')}
                aria-label="Vue cartes"
              >
                Cards
              </button>
              <button
                type="button"
                className={`accounts-view-toggle ${viewMode === 'table' ? 'is-active' : ''}`}
                onClick={() => setViewMode('table')}
                aria-label="Vue tableau"
              >
                Table
              </button>
            </div>
          </section>

          {/* ------------------------------------------------------- */}
          {/* Cards view                                               */}
          {/* ------------------------------------------------------- */}
          {viewMode === 'cards' ? (
            <section className="accounts-cards-grid">
              {filteredRows.length === 0 ? (
                <div className="accounts-empty">Aucun compte ne correspond aux filtres.</div>
              ) : (
                filteredRows.map((row) => {
                  const expiry = formatExpiry(row.expiresAt)
                  return (
                    <article key={row.key} className="accounts-card">
                      <header className="accounts-card-head">
                        <ProviderGlyph providerKey={row.providerKey} />
                        <div className="accounts-card-head-text">
                          <strong>{row.title}</strong>
                          <span>{row.detail}</span>
                        </div>
                        <StatusPill status={row.status} />
                      </header>

                      <dl className="accounts-card-meta">
                        <div>
                          <dt>Type</dt>
                          <dd>{row.kind}</dd>
                        </div>
                        <div>
                          <dt>Expiration</dt>
                          <dd className={`accounts-tone-${expiry.tone}`}>{expiry.label}</dd>
                        </div>
                        <div>
                          <dt>Dernière utilisation</dt>
                          <dd>{formatRelative(row.lastUsedAt)}</dd>
                        </div>
                      </dl>

                      {row.scopes.length ? (
                        <div className="accounts-card-scopes">
                          {row.scopes.slice(0, 4).map((s) => (
                            <span key={s} className="accounts-scope-chip">
                              {s}
                            </span>
                          ))}
                          {row.scopes.length > 4 ? (
                            <span className="accounts-scope-chip accounts-scope-chip-more">
                              +{row.scopes.length - 4}
                            </span>
                          ) : null}
                        </div>
                      ) : null}

                      {row.rateUsage ? (
                        <div className="accounts-rate">
                          <div className="accounts-rate-label">
                            <span>Quota</span>
                            <span>
                              {row.rateUsage.used.toLocaleString()} / {row.rateUsage.limit.toLocaleString()}
                            </span>
                          </div>
                          <div className="accounts-rate-bar">
                            <div
                              className="accounts-rate-bar-fill"
                              style={{
                                width: `${Math.min(100, Math.round((row.rateUsage.used / row.rateUsage.limit) * 100))}%`,
                              }}
                            />
                          </div>
                        </div>
                      ) : null}

                      <footer className="accounts-card-actions">
                        {row.isTikTok ? (
                          <button
                            type="button"
                            className="video-action-btn ghost danger"
                            onClick={() => row.accountId && void handleDisconnectTikTok(row.accountId)}
                            disabled={hasPendingAction(`TIKTOK-${row.accountId}`, 'disconnecting')}
                          >
                            {hasPendingAction(`TIKTOK-${row.accountId}`, 'disconnecting')
                              ? 'Déconnexion…'
                              : 'Déconnecter'}
                          </button>
                        ) : row.connection ? (
                          <>
                            <button
                              type="button"
                              className="video-action-btn ghost"
                              onClick={() =>
                                void handleValidateService(
                                  row.providerKey as ServiceProvider,
                                  row.connection!.id,
                                )
                              }
                              disabled={
                                hasPendingAction(`${row.providerKey}-${row.connection.id}`, 'validating')
                              }
                            >
                              {hasPendingAction(`${row.providerKey}-${row.connection.id}`, 'validating')
                                ? 'Vérification…'
                                : 'Vérifier'}
                            </button>
                            <button
                              type="button"
                              className="video-action-btn ghost"
                              onClick={() =>
                                loadServiceProfile(
                                  row.providerKey as ServiceProvider,
                                  row.connection!,
                                )
                              }
                            >
                              Éditer
                            </button>
                          </>
                        ) : null}
                      </footer>
                    </article>
                  )
                })
              )}
            </section>
          ) : (
            /* ------------------------------------------------------- */
            /* Table view                                               */
            /* ------------------------------------------------------- */
            <section className="accounts-table-wrap">
              <table className="accounts-table">
                <thead>
                  <tr>
                    <th>Service</th>
                    <th>Statut</th>
                    <th>Type</th>
                    <th>Expiration</th>
                    <th>Dernière utilisation</th>
                    <th>Quota</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="accounts-empty">
                        Aucun compte ne correspond aux filtres.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row) => {
                      const expiry = formatExpiry(row.expiresAt)
                      return (
                        <tr key={row.key}>
                          <td>
                            <div className="accounts-table-service">
                              <ProviderGlyph providerKey={row.providerKey} />
                              <div>
                                <strong>{row.title}</strong>
                                <span>{row.detail}</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <StatusPill status={row.status} />
                          </td>
                          <td>{row.kind}</td>
                          <td className={`accounts-tone-${expiry.tone}`}>{expiry.label}</td>
                          <td>{formatRelative(row.lastUsedAt)}</td>
                          <td>
                            {row.rateUsage ? (
                              <div className="accounts-rate accounts-rate-inline">
                                <div className="accounts-rate-bar">
                                  <div
                                    className="accounts-rate-bar-fill"
                                    style={{
                                      width: `${Math.min(
                                        100,
                                        Math.round((row.rateUsage.used / row.rateUsage.limit) * 100),
                                      )}%`,
                                    }}
                                  />
                                </div>
                                <span>
                                  {Math.round((row.rateUsage.used / row.rateUsage.limit) * 100)}%
                                </span>
                              </div>
                            ) : (
                              <span className="accounts-muted">—</span>
                            )}
                          </td>
                          <td className="accounts-table-actions">
                            {row.isTikTok ? (
                              <button
                                type="button"
                                className="video-action-btn ghost danger"
                                onClick={() => row.accountId && void handleDisconnectTikTok(row.accountId)}
                                disabled={hasPendingAction(`TIKTOK-${row.accountId}`, 'disconnecting')}
                              >
                                Déconnecter
                              </button>
                            ) : row.connection ? (
                              <button
                                type="button"
                                className="video-action-btn ghost"
                                onClick={() =>
                                  loadServiceProfile(
                                    row.providerKey as ServiceProvider,
                                    row.connection!,
                                  )
                                }
                              >
                                Éditer
                              </button>
                            ) : null}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </section>
          )}
        </div>

        {/* ====================================================================
            Stepper modal — wraps the existing form
            ================================================================== */}
        {openModalProviderKey && activeProviderConfig && activeForm ? (
          <div
            className="accounts-modal-overlay"
            onClick={() => closeModal(openModalProviderKey)}
          >
            <div
              ref={modalRef}
              className="accounts-modal accounts-stepper-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="accounts-modal-title"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="accounts-modal-header">
                <h3 id="accounts-modal-title">
                  {isEditingExistingProfile ? 'Éditer' : 'Connecter'} {activeProviderConfig.title}
                </h3>
                <button
                  type="button"
                  className="accounts-modal-close"
                  onClick={() => closeModal(openModalProviderKey)}
                  aria-label="Fermer"
                >
                  ×
                </button>
              </div>

              {/* Stepper progress */}
              {!isEditingExistingProfile ? (
                <div className="accounts-stepper-track">
                  {['Authentification', 'Scopes', 'Terminé'].map((label, idx) => {
                    const stepNum = idx + 1
                    const reached = stepperStep >= stepNum
                    const active = stepperStep === stepNum
                    return (
                      <div
                        key={label}
                        className={`accounts-stepper-step ${reached ? 'is-reached' : ''} ${active ? 'is-active' : ''}`}
                      >
                        <span className="accounts-stepper-dot">{stepNum}</span>
                        <span className="accounts-stepper-label">{label}</span>
                      </div>
                    )
                  })}
                </div>
              ) : null}

              <div className="accounts-modal-body">
                {/* ---- Step 1: Auth (or full edit form if editing) ---- */}
                {(stepperStep === 1 || isEditingExistingProfile) && (
                  <div className="accounts-service-form-grid">
                    <label className="tiktok-step-field">
                      <span>Nom</span>
                      <input
                        type="text"
                        value={activeForm.displayName}
                        onChange={(e) =>
                          updateServiceForm(openModalProviderKey, 'displayName', e.target.value)
                        }
                        placeholder={`${activeProviderConfig.title} production`}
                      />
                    </label>
                    <label className="tiktok-step-field">
                      <span>{activeProviderConfig.baseUrlLabel}</span>
                      <input
                        type="text"
                        value={activeForm.baseUrl}
                        onChange={(e) =>
                          updateServiceForm(openModalProviderKey, 'baseUrl', e.target.value)
                        }
                        placeholder={activeProviderConfig.defaultBaseUrl}
                      />
                    </label>
                    <label className="tiktok-step-field">
                      <span>{activeProviderConfig.identifierLabel}</span>
                      <input
                        type="text"
                        value={activeForm.accountIdentifier}
                        onChange={(e) =>
                          updateServiceForm(openModalProviderKey, 'accountIdentifier', e.target.value)
                        }
                        placeholder="Owner / workspace / email"
                      />
                    </label>
                    <label className="tiktok-step-field">
                      <span>{activeProviderConfig.secretLabel}</span>
                      <input
                        type="password"
                        value={activeForm.secretValue}
                        onChange={(e) =>
                          updateServiceForm(openModalProviderKey, 'secretValue', e.target.value)
                        }
                        placeholder="Coller le secret ici"
                      />
                    </label>
                    <label className="tiktok-step-field accounts-service-form-wide">
                      <span>Metadata JSON</span>
                      <textarea
                        rows={6}
                        value={activeForm.metadataJson}
                        onChange={(e) =>
                          updateServiceForm(openModalProviderKey, 'metadataJson', e.target.value)
                        }
                        placeholder={activeProviderConfig.metadataPlaceholder}
                      />
                    </label>
                  </div>
                )}

                {/* ---- Step 2: Scopes preview ---- */}
                {stepperStep === 2 && !isEditingExistingProfile && (
                  <div className="accounts-stepper-scopes">
                    <p className="accounts-stepper-blurb">
                      Vérifie les scopes détectés depuis ton fichier metadata avant validation.
                    </p>
                    <div className="accounts-card-scopes">
                      {parseScopes(activeForm.metadataJson).length === 0 ? (
                        <span className="accounts-muted">
                          Aucun scope détecté — la connexion utilisera les permissions par défaut.
                        </span>
                      ) : (
                        parseScopes(activeForm.metadataJson).map((s) => (
                          <span key={s} className="accounts-scope-chip">
                            {s}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* ---- Step 3: Done ---- */}
                {stepperStep === 3 && !isEditingExistingProfile && (
                  <div className="accounts-stepper-done">
                    <div className="accounts-stepper-done-check">✓</div>
                    <h4>{activeProviderConfig.title} connecté</h4>
                    <p>Le profil a été enregistré et activé. Tu peux le retrouver dans la grille.</p>
                  </div>
                )}

                {/* ---- Danger zone (editing only) ---- */}
                {isEditingExistingProfile && activeForm.connectionId ? (
                  <div className="accounts-danger-zone">
                    <h4>Zone dangereuse</h4>
                    <p>
                      Pour déconnecter, tape exactement{' '}
                      <code>{activeProviderConfig.title}</code> ci-dessous.
                    </p>
                    <div className="accounts-danger-row">
                      <input
                        type="text"
                        value={confirmName}
                        onChange={(e) => setConfirmName(e.target.value)}
                        placeholder={activeProviderConfig.title}
                      />
                      <button
                        type="button"
                        className="video-action-btn danger"
                        onClick={() => {
                          if (confirmName === activeProviderConfig.title && activeForm.connectionId) {
                            void handleDeleteService(
                              openModalProviderKey,
                              activeForm.connectionId,
                            )
                            closeModal(openModalProviderKey)
                          }
                        }}
                        disabled={confirmName !== activeProviderConfig.title}
                      >
                        Déconnecter définitivement
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="accounts-modal-footer">
                {/* Editing flow */}
                {isEditingExistingProfile ? (
                  <>
                    <button
                      type="button"
                      className="video-action-btn ghost"
                      onClick={() => closeModal(openModalProviderKey)}
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      className="video-action-btn primary"
                      onClick={() => void handleSaveService(openModalProviderKey)}
                      disabled={hasPendingAction(openModalProviderKey, 'saving')}
                    >
                      {hasPendingAction(openModalProviderKey, 'saving')
                        ? 'Enregistrement…'
                        : 'Mettre à jour'}
                    </button>
                  </>
                ) : (
                  /* Stepper flow */
                  <>
                    {stepperStep > 1 && stepperStep < 3 ? (
                      <button
                        type="button"
                        className="video-action-btn ghost"
                        onClick={() => setStepperStep((s) => Math.max(1, s - 1))}
                      >
                        Retour
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="video-action-btn ghost"
                        onClick={() => closeModal(openModalProviderKey)}
                      >
                        {stepperStep === 3 ? 'Fermer' : 'Annuler'}
                      </button>
                    )}

                    {stepperStep === 1 ? (
                      <button
                        type="button"
                        className="video-action-btn primary"
                        onClick={() => setStepperStep(2)}
                      >
                        Suivant
                      </button>
                    ) : null}
                    {stepperStep === 2 ? (
                      <button
                        type="button"
                        className="video-action-btn primary"
                        onClick={() => void handleSaveService(openModalProviderKey)}
                        disabled={hasPendingAction(openModalProviderKey, 'saving')}
                      >
                        {hasPendingAction(openModalProviderKey, 'saving')
                          ? 'Connexion…'
                          : 'Enregistrer & valider'}
                      </button>
                    ) : null}
                    {stepperStep === 3 ? (
                      <button
                        type="button"
                        className="video-action-btn primary"
                        onClick={() => closeModal(openModalProviderKey)}
                      >
                        Terminé
                      </button>
                    ) : null}
                  </>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </AdminShell>
    </div>
  )
}
