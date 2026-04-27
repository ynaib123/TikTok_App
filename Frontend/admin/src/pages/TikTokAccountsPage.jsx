import { useQuery } from '@tanstack/react-query'
import AdminShell from '../components/AdminShell'
import { fetchTikTokAccounts } from '../services/videoOpsSupabase'

export default function TikTokAccountsPage() {
  const { data: tiktokAccounts = [], isLoading, error } = useQuery({
    queryKey: ['tiktok-accounts'],
    queryFn: fetchTikTokAccounts,
  })

  return (
    <div className="admin-page video-ops-page">
      <AdminShell
        activeNavId="tiktok-accounts"
        feedbackItems={[{ type: 'error', message: error?.message || null }]}
      >
        <div className="video-ops-shell">
          <section className="video-page-heading">
            <div>
              <p className="video-ops-kicker">TikTok Accounts</p>
              <h1>Comptes connectes et metadonnees OAuth.</h1>
            </div>
          </section>

          {isLoading ? <p className="video-inline-state">Chargement des comptes TikTok...</p> : null}

          <section className="video-panel-grid single-column">
            <article className="video-panel-card">
              <div className="video-panel-head">
                <h2>tiktok_accounts</h2>
                <span>{tiktokAccounts.length} connected account</span>
              </div>
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
