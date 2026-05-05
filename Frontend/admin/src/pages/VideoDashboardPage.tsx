import { useNavigate } from 'react-router-dom'

import AdminShell from '../components/AdminShell'
import { StatTile } from '../components/accounts/AccountsPresenters'
import { useVideoDashboard } from '../hooks/useVideoDashboard'
import type { ServiceHealthStatus } from '../types'
import '../styles/features/journey.css'
import '../styles/features/accounts.css'
import '../styles/features/video-dashboard.css'

function pillClassFor(status: string | null | undefined): string {
  if (!status) return 'is-draft'
  const value = String(status).toUpperCase()
  if (value === 'UP') return 'is-published'
  if (value === 'DEGRADED' || value === 'WARNING') return 'is-rendering'
  if (value === 'DOWN' || value === 'FAILED') return 'is-error'
  if (value === 'DISABLED') return 'is-draft'
  return 'is-ready'
}

interface HealthPillProps {
  label: string
  status: ServiceHealthStatus | null | undefined
  detail?: string | null
}

function HealthPill({ label, status, detail }: HealthPillProps) {
  return (
    <div className={`journey-status-pill ${pillClassFor(status)}`} title={detail || ''}>
      <strong>{label}</strong>
      <span className="video-dashboard-pill-status">{status || '—'}</span>
    </div>
  )
}

export default function VideoDashboardPage() {
  const navigate = useNavigate()
  const { health, observability, dashboard, isLoading, isFetching, error, refresh } =
    useVideoDashboard()

  const recentRuns = observability?.recentRuns || dashboard?.recentRuns || []
  const failedRuns = observability?.failedRuns || []
  const stuckRuns = health?.workflows?.stuckRunsOlderThanThreshold ?? 0

  const counts = {
    total: recentRuns.length,
    succeeded: recentRuns.filter((r) => String(r.status).toUpperCase() === 'SUCCEEDED').length,
    failed: failedRuns.length,
    stuck: stuckRuns,
  }

  const feedbackItems = error ? [{ type: 'error' as const, message: error }] : []

  return (
    <div className="admin-page video-ops-page">
      <AdminShell activeNavId="dashboard" feedbackItems={feedbackItems}>
        <div className="video-ops-shell">
          <header className="journey-page-head">
            <div className="journey-page-head-copy">
              <h1>Dashboard</h1>
              <p>Vue d&apos;ensemble du pipeline TikTok et de la santé des services.</p>
            </div>
            <div className="journey-page-head-actions">
              <button
                type="button"
                className="journey-btn is-primary"
                onClick={() => navigate('/tiktok')}
              >
                Lancer un parcours
              </button>
              <button
                type="button"
                className="journey-btn is-ghost"
                onClick={() => {
                  void refresh()
                }}
                disabled={isFetching}
              >
                {isFetching ? 'Refresh…' : 'Refresh'}
              </button>
            </div>
          </header>

          <section className="journey-stats" aria-label="Statistiques pipeline">
            <StatTile label="Runs récents" value={counts.total} delta="10 derniers" />
            <StatTile
              label="Réussis"
              value={counts.succeeded}
              delta={
                counts.total
                  ? `${Math.round((counts.succeeded / counts.total) * 100)}%`
                  : null
              }
              trend="up"
            />
            <StatTile
              label="Échoués"
              value={counts.failed}
              delta={counts.failed > 0 ? 'À investiguer' : 'Aucun'}
              trend={counts.failed > 0 ? 'warn' : null}
            />
            <StatTile
              label="Bloqués"
              value={counts.stuck}
              delta={
                counts.stuck > 0
                  ? `> seuil (${health?.workflows?.stuckThresholdSeconds || 0}s)`
                  : 'Aucun'
              }
              trend={counts.stuck > 0 ? 'warn' : null}
            />
          </section>

          <section
            className="accounts-cards-grid video-dashboard-section"
            aria-label="Santé des services"
          >
            <article className="accounts-card">
              <header className="accounts-card-head">
                <strong className="video-dashboard-card-title">Santé des services</strong>
              </header>
              <div className="accounts-card-body video-dashboard-card-body">
                <HealthPill
                  label="Backend"
                  status={health?.status || (isLoading ? '...' : 'UNKNOWN')}
                  detail="État global"
                />
                <HealthPill
                  label="Postgres"
                  status={health?.database?.status}
                  detail={health?.database?.detail}
                />
                <HealthPill
                  label="n8n"
                  status={health?.n8n?.status}
                  detail={health?.n8n?.detail}
                />
                <HealthPill
                  label="Alerting"
                  status={health?.alerting?.status}
                  detail={health?.alerting?.detail}
                />
              </div>
            </article>

            <article className="accounts-card">
              <header className="accounts-card-head">
                <strong className="video-dashboard-card-title">Derniers runs</strong>
              </header>
              <div className="accounts-card-body video-dashboard-card-body--tight">
                {recentRuns.length === 0 ? (
                  <span className="video-dashboard-card-empty">
                    {isLoading ? 'Chargement…' : 'Aucun run.'}
                  </span>
                ) : (
                  recentRuns.slice(0, 8).map((r) => (
                    <div key={r.id} className="video-dashboard-run-row">
                      <span className="video-dashboard-run-id">
                        #{r.id} {r.workflowType}
                      </span>
                      <span className={`journey-status-pill ${pillClassFor(String(r.status))}`}>
                        {r.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </article>

            {failedRuns.length > 0 ? (
              <article className="accounts-card video-dashboard-failed-card">
                <header className="accounts-card-head">
                  <strong className="video-dashboard-card-title">Échecs récents</strong>
                </header>
                <div className="accounts-card-body video-dashboard-card-body--tight">
                  {failedRuns.slice(0, 6).map((r) => (
                    <div key={r.id} className="video-dashboard-failed-row">
                      <span className="video-dashboard-run-id">
                        #{r.id} {r.workflowType} (idée #{r.contentIdeaId ?? '—'})
                      </span>
                      <span className="video-dashboard-run-error">
                        {r.errorMessage || '—'}
                      </span>
                    </div>
                  ))}
                </div>
              </article>
            ) : null}
          </section>
        </div>
      </AdminShell>
    </div>
  )
}
