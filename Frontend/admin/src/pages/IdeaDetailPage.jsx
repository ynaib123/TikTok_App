import { useEffect, useState, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import AdminShell from '../components/AdminShell'
import { fetchContentIdeaStatus, fetchContentIdeaByIdFromPages } from '../services/videoOpsSupabase'
import '../styles/features/journey.css'
import '../styles/features/accounts.css'

function pillClassFor(stage) {
  const s = String(stage || '').toUpperCase()
  if (s === 'PUBLISHED' || s === 'UPLOAD_COMPLETED') return 'is-published'
  if (s === 'RENDER_READY' || s === 'PUBLISH_INITIALIZED') return 'is-ready'
  if (s === 'RENDERING_REQUESTED' || s === 'UPLOAD_PREPARING') return 'is-rendering'
  if (s === 'FAILED') return 'is-error'
  return 'is-draft'
}

function nextStepFor(idea, statusInfo) {
  const stage = String(statusInfo?.pipelineStage || '').toUpperCase()
  const tiktokStatus = String(idea?.tiktokStatus || '').toLowerCase()

  if (tiktokStatus === 'published') return null
  if (idea?.uploadUrl && idea?.shotstackUrl) {
    return { stepId: 'upload', label: 'Continuer vers l\'upload' }
  }
  if (idea?.shotstackUrl) {
    return { stepId: 'upload', label: 'Préparer l\'upload TikTok' }
  }
  if (stage === 'SCRIPT_READY' || idea?.script || idea?.scripts) {
    return { stepId: 'init-publish', label: 'Générer la vidéo' }
  }
  if (stage === 'IDEA_CREATED' || idea?.topic) {
    return { stepId: 'init-publish', label: 'Continuer (générer la vidéo)' }
  }
  return { stepId: 'creation', label: 'Reprendre dans le parcours' }
}

function KV({ label, value, mono = false }) {
  const isEmpty = !value || value === '-'
  return (
    <div className="journey-kv-row">
      <span className="journey-kv-row-label">{label}</span>
      <span className={`journey-kv-row-value ${mono ? 'is-mono' : ''} ${isEmpty ? 'is-empty' : ''}`}>
        {value || 'En attente'}
      </span>
    </div>
  )
}

export default function IdeaDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const ideaId = Number(id)
  const ideaIdInvalid = !ideaId
  const [idea, setIdea] = useState(null)
  const [statusInfo, setStatusInfo] = useState(null)
  const [loading, setLoading] = useState(!ideaIdInvalid)
  const [error, setError] = useState(ideaIdInvalid ? 'Identifiant invalide.' : null)

  useEffect(() => {
    if (ideaIdInvalid) {
      return undefined
    }
    let cancelled = false
    const load = async () => {
      try {
        const [ideaResult, statusResult] = await Promise.all([
          fetchContentIdeaByIdFromPages(ideaId).catch(() => null),
          fetchContentIdeaStatus(ideaId).catch(() => null),
        ])
        if (cancelled) return
        setIdea(ideaResult)
        setStatusInfo(statusResult)
      } catch (caught) {
        if (cancelled) return
        setError(caught instanceof Error ? caught.message : String(caught))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [ideaId, ideaIdInvalid])

  const next = useMemo(() => (idea ? nextStepFor(idea, statusInfo) : null), [idea, statusInfo])
  const stage = statusInfo?.pipelineStage || idea?.pipelineStatus || 'IDEA_CREATED'

  return (
    <div className="admin-page video-ops-page">
      <AdminShell
        activeNavId="tiktok"
        feedbackItems={[{ type: 'error', message: error }]}
      >
        <div
          className="video-ops-shell"
          style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '12px 16px', gap: 10 }}
        >
          <header
            className="journey-page-head"
            style={{ marginBottom: 0, paddingBottom: 0, borderBottom: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
              <h1 style={{ margin: 0, fontSize: '1.1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {loading ? 'Chargement…' : (idea?.topic || `Vidéo #${id}`)}
              </h1>
              <span className={`journey-status-pill ${pillClassFor(stage)}`}>{stage}</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="journey-btn is-ghost" onClick={() => navigate('/tiktok')}>
                Retour
              </button>
              {next ? (
                <button
                  type="button"
                  className="journey-btn is-primary"
                  onClick={() => navigate(`/tiktok/${next.stepId}`)}
                  disabled={loading || !idea}
                >
                  {next.label}
                </button>
              ) : null}
            </div>
          </header>

          {!loading && idea ? (
            <section
              style={{
                flex: 1,
                minHeight: 0,
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
                gap: 12,
              }}
            >
              <article
                className="accounts-card"
                style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}
              >
                <header className="accounts-card-head" style={{ padding: '8px 12px' }}>
                  <strong style={{ fontSize: '0.95rem' }}>Contenu généré</strong>
                </header>
                <div
                  className="accounts-card-body"
                  style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '10px 12px', flex: 1, minHeight: 0, overflow: 'auto' }}
                >
                  <KV label="Topic" value={idea.topic} />
                  <KV label="Caption" value={idea.caption} />
                  <KV label="Mot-clé" value={idea.keyword} />
                  {(idea.script || idea.scripts) ? (
                    <div className="journey-kv-row" style={{ alignItems: 'flex-start', flexDirection: 'column', gap: 4 }}>
                      <span className="journey-kv-row-label">Script</span>
                      <span className="journey-kv-row-value" style={{ whiteSpace: 'pre-wrap' }}>
                        {idea.script || idea.scripts}
                      </span>
                    </div>
                  ) : null}
                </div>
              </article>

              <article
                className="accounts-card"
                style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}
              >
                <header className="accounts-card-head" style={{ padding: '8px 12px' }}>
                  <strong style={{ fontSize: '0.95rem' }}>Vidéo</strong>
                  {idea.shotstackUrl ? (
                    <a
                      href={idea.shotstackUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="journey-btn is-ghost"
                      style={{ textDecoration: 'none', padding: '4px 10px' }}
                    >
                      Ouvrir
                    </a>
                  ) : null}
                </header>
                <div
                  className="accounts-card-body"
                  style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 10, flex: 1, minHeight: 0 }}
                >
                  {idea.shotstackUrl ? (
                    <video
                      src={idea.shotstackUrl}
                      controls
                      playsInline
                      style={{ width: '100%', flex: 1, minHeight: 0, borderRadius: 10, background: '#000', objectFit: 'contain' }}
                    />
                  ) : (
                    <div
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--admin-text-dim)',
                        background: 'rgba(0,0,0,0.2)',
                        borderRadius: 10,
                      }}
                    >
                      Vidéo non rendue
                    </div>
                  )}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {next ? (
                      <button
                        type="button"
                        className="journey-btn is-primary"
                        onClick={() => navigate(`/tiktok/${next.stepId}`)}
                      >
                        {next.label}
                      </button>
                    ) : (
                      <span style={{ color: 'var(--admin-text-dim)', fontSize: '0.9rem' }}>
                        Vidéo publiée — aucune action restante.
                      </span>
                    )}
                  </div>
                </div>
              </article>
            </section>
          ) : null}

          {!loading && !idea ? (
            <div className="accounts-empty" style={{ marginTop: 16 }}>
              Idée introuvable.
            </div>
          ) : null}
        </div>
      </AdminShell>
    </div>
  )
}
