import { useMutation, useQuery } from '@tanstack/react-query'
import AdminShell from '../components/AdminShell'
import { fetchDashboardData } from '../services/videoOpsSupabase'
import {
  triggerCheckShotstackWorkflow,
  triggerMainContentPipeline,
  triggerPublishTikTokWorkflow,
} from '../services/n8nClient'

export default function VideoDashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['video-dashboard'],
    queryFn: fetchDashboardData,
  })
  const triggerMainMutation = useMutation({ mutationFn: triggerMainContentPipeline })
  const triggerCheckMutation = useMutation({ mutationFn: triggerCheckShotstackWorkflow })
  const triggerPublishMutation = useMutation({ mutationFn: triggerPublishTikTokWorkflow })

  const dashboardStats = data?.stats || []
  const statusGroups = data?.groups || []
  const feedbackMessage =
    error?.message
    || triggerMainMutation.error?.message
    || triggerCheckMutation.error?.message
    || triggerPublishMutation.error?.message
    || null

  return (
    <div className="admin-page video-ops-page">
      <AdminShell
        activeNavId="dashboard"
        feedbackItems={[{ type: 'error', message: feedbackMessage }]}
      >
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
            <div className="video-action-row">
              <button
                type="button"
                className="video-action-btn"
                onClick={() => triggerMainMutation.mutate({ source: 'backoffice' })}
                disabled={triggerMainMutation.isPending}
              >
                {triggerMainMutation.isPending ? 'Generation...' : 'Lancer generation'}
              </button>
              <button
                type="button"
                className="video-action-btn ghost"
                onClick={() => triggerCheckMutation.mutate({ source: 'backoffice' })}
                disabled={triggerCheckMutation.isPending}
              >
                {triggerCheckMutation.isPending ? 'Verification...' : 'Verifier rendus'}
              </button>
              <button
                type="button"
                className="video-action-btn ghost"
                onClick={() => triggerPublishMutation.mutate({ source: 'backoffice' })}
                disabled={triggerPublishMutation.isPending}
              >
                {triggerPublishMutation.isPending ? 'Publication...' : 'Init publish TikTok'}
              </button>
            </div>
          </section>

          {isLoading ? <p className="video-inline-state">Chargement du dashboard...</p> : null}

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
