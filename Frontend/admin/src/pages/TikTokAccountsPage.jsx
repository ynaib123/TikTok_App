import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import AdminShell from '../components/AdminShell'
import { fetchTikTokAccounts } from '../services/videoOpsSupabase'
import { createTikTokAuthorizationUrl } from '../services/tiktokOAuthApi'

export default function TikTokAccountsPage() {
  const location = useLocation()
  const { data: tiktokAccounts = [], isLoading, error } = useQuery({
    queryKey: ['tiktok-accounts'],
    queryFn: fetchTikTokAccounts,
  })
  const [isConnecting, setIsConnecting] = useState(false)
  const [infoMessage, setInfoMessage] = useState(location.state?.tiktokOAuthSuccess || null)
  const showEmptyState = !isLoading && !error && !tiktokAccounts.length

  useEffect(() => {
    if (location.state?.tiktokOAuthSuccess) {
      window.history.replaceState({}, document.title)
    }
  }, [location.state])

  const handleConnectTikTok = async () => {
    setIsConnecting(true)
    setInfoMessage(null)
    try {
      const response = await createTikTokAuthorizationUrl('/tiktok-accounts')
      window.location.assign(response.authUrl)
    } catch (requestError) {
      setInfoMessage(requestError?.message || 'Impossible de lancer la connexion TikTok.')
      setIsConnecting(false)
    }
  }

  return (
    <div className="admin-page video-ops-page">
      <AdminShell
        activeNavId="tiktok-accounts"
        feedbackItems={[
          { type: 'error', message: error?.message || null },
          { type: 'success', message: infoMessage && !error ? infoMessage : null },
        ]}
      >
        <div className="video-ops-shell">
          <section className="video-page-heading">
            <div>
              <p className="video-ops-kicker">TikTok Accounts</p>
              <h1>Comptes connectes et metadonnees OAuth.</h1>
            </div>
            <button type="button" className="video-action-btn" onClick={() => void handleConnectTikTok()} disabled={isConnecting}>
              {isConnecting ? 'Redirection...' : 'Connecter TikTok'}
            </button>
          </section>

          {isLoading ? <p className="video-inline-state">Chargement des comptes TikTok...</p> : null}

          <section className="video-panel-grid single-column">
            <article className="video-panel-card">
              <div className="video-panel-head">
                <h2>tiktok_accounts</h2>
                <span>{tiktokAccounts.length} connected account</span>
              </div>
              {showEmptyState ? (
                <div className="video-empty-state">
                  <p>Aucun compte n est visible depuis le backoffice.</p>
                  <p>
                    Si la table n est pas vide dans Supabase, verifie que le backend video ops
                    est configure avec la lecture serveur des donnees TikTok.
                  </p>
                </div>
              ) : null}
              <div className="video-table-wrap">
                <table className="video-table">
                  <thead>
                    <tr>
                      <th>Nickname</th>
                      <th>Open ID</th>
                      <th>Scope</th>
                      <th>Environment</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tiktokAccounts.map((account) => (
                      <tr key={account.id}>
                        <td>{account.nickname}</td>
                        <td>{account.openId}</td>
                        <td>{account.scope}</td>
                        <td>{account.environment}</td>
                        <td><span className="video-pill success">{account.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          </section>
        </div>
      </AdminShell>
    </div>
  )
}
