import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import AdminShell from '../components/AdminShell'
import {
  disconnectServiceConnection,
  disconnectTikTokAccount,
  fetchAccountsOverview,
  saveServiceConnection,
} from '../services/videoOpsSupabase'
import { createTikTokAuthorizationUrl } from '../services/tiktokOAuthApi'

const SERVICE_CONNECTION_FIELDS = {
  SUPABASE: {
    title: 'Supabase',
    description: 'URL du projet et service role key utilises par le backend et les workflows.',
    baseUrlLabel: 'Project URL',
    identifierLabel: 'Project / workspace',
    secretLabel: 'Service role key',
  },
  N8N: {
    title: 'n8n',
    description: 'URL de ton instance et secret interne pour les callbacks et endpoints backend.',
    baseUrlLabel: 'Instance URL',
    identifierLabel: 'Workspace / owner',
    secretLabel: 'Internal secret',
  },
  GROQ: {
    title: 'Groq',
    description: 'Cle API utilisee pour la generation de scripts et d idees.',
    baseUrlLabel: 'API base URL',
    identifierLabel: 'Workspace / email',
    secretLabel: 'API key',
  },
  SHOTSTACK: {
    title: 'Shotstack',
    description: 'Cle API et endpoint utilises pour le rendu video.',
    baseUrlLabel: 'API base URL',
    identifierLabel: 'Environment / owner',
    secretLabel: 'API key',
  },
  PEXELS: {
    title: 'Pexels',
    description: 'Cle API et infos de recherche media de fond.',
    baseUrlLabel: 'API base URL',
    identifierLabel: 'Workspace / email',
    secretLabel: 'API key',
  },
}

function createEmptyServiceForm(connection) {
  return {
    displayName: connection?.displayName || '',
    baseUrl: connection?.baseUrl || '',
    accountIdentifier: connection?.accountIdentifier || '',
    secretValue: '',
    metadataJson: '',
  }
}

function formatProviderStatus(connection) {
  if (!connection) return 'not_connected'
  return String(connection.status || 'not_connected').toLowerCase()
}

export default function TikTokAccountsPage() {
  const location = useLocation()
  const queryClient = useQueryClient()
  const [isConnectingTikTok, setIsConnectingTikTok] = useState(false)
  const [savingProviderKey, setSavingProviderKey] = useState('')
  const [disconnectingProviderKey, setDisconnectingProviderKey] = useState('')
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

  const tiktokAccounts = overview?.tiktokAccounts || []
  const serviceConnections = overview?.serviceConnections || []
  const readiness = overview?.readiness || { ready: false, missingItems: [] }

  const connectionsByProvider = useMemo(
    () => Object.fromEntries(serviceConnections.map((connection) => [String(connection.providerKey || '').toUpperCase(), connection])),
    [serviceConnections],
  )

  const [serviceForms, setServiceForms] = useState(() => Object.fromEntries(
    Object.keys(SERVICE_CONNECTION_FIELDS).map((providerKey) => [providerKey, createEmptyServiceForm(null)]),
  ))

  useEffect(() => {
    setServiceForms((current) => {
      const next = { ...current }
      Object.keys(SERVICE_CONNECTION_FIELDS).forEach((providerKey) => {
        next[providerKey] = {
          ...createEmptyServiceForm(connectionsByProvider[providerKey]),
          secretValue: current[providerKey]?.secretValue || '',
          metadataJson: current[providerKey]?.metadataJson || '',
        }
      })
      return next
    })
  }, [connectionsByProvider])

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
      await saveServiceConnection(providerKey, serviceForms[providerKey] || {})
      setServiceForms((current) => ({
        ...current,
        [providerKey]: {
          ...(current[providerKey] || createEmptyServiceForm(null)),
          secretValue: '',
        },
      }))
      await refreshAccounts()
      setFeedbackMessage(`${SERVICE_CONNECTION_FIELDS[providerKey].title} connecte.`)
    } catch (requestError) {
      setErrorMessage(requestError?.message || `Impossible d enregistrer ${providerKey}.`)
    } finally {
      setSavingProviderKey('')
    }
  }

  const handleDisconnectService = async (providerKey) => {
    setDisconnectingProviderKey(providerKey)
    setFeedbackMessage(null)
    setErrorMessage(null)
    try {
      await disconnectServiceConnection(providerKey)
      await refreshAccounts()
      setFeedbackMessage(`${SERVICE_CONNECTION_FIELDS[providerKey].title} deconnecte.`)
    } catch (requestError) {
      setErrorMessage(requestError?.message || `Impossible de deconnecter ${providerKey}.`)
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
              <h1>Connecte tous les comptes et toutes les cles utilises dans le parcours.</h1>
            </div>
          </section>

          <section className="video-panel-grid single-column">
            <article className="video-panel-card">
              <div className="video-panel-head">
                <h2>Readiness</h2>
                <span>{readiness.ready ? 'ready' : 'incomplete'}</span>
              </div>
              {isLoading ? <p className="video-inline-state">Chargement de la readiness...</p> : null}
              {!isLoading ? (
                <div className="video-preview-stack">
                  <div className="video-preview-block">
                    <span>Statut</span>
                    <p>{readiness.ready ? 'Tous les comptes requis sont connectes.' : 'Des connexions manquent encore.'}</p>
                  </div>
                  <div className="video-preview-block">
                    <span>Comptes TikTok connectes</span>
                    <p>{readiness.connectedTikTokAccounts || 0}</p>
                  </div>
                  <div className="video-preview-block">
                    <span>Elements manquants</span>
                    <p>{readiness.missingItems?.length ? readiness.missingItems.join(', ') : 'Aucun'}</p>
                  </div>
                </div>
              ) : null}
            </article>
          </section>

          <section className="video-panel-grid">
            <article className="video-panel-card">
              <div className="video-panel-head">
                <h2>TikTok</h2>
                <span>{tiktokAccounts.length} connected account{tiktokAccounts.length > 1 ? 's' : ''}</span>
              </div>
              <p className="video-inline-state">OAuth et compte(s) TikTok disponibles pour le parcours.</p>
              <div className="tiktok-step-actions">
                <button type="button" className="video-action-btn" onClick={() => void handleConnectTikTok()} disabled={isConnectingTikTok}>
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
                  <p>Ajoute au moins un compte TikTok ici avant d utiliser le `+` dans la page TikTok.</p>
                </div>
              )}
            </article>

            {Object.entries(SERVICE_CONNECTION_FIELDS).map(([providerKey, providerConfig]) => {
              const connection = connectionsByProvider[providerKey] || null
              const form = serviceForms[providerKey] || createEmptyServiceForm(connection)
              const isSaving = savingProviderKey === providerKey
              const isDisconnecting = disconnectingProviderKey === providerKey

              return (
                <article key={providerKey} className="video-panel-card">
                  <div className="video-panel-head">
                    <h2>{providerConfig.title}</h2>
                    <span>{formatProviderStatus(connection)}</span>
                  </div>
                  <p className="video-inline-state">{providerConfig.description}</p>
                  <div className="tiktok-step-form">
                    <label className="tiktok-step-field">
                      <span>Display name</span>
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
                        placeholder="https://..."
                      />
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
                    <label className="tiktok-step-field">
                      <span>Metadata JSON</span>
                      <textarea
                        rows="4"
                        value={form.metadataJson}
                        onChange={(event) => updateServiceForm(providerKey, 'metadataJson', event.target.value)}
                        placeholder='{"env":"prod"}'
                      />
                    </label>
                  </div>
                  <div className="video-preview-stack">
                    <div className="video-preview-block">
                      <span>Etat courant</span>
                      <p>{connection?.status || 'DISCONNECTED'}</p>
                    </div>
                    <div className="video-preview-block">
                      <span>Secret present</span>
                      <p>{connection?.hasSecret ? 'Oui' : 'Non'}</p>
                    </div>
                    <div className="video-preview-block">
                      <span>Derniere validation</span>
                      <p>{connection?.lastValidatedAt || '-'}</p>
                    </div>
                  </div>
                  <div className="tiktok-step-actions">
                    <button type="button" className="video-action-btn" onClick={() => void handleSaveService(providerKey)} disabled={isSaving}>
                      {isSaving ? 'Connexion...' : 'Connecter / enregistrer'}
                    </button>
                    <button type="button" className="video-action-btn ghost" onClick={() => void handleDisconnectService(providerKey)} disabled={isDisconnecting || !connection}>
                      {isDisconnecting ? 'Deconnexion...' : 'Deconnecter'}
                    </button>
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
