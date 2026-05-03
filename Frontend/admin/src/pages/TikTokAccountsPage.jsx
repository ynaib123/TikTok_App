import { useEffect, useMemo, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import AdminShell from '../components/AdminShell'
import {
  activateServiceConnection,
  deleteServiceConnection,
  disconnectTikTokAccount,
  fetchAccountsOverview,
  saveServiceConnection,
  validateServiceConnection,
} from '../services/videoOpsSupabase'
import { createTikTokAuthorizationUrl } from '../services/tiktokOAuthApi'

const EMPTY_LIST = []
const DEFAULT_READINESS = { ready: false, missingItems: [] }

const SERVICE_CONNECTION_FIELDS = {
  N8N: {
    title: 'n8n',
    baseUrlLabel: 'Instance URL',
    identifierLabel: 'Workspace / owner',
    secretLabel: 'Secret optionnel',
    defaultBaseUrl: 'http://n8n:5678',
    metadataPlaceholder: '{"workflowPaths":{"mainPipeline":"/webhook/creation-ideas","scriptGeneration":"/webhook/script-generation","checkShotstack":"/webhook/check-shotstack","renderTemplateVideo":"/webhook/render-template-video","initPublishTikTok":"/webhook/init-publish-tiktok"}}',
    sourceLabel: 'Profil actif en base',
  },
  GROQ: {
    title: 'Groq',
    baseUrlLabel: 'API base URL',
    identifierLabel: 'Workspace / email',
    secretLabel: 'API key',
    defaultBaseUrl: 'https://api.groq.com',
    metadataPlaceholder: '{"model":"llama-3.3-70b-versatile"}',
    sourceLabel: 'Profil actif en base',
  },
  SHOTSTACK: {
    title: 'Shotstack',
    baseUrlLabel: 'API base URL',
    identifierLabel: 'Environment / owner',
    secretLabel: 'API key',
    defaultBaseUrl: 'https://api.shotstack.io/edit/v1',
    metadataPlaceholder: '{"environment":"production"}',
    sourceLabel: 'Profil actif en base',
  },
  PEXELS: {
    title: 'Pexels',
    baseUrlLabel: 'API base URL',
    identifierLabel: 'Workspace / email',
    secretLabel: 'API key',
    defaultBaseUrl: 'https://api.pexels.com',
    metadataPlaceholder: '{"orientation":"portrait"}',
    sourceLabel: 'Profil actif en base',
  },
}

function createEmptyServiceForm(connection, providerKey = null) {
  const defaultMetadata = providerKey ? SERVICE_CONNECTION_FIELDS[providerKey]?.metadataPlaceholder || '' : ''
  return {
    connectionId: connection?.id || null,
    displayName: connection?.displayName || '',
    baseUrl: connection?.baseUrl || '',
    accountIdentifier: connection?.accountIdentifier || '',
    secretValue: '',
    metadataJson: connection?.metadataJson || defaultMetadata,
  }
}

function formatValidationStatus(connection) {
  if (!connection) return 'unknown'
  return String(connection.validationStatus || 'unknown').toLowerCase()
}

function formatStatusLabel(value) {
  return String(value || 'unknown').replaceAll('_', ' ').toLowerCase()
}

function validateServiceForm(providerKey, form, connection) {
  const providerConfig = SERVICE_CONNECTION_FIELDS[providerKey]
  const normalizedBaseUrl = String(form?.baseUrl || '').trim()
  const normalizedMetadata = String(form?.metadataJson || '').trim()
  const normalizedSecret = String(form?.secretValue || '').trim()

  if (!normalizedBaseUrl) {
    throw new Error(`Renseigne ${providerConfig.baseUrlLabel.toLowerCase()} pour ${providerConfig.title}.`)
  }

  if (normalizedMetadata) {
    try {
      JSON.parse(normalizedMetadata)
    } catch {
      throw new Error(`Le champ Metadata JSON de ${providerConfig.title} doit contenir un JSON valide.`)
    }
  }

  if (providerKey !== 'N8N' && !normalizedSecret && !connection?.hasSecret) {
    throw new Error(`Renseigne ${providerConfig.secretLabel.toLowerCase()} pour ${providerConfig.title}.`)
  }
}

export default function TikTokAccountsPage() {
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const [isConnectingTikTok, setIsConnectingTikTok] = useState(false)
  const [savingProviderKey, setSavingProviderKey] = useState('')
  const [disconnectingProviderKey, setDisconnectingProviderKey] = useState('')
  const [activatingConnectionKey, setActivatingConnectionKey] = useState('')
  const [validatingConnectionKey, setValidatingConnectionKey] = useState('')
  const [openModalProviderKey, setOpenModalProviderKey] = useState(null)
  const [feedbackMessage, setFeedbackMessage] = useState(
    searchParams.get('tiktokSuccess') === '1'
      ? 'Compte TikTok connecte avec succes.'
      : location.state?.tiktokOAuthSuccess || location.state?.accountsWarning || null,
  )
  const [errorMessage, setErrorMessage] = useState(null)
  const {
    data: overview = null,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['accounts-overview'],
    queryFn: fetchAccountsOverview,
  })

  const tiktokAccounts = overview?.tiktokAccounts ?? EMPTY_LIST
  const serviceConnections = overview?.serviceConnections ?? EMPTY_LIST
  const readiness = overview?.readiness ?? DEFAULT_READINESS

  const serviceConnectionsByProvider = useMemo(
    () => Object.entries(SERVICE_CONNECTION_FIELDS).reduce((accumulator, [providerKey]) => {
      accumulator[providerKey] = serviceConnections.filter(
        (connection) => String(connection.providerKey || '').toUpperCase() === providerKey,
      )
      return accumulator
    }, {}),
    [serviceConnections],
  )

  const activeConnectionsByProvider = useMemo(
    () => Object.fromEntries(
      Object.entries(serviceConnectionsByProvider).map(([providerKey, connections]) => [
        providerKey,
        connections.find((connection) => connection.active) || null,
      ]),
    ),
    [serviceConnectionsByProvider],
  )

  const [serviceForms, setServiceForms] = useState(() => Object.fromEntries(
    Object.keys(SERVICE_CONNECTION_FIELDS).map((providerKey) => [providerKey, createEmptyServiceForm(null, providerKey)]),
  ))

  useEffect(() => {
    setServiceForms((current) => {
      const next = { ...current }
      let hasChanges = false

      Object.keys(SERVICE_CONNECTION_FIELDS).forEach((providerKey) => {
        const activeConnection = activeConnectionsByProvider[providerKey] || null
        const currentForm = current[providerKey]
        const shouldKeepEditingCurrentProfile = currentForm?.connectionId
          && serviceConnectionsByProvider[providerKey]?.some((connection) => connection.id === currentForm.connectionId)
        const sourceConnection = shouldKeepEditingCurrentProfile
          ? serviceConnectionsByProvider[providerKey].find((connection) => connection.id === currentForm.connectionId) || activeConnection
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
  }, [activeConnectionsByProvider, serviceConnectionsByProvider])

  useEffect(() => {
    if (location.state?.tiktokOAuthSuccess || location.state?.accountsWarning) {
      window.history.replaceState({}, document.title)
    }
    if (searchParams.get('tiktokSuccess') === '1') {
      setSearchParams({}, { replace: true })
    }
  }, [location.state, searchParams, setSearchParams])

  const refreshAccounts = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['accounts-overview'] }),
      queryClient.invalidateQueries({ queryKey: ['accounts-readiness'] }),
      queryClient.invalidateQueries({ queryKey: ['tiktok-accounts'] }),
      queryClient.invalidateQueries({ queryKey: ['content-ideas'] }),
    ])
  }

  const updateServiceForm = (providerKey, fieldName, value) => {
    setServiceForms((current) => ({
      ...current,
      [providerKey]: {
        ...(current[providerKey] || createEmptyServiceForm(null)),
        [fieldName]: value,
      },
    }))
  }

  const loadServiceProfile = (providerKey, connection) => {
    setServiceForms((current) => ({
      ...current,
      [providerKey]: createEmptyServiceForm(connection),
    }))
    setOpenModalProviderKey(providerKey)
  }

  const startNewServiceProfile = (providerKey) => {
    setServiceForms((current) => ({
      ...current,
      [providerKey]: createEmptyServiceForm(null, providerKey),
    }))
    setOpenModalProviderKey(providerKey)
  }

  const closeModal = (providerKey) => {
    setOpenModalProviderKey(null)
    setServiceForms((current) => ({
      ...current,
      [providerKey]: createEmptyServiceForm(null, providerKey),
    }))
  }

  const handleConnectTikTok = async () => {
    setIsConnectingTikTok(true)
    setFeedbackMessage(null)
    setErrorMessage(null)
    try {
      const response = await createTikTokAuthorizationUrl('/accounts')
      window.location.assign(response.authUrl)
    } catch (requestError) {
      setErrorMessage(requestError?.message || 'Impossible de lancer la connexion TikTok.')
      setIsConnectingTikTok(false)
    }
  }

  const handleSaveService = async (providerKey) => {
    setSavingProviderKey(providerKey)
    setFeedbackMessage(null)
    setErrorMessage(null)
    try {
      const editedConnection = (serviceConnectionsByProvider[providerKey] || EMPTY_LIST).find(
        (connection) => connection.id === serviceForms[providerKey]?.connectionId,
      ) || null
      validateServiceForm(providerKey, serviceForms[providerKey] || {}, editedConnection)
      await saveServiceConnection(providerKey, serviceForms[providerKey] || {})
      closeModal(providerKey)
      await refreshAccounts()
      setFeedbackMessage(`${SERVICE_CONNECTION_FIELDS[providerKey].title} valide et active.`)
    } catch (requestError) {
      setErrorMessage(requestError?.message || `Impossible d enregistrer ${providerKey}.`)
    } finally {
      setSavingProviderKey('')
    }
  }

  const handleActivateService = async (providerKey, connectionId) => {
    const connectionKey = `${providerKey}-${connectionId}`
    setActivatingConnectionKey(connectionKey)
    setFeedbackMessage(null)
    setErrorMessage(null)
    try {
      await activateServiceConnection(providerKey, connectionId)
      await refreshAccounts()
      setFeedbackMessage(`${SERVICE_CONNECTION_FIELDS[providerKey].title} active.`)
    } catch (requestError) {
      setErrorMessage(requestError?.message || `Impossible d activer ${providerKey}.`)
    } finally {
      setActivatingConnectionKey('')
    }
  }

  const handleValidateService = async (providerKey, connectionId) => {
    const connectionKey = `${providerKey}-${connectionId}`
    setValidatingConnectionKey(connectionKey)
    setFeedbackMessage(null)
    setErrorMessage(null)
    try {
      await validateServiceConnection(providerKey, connectionId)
      await refreshAccounts()
      setFeedbackMessage(`${SERVICE_CONNECTION_FIELDS[providerKey].title} revalide.`)
    } catch (requestError) {
      setErrorMessage(requestError?.message || `Impossible de valider ${providerKey}.`)
    } finally {
      setValidatingConnectionKey('')
    }
  }

  const handleDeleteService = async (providerKey, connectionId) => {
    const connectionKey = `${providerKey}-${connectionId}`
    setDisconnectingProviderKey(connectionKey)
    setFeedbackMessage(null)
    setErrorMessage(null)
    try {
      await deleteServiceConnection(providerKey, connectionId)
      if (serviceForms[providerKey]?.connectionId === connectionId) {
        startNewServiceProfile(providerKey)
      }
      await refreshAccounts()
      setFeedbackMessage(`${SERVICE_CONNECTION_FIELDS[providerKey].title} supprime.`)
    } catch (requestError) {
      setErrorMessage(requestError?.message || `Impossible de supprimer ${providerKey}.`)
    } finally {
      setDisconnectingProviderKey('')
    }
  }

  const handleDisconnectTikTok = async (accountId) => {
    setDisconnectingProviderKey(`TIKTOK-${accountId}`)
    setFeedbackMessage(null)
    setErrorMessage(null)
    try {
      await disconnectTikTokAccount(accountId)
      await refreshAccounts()
      setFeedbackMessage('Compte TikTok deconnecte.')
    } catch (requestError) {
      setErrorMessage(requestError?.message || 'Impossible de deconnecter le compte TikTok.')
    } finally {
      setDisconnectingProviderKey('')
    }
  }

  return (
    <div className="admin-page video-ops-page">
      <AdminShell
        activeNavId="accounts"
        feedbackItems={[
          { type: 'error', message: error?.message || errorMessage || null },
          { type: 'success', message: feedbackMessage && !errorMessage ? feedbackMessage : null },
        ]}
      >
        <div className="video-ops-shell">
          <section className="video-page-heading">
            <div>
              <p className="video-ops-kicker">Accounts</p>
              <h1>Gère tous tes comptes et services en un seul endroit</h1>
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
                        <span className="video-pill success">Connecté</span>
                      </div>
                    </div>
                    <div className="accounts-service-row-actions">
                      <button
                        type="button"
                        className="video-action-btn ghost danger"
                        onClick={() => void handleDisconnectTikTok(account.id)}
                        disabled={disconnectingProviderKey === `TIKTOK-${account.id}`}
                      >
                        {disconnectingProviderKey === `TIKTOK-${account.id}` ? 'Déconnexion...' : 'Déconnecter'}
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
                  <div className="accounts-service-connect-icon">🎵</div>
                  <div className="accounts-service-connect-text">
                    <strong>Connecter TikTok</strong>
                    <span>Connexion OAuth pour la publication</span>
                  </div>
                </button>
              </div>
            )}

            {Object.entries(SERVICE_CONNECTION_FIELDS).map(([providerKey, providerConfig]) => {
              const connections = serviceConnectionsByProvider[providerKey] || EMPTY_LIST
              const connection = activeConnectionsByProvider[providerKey] || null

              return (
                <div key={providerKey} className="accounts-service-grid-item">
                  {connection?.active ? (
                    <div className="accounts-service-row is-active">
                      <div className="accounts-service-row-info">
                        <div className="accounts-service-row-head">
                          <strong>{providerConfig.title}</strong>
                          <span className="accounts-service-row-status">{connection?.displayName || connection?.accountIdentifier || 'Connecté'}</span>
                        </div>
                        <div className="accounts-service-row-meta">
                          <span className={`video-pill ${connection?.active ? 'success' : ''}`}>
                            {formatStatusLabel(connection?.status || 'DISCONNECTED')}
                          </span>
                          <span className={`accounts-validation-pill is-${formatValidationStatus(connection)}`}>
                            {formatStatusLabel(connection?.validationStatus || 'UNKNOWN')}
                          </span>
                        </div>
                      </div>
                      <div className="accounts-service-row-actions">
                        <button
                          type="button"
                          className="video-action-btn ghost"
                          onClick={() => loadServiceProfile(providerKey, connection)}
                          disabled={false}
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
                      <div className="accounts-service-connect-icon">
                        {providerKey === 'N8N' && '⚙️'}
                        {providerKey === 'GROQ' && '🤖'}
                        {providerKey === 'SHOTSTACK' && '🎬'}
                        {providerKey === 'PEXELS' && '🖼️'}
                      </div>
                      <div className="accounts-service-connect-text">
                        <strong>Connecter {providerConfig.title}</strong>
                        <span>{connections.length} profil{connections.length > 1 ? 's' : ''} sauvegardé{connections.length > 1 ? 's' : ''}</span>
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
                <div className="accounts-modal" onClick={(e) => e.stopPropagation()}>
                  <div className="accounts-modal-header">
                    <h3>{isEditingExistingProfile ? 'Editer' : 'Connecter'} {providerConfig.title}</h3>
                    <button
                      type="button"
                      className="accounts-modal-close"
                      onClick={() => closeModal(providerKey)}
                      aria-label="Fermer"
                    >
                      ✕
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
                            : connection?.hasSecret ? 'Secret deja enregistre' : 'Coller le secret ici'}
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
                    <button type="button" className="video-action-btn" onClick={() => void handleSaveService(providerKey)} disabled={isSaving}>
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
