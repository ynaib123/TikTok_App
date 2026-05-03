// @ts-nocheck
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'

import AdminShell from '../components/AdminShell'
import {
  useAccountsFeedback,
  useAccountsForm,
  useServiceConnections,
  useTikTokAccounts,
} from '../hooks'
import {
  SERVICE_CONNECTION_FIELDS,
  createEmptyServiceForm,
} from '../types/services'
import type { ServiceConnection, ServiceProvider } from '../types'

function formatValidationStatus(connection: ServiceConnection | null) {
  if (!connection) return 'unknown'
  return String(connection.validationStatus || 'unknown').toLowerCase()
}

function formatStatusLabel(value: string | null | undefined) {
  return String(value || 'unknown').replaceAll('_', ' ').toLowerCase()
}

export default function TikTokAccountsPage() {
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [isConnectingTikTok, setIsConnectingTikTok] = useState(false)
  const [savingProviderKey, setSavingProviderKey] = useState('')
  const [disconnectingProviderKey, setDisconnectingProviderKey] = useState('')
  const [activatingConnectionKey, setActivatingConnectionKey] = useState('')
  const [validatingConnectionKey, setValidatingConnectionKey] = useState('')
  const initialFeedbackMessage = useMemo(
    () => (
      searchParams.get('tiktokSuccess') === '1'
        ? 'Compte TikTok connecte avec succes.'
        : location.state?.tiktokOAuthSuccess || location.state?.accountsWarning || null
    ),
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
    activate,
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

      Object.keys(SERVICE_CONNECTION_FIELDS).forEach((providerKey) => {
        const activeConnection = activeConnectionsByProvider[providerKey] || null
        const currentForm = current[providerKey]
        const providerConnections = connectionsByProvider[providerKey] || []
        const shouldKeepEditingCurrentProfile = currentForm?.connectionId
          && providerConnections.some((connection) => connection.id === currentForm.connectionId)
        const sourceConnection = shouldKeepEditingCurrentProfile
          ? providerConnections.find((connection) => connection.id === currentForm.connectionId) || activeConnection
          : activeConnection
        const nextForm = {
          ...createEmptyServiceForm(sourceConnection),
          secretValue: currentForm?.secretValue || '',
          metadataJson: currentForm?.metadataJson || sourceConnection?.metadataJson || '',
        }

        const isSameForm = currentForm
          && currentForm.connectionId === nextForm.connectionId
          && currentForm.displayName === nextForm.displayName
          && currentForm.baseUrl === nextForm.baseUrl
          && currentForm.accountIdentifier === nextForm.accountIdentifier
          && currentForm.secretValue === nextForm.secretValue
          && currentForm.metadataJson === nextForm.metadataJson

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

  const handleConnectTikTok = async () => {
    setIsConnectingTikTok(true)
    setSuccessMessage(null)
    setErrorMessage(null)

    try {
      const response = await connect('/accounts')
      window.location.assign(response.authUrl)
    } catch (requestError) {
      showError(requestError?.message || 'Impossible de lancer la connexion TikTok.')
      setIsConnectingTikTok(false)
    }
  }

  const handleSaveService = async (providerKey: ServiceProvider) => {
    setSavingProviderKey(providerKey)
    setSuccessMessage(null)
    setErrorMessage(null)

    try {
      await save(providerKey, serviceForms[providerKey] || createEmptyServiceForm(null, providerKey))
      resetProviderForm(providerKey)
      startNewServiceProfile(providerKey)
      showSuccess(`${SERVICE_CONNECTION_FIELDS[providerKey].title} valide et active.`)
    } catch (requestError) {
      showError(requestError?.message || `Impossible d enregistrer ${providerKey}.`)
    } finally {
      setSavingProviderKey('')
    }
  }

  const handleActivateService = async (providerKey: ServiceProvider, connectionId: number) => {
    const connectionKey = `${providerKey}-${connectionId}`
    setActivatingConnectionKey(connectionKey)
    setSuccessMessage(null)
    setErrorMessage(null)

    try {
      await activate(providerKey, connectionId)
      showSuccess(`${SERVICE_CONNECTION_FIELDS[providerKey].title} active.`)
    } catch (requestError) {
      showError(requestError?.message || `Impossible d activer ${providerKey}.`)
    } finally {
      setActivatingConnectionKey('')
    }
  }

  const handleValidateService = async (providerKey: ServiceProvider, connectionId: number) => {
    const connectionKey = `${providerKey}-${connectionId}`
    setValidatingConnectionKey(connectionKey)
    setSuccessMessage(null)
    setErrorMessage(null)

    try {
      await validate(providerKey, connectionId)
      showSuccess(`${SERVICE_CONNECTION_FIELDS[providerKey].title} revalide.`)
    } catch (requestError) {
      showError(requestError?.message || `Impossible de valider ${providerKey}.`)
    } finally {
      setValidatingConnectionKey('')
    }
  }

  const handleDeleteService = async (providerKey: ServiceProvider, connectionId: number) => {
    const connectionKey = `${providerKey}-${connectionId}`
    setDisconnectingProviderKey(connectionKey)
    setSuccessMessage(null)
    setErrorMessage(null)

    try {
      await remove(providerKey, connectionId)
      if (serviceForms[providerKey]?.connectionId === connectionId) {
        startNewServiceProfile(providerKey)
      }
      showSuccess(`${SERVICE_CONNECTION_FIELDS[providerKey].title} supprime.`)
    } catch (requestError) {
      showError(requestError?.message || `Impossible de supprimer ${providerKey}.`)
    } finally {
      setDisconnectingProviderKey('')
    }
  }

  const handleDisconnectTikTok = async (accountId: number) => {
    const accountKey = `TIKTOK-${accountId}`
    setDisconnectingProviderKey(accountKey)
    setSuccessMessage(null)
    setErrorMessage(null)

    try {
      await disconnect(accountId)
      showSuccess('Compte TikTok deconnecte.')
    } catch (requestError) {
      showError(requestError?.message || 'Impossible de deconnecter le compte TikTok.')
    } finally {
      setDisconnectingProviderKey('')
    }
  }

  return (
    <div className="admin-page video-ops-page">
      <AdminShell
        activeNavId="accounts"
        feedbackItems={[
          { type: 'error', message: accountsError?.message || errorMessage || null },
          ...feedbackItems.filter((item) => item.type === 'success'),
        ]}
      >
        <div className="video-ops-shell">
          <section className="video-page-heading">
            <div>
              <p className="video-ops-kicker">Accounts</p>
              <h1>Gere tous tes comptes et services en un seul endroit</h1>
            </div>
          </section>

          <section className="accounts-services-grid">
            {tiktokAccounts.length > 0 ? (
              tiktokAccounts.map((account) => (
                <div key={`tiktok-${account.id}`} className="accounts-service-grid-item">
                  <div className="accounts-service-row is-active">
                    <div className="accounts-service-row-info">
                      <div className="accounts-service-row-head">
                        <strong>TikTok</strong>
                        <span className="accounts-service-row-status">{account.nickname}</span>
                      </div>
                      <div className="accounts-service-row-meta">
                        <span className="video-pill success">Connecte</span>
                      </div>
                    </div>
                    <div className="accounts-service-row-actions">
                      <button
                        type="button"
                        className="video-action-btn ghost danger"
                        onClick={() => void handleDisconnectTikTok(account.id)}
                        disabled={disconnectingProviderKey === `TIKTOK-${account.id}`}
                      >
                        {disconnectingProviderKey === `TIKTOK-${account.id}` ? 'Deconnexion...' : 'Deconnecter'}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="accounts-service-grid-item">
                <button
                  type="button"
                  className="accounts-service-connect-btn"
                  onClick={() => void handleConnectTikTok()}
                  disabled={isConnectingTikTok}
                >
                  <div className="accounts-service-connect-icon">TikTok</div>
                  <div className="accounts-service-connect-text">
                    <strong>Connecter TikTok</strong>
                    <span>Connexion OAuth pour la publication</span>
                  </div>
                </button>
              </div>
            )}

            {Object.entries(SERVICE_CONNECTION_FIELDS).map(([providerKey, providerConfig]) => {
              const connections = connectionsByProvider[providerKey] || []
              const connection = activeConnectionsByProvider[providerKey] || null

              return (
                <div key={providerKey} className="accounts-service-grid-item">
                  {connection?.active ? (
                    <div className="accounts-service-row is-active">
                      <div className="accounts-service-row-info">
                        <div className="accounts-service-row-head">
                          <strong>{providerConfig.title}</strong>
                          <span className="accounts-service-row-status">
                            {connection.displayName || connection.accountIdentifier || 'Connecte'}
                          </span>
                        </div>
                        <div className="accounts-service-row-meta">
                          <span className={`video-pill ${connection.active ? 'success' : ''}`}>
                            {formatStatusLabel(connection.status || 'DISCONNECTED')}
                          </span>
                          <span className={`accounts-validation-pill is-${formatValidationStatus(connection)}`}>
                            {formatStatusLabel(connection.validationStatus || 'UNKNOWN')}
                          </span>
                        </div>
                      </div>
                      <div className="accounts-service-row-actions">
                        <button
                          type="button"
                          className="video-action-btn ghost"
                          onClick={() => loadServiceProfile(providerKey, connection)}
                        >
                          Editer
                        </button>
                        <button
                          type="button"
                          className="video-action-btn ghost"
                          onClick={() => void handleValidateService(providerKey, connection.id)}
                          disabled={validatingConnectionKey === `${providerKey}-${connection.id}`}
                        >
                          {validatingConnectionKey === `${providerKey}-${connection.id}` ? 'Validation...' : 'Verifier'}
                        </button>
                        {!connection.active ? (
                          <button
                            type="button"
                            className="video-action-btn ghost"
                            onClick={() => void handleActivateService(providerKey, connection.id)}
                            disabled={activatingConnectionKey === `${providerKey}-${connection.id}`}
                          >
                            {activatingConnectionKey === `${providerKey}-${connection.id}` ? 'Activation...' : 'Activer'}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="video-action-btn ghost danger"
                          onClick={() => void handleDeleteService(providerKey, connection.id)}
                          disabled={disconnectingProviderKey === `${providerKey}-${connection.id}`}
                        >
                          {disconnectingProviderKey === `${providerKey}-${connection.id}` ? 'Suppression...' : 'Deconnecter'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="accounts-service-connect-btn"
                      onClick={() => startNewServiceProfile(providerKey)}
                    >
                      <div className="accounts-service-connect-icon">{providerConfig.title}</div>
                      <div className="accounts-service-connect-text">
                        <strong>Connecter {providerConfig.title}</strong>
                        <span>{connections.length} profil{connections.length > 1 ? 's' : ''} sauvegarde{connections.length > 1 ? 's' : ''}</span>
                      </div>
                    </button>
                  )}
                </div>
              )
            })}
          </section>

          {Object.entries(SERVICE_CONNECTION_FIELDS).map(([providerKey, providerConfig]) => {
            const form = serviceForms[providerKey] || createEmptyServiceForm(null, providerKey)
            const isSaving = savingProviderKey === providerKey
            const isEditingExistingProfile = Boolean(form.connectionId)
            const isModalOpen = openModalProviderKey === providerKey

            return isModalOpen ? (
              <div key={`modal-${providerKey}`} className="accounts-modal-overlay" onClick={() => closeModal(providerKey)}>
                <div className="accounts-modal" onClick={(event) => event.stopPropagation()}>
                  <div className="accounts-modal-header">
                    <h3>{isEditingExistingProfile ? 'Editer' : 'Connecter'} {providerConfig.title}</h3>
                    <button
                      type="button"
                      className="accounts-modal-close"
                      onClick={() => closeModal(providerKey)}
                      aria-label="Fermer"
                    >
                      x
                    </button>
                  </div>
                  <div className="accounts-modal-body">
                    <div className="accounts-service-form-grid">
                      <label className="tiktok-step-field">
                        <span>Nom</span>
                        <input
                          type="text"
                          value={form.displayName}
                          onChange={(event) => updateServiceForm(providerKey, 'displayName', event.target.value)}
                          placeholder={`${providerConfig.title} production`}
                        />
                      </label>
                      <label className="tiktok-step-field">
                        <span>{providerConfig.baseUrlLabel}</span>
                        <input
                          type="text"
                          value={form.baseUrl}
                          onChange={(event) => updateServiceForm(providerKey, 'baseUrl', event.target.value)}
                          placeholder={providerConfig.defaultBaseUrl}
                        />
                        {providerKey === 'N8N' ? (
                          <small className="accounts-field-help">
                            Cette URL devient la source de verite pour les workflows backend. Si toute la stack tourne dans Docker, utilise <code>http://n8n:5678</code>.
                          </small>
                        ) : null}
                      </label>
                      <label className="tiktok-step-field">
                        <span>{providerConfig.identifierLabel}</span>
                        <input
                          type="text"
                          value={form.accountIdentifier}
                          onChange={(event) => updateServiceForm(providerKey, 'accountIdentifier', event.target.value)}
                          placeholder="Owner / workspace / email"
                        />
                      </label>
                      <label className="tiktok-step-field">
                        <span>{providerConfig.secretLabel}</span>
                        <input
                          type="password"
                          value={form.secretValue}
                          onChange={(event) => updateServiceForm(providerKey, 'secretValue', event.target.value)}
                          placeholder={providerKey === 'N8N'
                            ? 'Laisse vide sauf si tu veux garder une note secrete'
                            : 'Coller le secret ici'}
                        />
                      </label>
                      <label className="tiktok-step-field accounts-service-form-wide">
                        <span>Metadata JSON</span>
                        <textarea
                          rows="6"
                          value={form.metadataJson}
                          onChange={(event) => updateServiceForm(providerKey, 'metadataJson', event.target.value)}
                          placeholder={providerConfig.metadataPlaceholder}
                        />
                        {providerKey === 'N8N' ? (
                          <small className="accounts-field-help">
                            Optionnel. Utilise <code>workflowPaths</code> seulement si tes webhooks n8n n utilisent pas les chemins par defaut.
                          </small>
                        ) : null}
                      </label>
                    </div>
                  </div>
                  <div className="accounts-modal-footer">
                    <button type="button" className="video-action-btn ghost" onClick={() => closeModal(providerKey)}>
                      Annuler
                    </button>
                    <button
                      type="button"
                      className="video-action-btn"
                      onClick={() => void handleSaveService(providerKey)}
                      disabled={isSaving}
                    >
                      {isSaving ? 'Connexion...' : isEditingExistingProfile ? 'Mettre a jour' : 'Enregistrer'}
                    </button>
                  </div>
                </div>
              </div>
            ) : null
          })}
        </div>
      </AdminShell>
    </div>
  )
}
