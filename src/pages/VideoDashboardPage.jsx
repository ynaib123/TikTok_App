import AdminShell from '../components/AdminShell'
import { dashboardStats, statusGroups } from '../services/videoOpsData'

export default function VideoDashboardPage() {
  return (
    <div className="admin-page video-ops-page">
      <AdminShell activeNavId="dashboard">
        <div className="video-ops-shell">
          <section className="video-ops-hero">
            <div>
              <p className="video-ops-kicker">TikTok App Operations</p>
              <h1>Backoffice d orchestration pour generation, rendu et publication.</h1>
              <p>
                Une vue centrale pour suivre les idees, les rendus Shotstack et les actions
                manuelles TikTok encore necessaires.
              </p>
            </div>
          </section>

          <section className="video-stats-grid">
            {dashboardStats.map((stat) => (
              <article key={stat.label} className={`video-stat-card tone-${stat.tone}`}>
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>
              </article>
            ))}
          </section>

          <section className="video-panel-grid">
            <article className="video-panel-card">
              <div className="video-panel-head">
                <h2>Pipeline Snapshot</h2>
                <span>Live workflow map</span>
              </div>
              <div className="video-pipeline-list">
                {['Generate topic', 'Draft script', 'Fetch Pexels', 'Render Shotstack', 'Init publish', 'Manual upload', 'Status check'].map((step) => (
                  <div key={step} className="video-pipeline-step">
                    <span className="video-pipeline-dot" />
                    <p>{step}</p>
                  </div>
                ))}
              </div>
            </article>

            <article className="video-panel-card">
              <div className="video-panel-head">
                <h2>Status Breakdown</h2>
                <span>Current operational mix</span>
              </div>
              <div className="video-status-stack">
                {statusGroups.map((group) => (
                  <div key={group.label} className="video-status-row">
                    <span>{group.label}</span>
                    <strong>{group.value}</strong>
                  </div>
                ))}
              </div>
            </article>
          </section>
        </div>
      </AdminShell>
    </div>
  )
}
