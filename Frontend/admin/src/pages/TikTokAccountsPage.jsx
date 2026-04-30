import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
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
  SUPABASE: {
    title: 'Supabase',
    baseUrlLabel: 'Project URL',
    identifierLabel: 'Project / workspace',
    secretLabel: 'Service role key',
    defaultBaseUrl: 'https://<project>.supabase.co',
    metadataPlaceholder: '{"schema":"public"}',
    envVars: ['APP_VIDEO_OPS_SUPABASE_URL', 'APP_VIDEO_OPS_SUPABASE_SERVICE_ROLE_KEY'],
  },
  N8N: {
    title: 'n8n',
    baseUrlLabel: 'Instance URL',
    identifierLabel: 'Workspace / owner',
    secretLabel: 'Internal secret',
    defaultBaseUrl: 'http://n8n:5678',
    metadataPlaceholder: '{"callbacks":"hmac"}',
    envVars: ['APP_VIDEO_OPS_INTERNAL_API_SECRET', 'APP_VIDEO_OPS_WORKFLOW_CALLBACK_HMAC_SECRET'],
  },
  GROQ: {
    title: 'Groq',
    baseUrlLabel: 'API base URL',
    identifierLabel: 'Workspace / email',
    secretLabel: 'API key',
    defaultBaseUrl: 'https://api.groq.com',
    metadataPlaceholder: '{"model":"llama-3.3-70b-versatile"}',
    envVars: ['GROQ_API_KEY'],
  },
  SHOTSTACK: {
    title: 'Shotstack',
    baseUrlLabel: 'API base URL',
    identifierLabel: 'Environment / owner',
    secretLabel: 'API key',
    defaultBaseUrl: 'https://api.shotstack.io/edit/v1',
    metadataPlaceholder: '{"environment":"production"}',
    envVars: ['SHOTSTACK_API_KEY'],
  },
  PEXELS: {
    title: 'Pexels',
    baseUrlLabel: 'API base URL',
    identifierLabel: 'Workspace / email',
    secretLabel: 'API key',
    defaultBaseUrl: 'https://api.pexels.com',
    metadataPlaceholder: '{"orientation":"portrait"}',
    envVars: ['PEXELS_API_KEY'],
  },
}

function createEmptyServiceForm(connection) {
  return {
    connectionId: connection?.id || null,
    displayName: connection?.displayName || '',
    baseUrl: connection?.baseUrl || '',
    accountIdentifier: connection?.accountIdentifier || '',
    secretValue: '',
    metadataJson: connection?.metadataJson || '',
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

  if (!normalizedSecret && !connection?.hasSecret) {
    throw new Error(`Renseigne ${providerConfig.secretLabel.toLowerCase()} pour ${providerConfig.title}.`)
  }
}

export default function TikTokAccountsPage() {
  const location = useLocation()
  const queryClient = useQueryClient()
  const [isConnectingTikTok, setIsConnectingTikTok] = useState(false)
  const [savingProviderKey, setSavingProviderKey] = useState('')
  const [disconnectingProviderKey, setDisconnectingProviderKey] = useState('')
  const [activatingConnectionKey, setActivatingConnectionKey] = useState('')
  const [validatingConnectionKey, setValidatingConnectionKey] = useState('')
  const [feedbackMessage, setFeedbackMessage] = useState(location.state?.tiktokOAuthSuccess || location.state?.accountsWarning || null)
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
    Object.keys(SERVICE_CONNECTION_FIELDS).map((providerKey) => [providerKey, createEmptyServiceForm(null)]),
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
  }, [location.state])

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
  }

  const startNewServiceProfile = (providerKey) => {
    setServiceForms((current) => ({
      ...current,
      [providerKey]: createEmptyServiceForm(null),
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
      startNewServiceProfile(providerKey)
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
              <h1>Centralise les comptes et change de profil rapidement.</h1>
            </div>
          </section>

          <section className="video-panel-grid single-column">
            <article className="video-panel-card accounts-summary-card">
              <div className="video-panel-head">
                <h2>Overview</h2>
                <span>{readiness.ready ? 'ready' : 'incomplete'}</span>
              </div>
              {isLoading ? <p className="video-inline-state">Chargement...</p> : null}
              {!isLoading ? (
                <div className="accounts-summary-grid">
                  <div className="accounts-summary-item">
                    <span>Statut</span>
                    <strong>{readiness.ready ? 'Ready' : 'Action requise'}</strong>
                  </div>
                  <div className="accounts-summary-item">
                    <span>TikTok</span>
                    <strong>{readiness.connectedTikTokAccounts || 0}</strong>
                  </div>
                  <div className="accounts-summary-item">
                    <span>Services actifs</span>
                    <strong>{Object.values(activeConnectionsByProvider).filter(Boolean).length}</strong>
                  </div>
                  <div className="accounts-summary-item accounts-summary-item-wide">
                    <span>Manquants</span>
                    <strong>{readiness.missingItems?.length ? readiness.missingItems.join(' • ') : 'Aucun'}</strong>
                  </div>
                </div>
              ) : null}
            </article>
          </section>

          <section className="accounts-service-list">
            <article className="video-panel-card accounts-service-card accounts-service-card-tiktok">
              <div className="video-panel-head accounts-service-head">
                <h2>TikTok</h2>
                <span>{tiktokAccounts.length} compte{tiktokAccounts.length > 1 ? 's' : ''}</span>
              </div>
              <div className="accounts-service-toolbar">
                <p className="video-inline-state">
                  Connexion OAuth pour les comptes de publication.
                  {tiktokAccounts.length ? ' Supprime le compte existant pour en ajouter un autre.' : ''}
                </p>
                <button
                  type="button"
                  className="video-action-btn"
                  onClick={() => void handleConnectTikTok()}
                  disabled={isConnectingTikTok || tiktokAccounts.length > 0}
                >
                  {isConnectingTikTok ? 'Redirection...' : 'Connecter TikTok'}
                </button>
              </div>
              {tiktokAccounts.length ? (
                <div className="video-table-wrap">
                  <table className="video-table">
                    <thead>
                      <tr>
                        <th>Nickname</th>
                        <th>Open ID</th>
                        <th>Scope</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tiktokAccounts.map((account) => (
                        <tr key={account.id}>
                          <td>{account.nickname}</td>
                          <td>{account.openId}</td>
                          <td>{account.scope}</td>
                          <td><span className="video-pill success">{account.status}</span></td>
                          <td>
                            <button
                              type="button"
                              className="video-action-btn ghost"
                              onClick={() => void handleDisconnectTikTok(account.id)}
                              disabled={disconnectingProviderKey === `TIKTOK-${account.id}`}
                            >
                              {disconnectingProviderKey === `TIKTOK-${account.id}` ? 'Deconnexion...' : 'Deconnecter'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="video-empty-state">
                  <p>Aucun compte TikTok n est encore connecte.</p>
                </div>
              )}
            </article>

            {Object.entries(SERVICE_CONNECTION_FIELDS).map(([providerKey, providerConfig]) => {
              const connections = serviceConnectionsByProvider[providerKey] || EMPTY_LIST
              const connection = activeConnectionsByProvider[providerKey] || null
              const form = serviceForms[providerKey] || createEmptyServiceForm(connection)
              const isSaving = savingProviderKey === providerKey
              const isEditingExistingProfile = Boolean(form.connectionId)

              return (
                <article key={providerKey} className="video-panel-card accounts-service-card">
                  <div className="video-panel-head accounts-service-head">
                    <h2>{providerConfig.title}</h2>
                    <span>{connection?.active ? 'active' : 'idle'}</span>
                  </div>
                  <div className="accounts-service-layout">
                    <div className="accounts-service-main">
                      <div className="accounts-service-toolbar">
                        <div className="accounts-service-statusline">
                          <span className={`video-pill ${connection?.active ? 'success' : ''}`}>
                            {formatStatusLabel(connection?.status || 'DISCONNECTED')}
                          </span>
                          <span className={`accounts-validation-pill is-${formatValidationStatus(connection)}`}>
                            {formatStatusLabel(connection?.validationStatus || 'UNKNOWN')}
                          </span>
                          <span className="accounts-service-counter">{connections.length} profil{connections.length > 1 ? 's' : ''}</span>
                        </div>
                        {!connection?.active ? (
                          <button type="button" className="video-action-btn ghost" onClick={() => startNewServiceProfile(providerKey)}>
                            Nouveau profil
                          </button>
                        ) : null}
                      </div>
                      {connections.length ? (
                        <div className="accounts-service-saved-list">
                          {connections.map((savedConnection) => {
                            const connectionKey = `${providerKey}-${savedConnection.id}`
                            const isActivating = activatingConnectionKey === connectionKey
                            const isValidating = validatingConnectionKey === connectionKey
                            const isDeleting = disconnectingProviderKey === connectionKey
                            const isEditing = form.connectionId === savedConnection.id

                            return (
                              <div key={savedConnection.id} className={`accounts-service-saved-item${savedConnection.active ? ' is-active' : ''}`}>
                                <div className="accounts-service-saved-head">
                                  <span>{savedConnection.displayName || savedConnection.accountIdentifier || `Profil ${savedConnection.id}`}</span>
                                  {savedConnection.active ? <em>Actif</em> : null}
                                </div>
                                <p>{savedConnection.accountIdentifier || savedConnection.baseUrl || '-'}</p>
                                <small>
                                  {formatStatusLabel(savedConnection.status)} • {formatStatusLabel(savedConnection.validationStatus)}
                                </small>
                                <div className="tiktok-step-actions accounts-service-actions compact">
                                  <button
                                    type="button"
                                    className="video-action-btn ghost"
                                    onClick={() => loadServiceProfile(providerKey, savedConnection)}
                                  >
                                    {isEditing ? 'Edition en cours' : 'Editer'}
                                  </button>
                                  <button
                                    type="button"
                                    className="video-action-btn ghost"
                                    onClick={() => void handleValidateService(providerKey, savedConnection.id)}
                                    disabled={isValidating}
                                  >
                                    {isValidating ? 'Validation...' : 'Verifier'}
                                  </button>
                                  <button
                                    type="button"
                                    className="video-action-btn ghost"
                                    onClick={() => void handleActivateService(providerKey, savedConnection.id)}
                                    disabled={isActivating || savedConnection.active}
                                  >
                                    {savedConnection.active ? 'Actif' : isActivating ? 'Activation...' : 'Activer'}
                                  </button>
                                  <button
                                    type="button"
                                    className="video-action-btn ghost danger"
                                    onClick={() => void handleDeleteService(providerKey, savedConnection.id)}
                                    disabled={isDeleting}
                                  >
                                    {isDeleting ? 'Suppression...' : 'Supprimer'}
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ) : null}
                      {!connection?.active ? (
                        <div className="accounts-service-editor">
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
                                  Si toute la stack tourne dans Docker, utilise <code>http://n8n:5678</code>.
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
                                placeholder={connection?.hasSecret ? 'Secret deja enregistre' : 'Coller le secret ici'}
                              />
                            </label>
                            <label className="tiktok-step-field accounts-service-form-wide">
                              <span>Metadata JSON</span>
                              <textarea
                                rows="4"
                                value={form.metadataJson}
                                onChange={(event) => updateServiceForm(providerKey, 'metadataJson', event.target.value)}
                                placeholder={providerConfig.metadataPlaceholder}
                              />
                            </label>
                          </div>
                          <div className="tiktok-step-actions accounts-service-actions">
                            <button type="button" className="video-action-btn" onClick={() => void handleSaveService(providerKey)} disabled={isSaving}>
                              {isSaving ? 'Connexion...' : isEditingExistingProfile ? 'Mettre a jour' : 'Enregistrer'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="accounts-service-editor accounts-service-editor-readonly">
                          <p>Un compte {providerConfig.title} est déjà connecté. Supprime-le pour en ajouter un autre.</p>
                        </div>
                      )}
                    </div>
                    <aside className="accounts-service-aside">
                      <div className="accounts-mini-stack">
                        <div className="accounts-mini-card">
                          <span>Actif</span>
                          <strong>{connection?.displayName || connection?.accountIdentifier || 'Aucun'}</strong>
                        </div>
                        <div className="accounts-mini-card">
                          <span>Secret</span>
                          <strong>{connection?.hasSecret ? 'Present' : 'Absent'}</strong>
                        </div>
                        <div className="accounts-mini-card">
                          <span>Validation</span>
                          <strong>{formatStatusLabel(connection?.validationStatus || 'UNKNOWN')}</strong>
                        </div>
                        <div className="accounts-mini-card">
                          <span>Derniere verif</span>
                          <strong>{connection?.lastValidatedAt || '-'}</strong>
                        </div>
                        <div className="accounts-mini-card">
                          <span>Env</span>
                          <strong>{providerConfig.envVars.join(', ')}</strong>
                        </div>
                        {connection?.validationMessage ? (
                          <div className="accounts-mini-card accounts-mini-card-wide">
                            <span>Message</span>
                            <strong>{connection.validationMessage}</strong>
                          </div>
                        ) : null}
                      </div>
                    </aside>
                  </div>
                </article>
              )
            })}
          </section>
        </div>
      </AdminShell>
    </div>
  )
}
