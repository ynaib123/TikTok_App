import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

import AdminShell from '../components/AdminShell'
import { StatTile } from '../components/accounts/AccountsPresenters'
import {
  fetchVideoOpsHealth,
  fetchVideoOpsObservability,
  fetchDashboardData,
} from '../services/videoOpsSupabase'
import '../styles/features/journey.css'
import '../styles/features/accounts.css'

function pillClassFor(status) {
  if (!status) return 'is-draft'
  const value = String(status).toUpperCase()
  if (value === 'UP') return 'is-published'
  if (value === 'DEGRADED' || value === 'WARNING') return 'is-rendering'
  if (value === 'DOWN' || value === 'FAILED') return 'is-error'
  if (value === 'DISABLED') return 'is-draft'
  return 'is-ready'
}

function HealthPill({ label, status, detail }) {
  return (
    <div className={`journey-status-pill ${pillClassFor(status)}`} title={detail || ''}>
      <strong>{label}</strong>
      <span style={{ marginLeft: 8 }}>{status || '—'}</span>
    </div>
  )
}

export default function VideoDashboardPage() {
  const navigate = useNavigate()
  const [health, setHealth] = useState(null)
  const [observability, setObservability] = useState(null)
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [h, o, d] = await Promise.all([
        fetchVideoOpsHealth().catch(() => null),
        fetchVideoOpsObservability().catch(() => null),
        fetchDashboardData().catch(() => null),
      ])
      setHealth(h)
      setObservability(o)
      setDashboard(d)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadAll()
    const interval = setInterval(() => void loadAll(), 30_000)
    return () => clearInterval(interval)
  }, [loadAll])

  const recentRuns = observability?.recentRuns || dashboard?.recentRuns || []
  const failedRuns = observability?.failedRuns || []
  const stuckRuns = health?.workflows?.stuckRunsOlderThanThreshold ?? 0

  const counts = {
    total: recentRuns.length,
    succeeded: recentRuns.filter((r) => String(r.status).toUpperCase() === 'SUCCEEDED').length,
    failed: failedRuns.length,
    stuck: stuckRuns,
  }

  return (
    <div className="admin-page video-ops-page">
      <AdminShell
        activeNavId="dashboard"
        feedbackItems={[{ type: 'error', message: error }]}
      >
        <div className="video-ops-shell">
          <header className="journey-page-head">
            <div className="journey-page-head-copy">
              <h1>Dashboard</h1>
              <p>Vue d&apos;ensemble du pipeline TikTok et de la sante des services.</p>
            </div>
            <div className="journey-page-head-actions">
              <button type="button" className="journey-btn is-primary" onClick={() => navigate('/tiktok')}>
                Lancer un parcours
              </button>
              <button type="button" className="journey-btn is-ghost" onClick={() => void loadAll()} disabled={loading}>
                {loading ? 'Refresh…' : 'Refresh'}
              </button>
            </div>
          </header>

          <section className="journey-stats" aria-label="Statistiques pipeline">
            <StatTile label="Runs récents" value={counts.total} delta="10 derniers" />
            <StatTile
              label="Réussis"
              value={counts.succeeded}
              delta={counts.total ? `${Math.round((counts.succeeded / counts.total) * 100)}%` : null}
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
              delta={counts.stuck > 0 ? `> seuil (${health?.workflows?.stuckThresholdSeconds || 0}s)` : 'Aucun'}
              trend={counts.stuck > 0 ? 'warn' : null}
            />
          </section>

          <section className="accounts-cards-grid" aria-label="Sante des services" style={{ marginTop: 24 }}>
            <article className="accounts-card">
              <header className="accounts-card-head">
                <strong style={{ fontSize: '1rem' }}>Sante des services</strong>
              </header>
              <div className="accounts-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <HealthPill label="Backend" status={health?.status || (loading ? '...' : 'UNKNOWN')} detail="Etat global" />
                <HealthPill label="Postgres" status={health?.database?.status} detail={health?.database?.detail} />
                <HealthPill label="n8n" status={health?.n8n?.status} detail={health?.n8n?.detail} />
                <HealthPill label="Alerting" status={health?.alerting?.status} detail={health?.alerting?.detail} />
              </div>
            </article>

            <article className="accounts-card">
              <header className="accounts-card-head">
                <strong style={{ fontSize: '1rem' }}>Derniers runs</strong>
              </header>
              <div className="accounts-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {recentRuns.length === 0 ? (
                  <span style={{ color: 'var(--admin-text-dim)' }}>{loading ? 'Chargement…' : 'Aucun run.'}</span>
                ) : (
                  recentRuns.slice(0, 8).map((r) => (
                    <div
                      key={r.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 12px',
                        borderRadius: 8,
                        background: 'var(--admin-surface-soft)',
                        border: '1px solid var(--admin-border-soft)',
                      }}
                    >
                      <span style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                        #{r.id} {r.workflowType}
                      </span>
                      <span className={`journey-status-pill ${pillClassFor(r.status)}`}>{r.status}</span>
                    </div>
                  ))
                )}
              </div>
            </article>

            {failedRuns.length > 0 ? (
              <article className="accounts-card" style={{ gridColumn: '1 / -1' }}>
                <header className="accounts-card-head">
                  <strong style={{ fontSize: '1rem' }}>Échecs récents</strong>
                </header>
                <div className="accounts-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {failedRuns.slice(0, 6).map((r) => (
                    <div
                      key={r.id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                        padding: '8px 12px',
                        borderRadius: 8,
                        background: 'var(--admin-surface-soft)',
                        border: '1px solid var(--admin-border-soft)',
                      }}
                    >
                      <span style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                        #{r.id} {r.workflowType} (idée #{r.contentIdeaId ?? '—'})
                      </span>
                      <span style={{ color: 'var(--admin-text-dim)', fontSize: '0.85rem' }}>
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
