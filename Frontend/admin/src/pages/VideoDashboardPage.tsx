import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

import AdminShell from '../components/AdminShell'
import { StatTile } from '../components/accounts/AccountsPresenters'
import { useVideoDashboard } from '../hooks/useVideoDashboard'
import { markAdminRouteReady } from '../services/adminPerformance'
import { Button, Pill, Spinner } from '../design-system'
import type { ServiceHealthStatus } from '../types'
import '../styles/features/journey.css'
import '../styles/features/accounts.css'
import '../styles/features/video-dashboard.css'

type PillTone = 'neutral' | 'success' | 'warning' | 'error' | 'info'

function pillToneFor(status: string | null | undefined): PillTone {
  if (!status) return 'neutral'
  const value = String(status).toUpperCase()
  if (value === 'UP' || value === 'SUCCEEDED') return 'success'
  if (value === 'DEGRADED' || value === 'WARNING') return 'warning'
  if (value === 'DOWN' || value === 'FAILED') return 'error'
  if (value === 'DISABLED') return 'neutral'
  return 'info'
}

interface HealthPillProps {
  label: string
  status: ServiceHealthStatus | null | undefined
  detail?: string | null
}

function HealthPill({ label, status, detail }: HealthPillProps) {
  return (
    <span title={detail || ''}>
      <Pill tone={pillToneFor(status)}>
        <strong>{label}</strong>
        <span className="video-dashboard-pill-status">{status || '—'}</span>
      </Pill>
    </span>
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

  // Empty-vs-error : si on a une erreur ET aucune donnee chargee, on affiche
  // un etat indispo explicite plutot que "0 partout" qui ressemble a un etat normal.
  // Le proxy Vite injecte deja "Backend indisponible..." dans son message 503 ;
  // on n'ajoute pas de prefix supplementaire pour eviter le doublon.
  const feedbackItems = error
    ? [{ type: 'error' as const, message: error }]
    : []

  useEffect(() => {
    if (isLoading) return
    markAdminRouteReady('/dashboard', {
      hasError: Boolean(error),
      recentRuns: recentRuns.length,
      failedRuns: failedRuns.length,
    })
  }, [error, failedRuns.length, isLoading, recentRuns.length])

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
              <Button variant="primary" onClick={() => navigate('/tiktok')}>
                Lancer un parcours
              </Button>
              <Button
                variant="ghost"
                loading={isFetching}
                onClick={() => {
                  void refresh()
                }}
                leadingIcon={isFetching ? <Spinner size={12} label="Rafraîchissement" /> : null}
              >
                Refresh
              </Button>
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
                      <Pill tone={pillToneFor(String(r.status))}>{r.status}</Pill>
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
