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
        <div className="video-ops-shell">
          <header className="journey-page-head">
            <div className="journey-page-head-copy">
              <h1>{loading ? 'Chargement…' : (idea?.topic || `Vidéo #${id}`)}</h1>
              <p>
                Détail complet de la vidéo et actions disponibles selon son état.
              </p>
            </div>
            <div className="journey-page-head-actions">
              <button type="button" className="journey-btn is-ghost" onClick={() => navigate('/tiktok')}>
                Retour à la bibliothèque
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
            <section className="accounts-cards-grid" style={{ marginTop: 24 }}>
              <article className="accounts-card">
                <header className="accounts-card-head">
                  <strong style={{ fontSize: '1rem' }}>État du pipeline</strong>
                  <span className={`journey-status-pill ${pillClassFor(stage)}`}>{stage}</span>
                </header>
                <div className="accounts-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <KV label="ID" value={`#${idea.id}`} mono />
                  <KV label="Catégorie" value={idea.category} />
                  <KV label="Statut TikTok" value={idea.tiktokStatus} />
                  <KV label="Statut Shotstack" value={idea.shotstackStatus} />
                  <KV label="Pipeline status" value={idea.pipelineStatus} />
                  <KV label="Statut final" value={idea.finalVideoStatus} />
                  {idea.lastError ? <KV label="Dernière erreur" value={idea.lastError} /> : null}
                </div>
              </article>

              <article className="accounts-card">
                <header className="accounts-card-head">
                  <strong style={{ fontSize: '1rem' }}>Contenu généré</strong>
                </header>
                <div className="accounts-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <KV label="Topic" value={idea.topic} />
                  <KV label="Caption" value={idea.caption} />
                  <KV label="Mot-clé background" value={idea.keyword} />
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

              {idea.shotstackUrl ? (
                <article className="accounts-card" style={{ gridColumn: '1 / -1' }}>
                  <header className="accounts-card-head">
                    <strong style={{ fontSize: '1rem' }}>Vidéo rendue</strong>
                    <a
                      href={idea.shotstackUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="journey-btn is-ghost"
                      style={{ textDecoration: 'none' }}
                    >
                      Ouvrir l&apos;URL
                    </a>
                  </header>
                  <div className="accounts-card-body">
                    <video
                      src={idea.shotstackUrl}
                      controls
                      playsInline
                      style={{ width: '100%', maxHeight: '60vh', borderRadius: 10, background: '#000' }}
                    />
                  </div>
                </article>
              ) : null}

              <article className="accounts-card" style={{ gridColumn: '1 / -1' }}>
                <header className="accounts-card-head">
                  <strong style={{ fontSize: '1rem' }}>Actions disponibles</strong>
                </header>
                <div
                  className="accounts-card-body"
                  style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}
                >
                  {next ? (
                    <button
                      type="button"
                      className="journey-btn is-primary"
                      onClick={() => navigate(`/tiktok/${next.stepId}`)}
                    >
                      {next.label}
                    </button>
                  ) : (
                    <span style={{ color: 'var(--admin-text-dim)' }}>
                      Cette vidéo est déjà publiée — aucune action restante.
                    </span>
                  )}
                  <button
                    type="button"
                    className="journey-btn is-ghost"
                    onClick={() => navigate('/tiktok')}
                  >
                    Retour bibliothèque
                  </button>
                </div>
              </article>
            </section>
          ) : null}

          {!loading && !idea ? (
            <div className="accounts-empty" style={{ marginTop: 32 }}>
              Idée introuvable.
            </div>
          ) : null}
        </div>
      </AdminShell>
    </div>
  )
}
