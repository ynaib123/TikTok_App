import { useEffect, useState, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import AdminShell from '../components/AdminShell'
import { fetchContentIdeaStatus, fetchContentIdeaByIdFromPages } from '../services/videoOpsSupabase'
import { readJourneyWorkspace } from './tiktok-journey/journeyWorkspace'
import '../styles/features/journey.css'
import '../styles/features/accounts.css'
import '../styles/features/idea-detail.css'

interface IdeaDetail {
  id?: number
  topic?: string | null
  caption?: string | null
  keyword?: string | null
  script?: string | null
  scripts?: string | null
  category?: string | null
  targetAccount?: string | null
  createdAt?: string | null
  updatedAt?: string | null
  duration?: string | number | null
  format?: string | null
  renderId?: string | null
  shotstackUrl?: string | null
  uploadUrl?: string | null
  tiktokStatus?: string | null
  pipelineStatus?: string | null
  logs?: PipelineLog[]
  pipelineSteps?: PipelineStep[]
}

interface PipelineLog {
  level?: string
  time?: string
  tag?: string
  message?: string
}

interface PipelineStep {
  title?: string
  name?: string
  detail?: string
  when?: string
  status?: string
}

interface StatusInfo {
  pipelineStage?: string
  logs?: PipelineLog[]
  pipelineSteps?: PipelineStep[]
}

function pillClassFor(stage: string | null | undefined): string {
  const s = String(stage || '').toUpperCase()
  if (s === 'PUBLISHED' || s === 'UPLOAD_COMPLETED') return 'is-published'
  if (s === 'RENDER_READY' || s === 'PUBLISH_INITIALIZED') return 'is-ready'
  if (s === 'RENDERING_REQUESTED' || s === 'UPLOAD_PREPARING') return 'is-rendering'
  if (s === 'FAILED') return 'is-error'
  return 'is-draft'
}

interface NextStep {
  stepId: string
  label: string
}

function nextStepFor(idea: IdeaDetail | null, statusInfo: StatusInfo | null): NextStep | null {
  const stage = String(statusInfo?.pipelineStage || '').toUpperCase()
  const tiktokStatus = String(idea?.tiktokStatus || '').toLowerCase()
  if (tiktokStatus === 'published') return null
  const savedWorkspace = idea?.id ? readJourneyWorkspace(idea.id) : null
  if (savedWorkspace?.stepId)
    return { stepId: savedWorkspace.stepId, label: 'Reprendre le parcours' }
  if (idea?.uploadUrl && idea?.shotstackUrl)
    return { stepId: 'upload', label: "Continuer vers l'upload" }
  if (idea?.shotstackUrl) return { stepId: 'upload', label: "Préparer l'upload TikTok" }
  if (stage === 'SCRIPT_READY' || idea?.script || idea?.scripts)
    return { stepId: 'recapitulatif', label: 'Générer la vidéo' }
  if (stage === 'IDEA_CREATED' || idea?.topic)
    return { stepId: 'media', label: 'Continuer le parcours' }
  return { stepId: 'creation', label: 'Reprendre dans le parcours' }
}

const TABS = [
  { id: 'overview', label: 'Aperçu' },
  { id: 'caption', label: 'Caption' },
  { id: 'pipeline', label: 'Pipeline' },
  { id: 'logs', label: 'Logs' },
] as const

type TabId = (typeof TABS)[number]['id']

export default function IdeaDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const ideaId = Number(id)
  const ideaIdInvalid = !ideaId
  const [idea, setIdea] = useState<IdeaDetail | null>(null)
  const [statusInfo, setStatusInfo] = useState<StatusInfo | null>(null)
  const [loading, setLoading] = useState(!ideaIdInvalid)
  const [error, setError] = useState<string | null>(ideaIdInvalid ? 'Identifiant invalide.' : null)
  const [tab, setTab] = useState<TabId>('overview')

  useEffect(() => {
    if (ideaIdInvalid) return undefined
    let cancelled = false
    const load = async () => {
      try {
        const [ideaResult, statusResult] = await Promise.all([
          fetchContentIdeaByIdFromPages(ideaId).catch(() => null),
          fetchContentIdeaStatus(ideaId).catch(() => null),
        ])
        if (cancelled) return
        setIdea(ideaResult as IdeaDetail | null)
        setStatusInfo(statusResult as StatusInfo | null)
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
  const caption = idea?.caption || ''
  const captionLen = caption.length
  const hashtags = caption.match(/#[\p{L}0-9_]+/gu) || []
  const logs: PipelineLog[] = statusInfo?.logs || idea?.logs || []
  const steps: PipelineStep[] = statusInfo?.pipelineSteps || idea?.pipelineSteps || []

  return (
    <div className="admin-page video-ops-page">
      <AdminShell activeNavId="tiktok" feedbackItems={[{ type: 'error', message: error }]}>
        <div className="idea-detail-page">
          <nav className="idea-crumb" aria-label="Fil d'ariane">
            <button type="button" onClick={() => navigate('/tiktok')}>
              Parcours TikTok
            </button>
            <span className="idea-crumb-sep">/</span>
            <button type="button" onClick={() => navigate('/tiktok')}>
              Idées
            </button>
            <span className="idea-crumb-sep">/</span>
            <span>#{ideaId || '—'}</span>
          </nav>

          <header className="idea-head">
            <div className="idea-head-left">
              <span className="idea-id-mono">idea_{ideaId}</span>
              <h1>{loading ? 'Chargement…' : idea?.topic || `Vidéo #${id}`}</h1>
              <div className="idea-head-meta">
                {idea?.targetAccount && (
                  <span>
                    <strong>Compte</strong> · {idea.targetAccount}
                  </span>
                )}
                {idea?.category && (
                  <span>
                    <strong>Catégorie</strong> · {idea.category}
                  </span>
                )}
                {idea?.createdAt && (
                  <span>
                    <strong>Créée</strong> · {new Date(idea.createdAt).toLocaleString('fr-FR')}
                  </span>
                )}
                {idea?.updatedAt && (
                  <span>
                    <strong>MàJ</strong> · {new Date(idea.updatedAt).toLocaleString('fr-FR')}
                  </span>
                )}
              </div>
            </div>
            <div className="idea-head-actions">
              <span className={`journey-status-pill ${pillClassFor(stage)}`}>{stage}</span>
              <button
                type="button"
                className="journey-btn is-ghost"
                onClick={() => navigate('/tiktok')}
              >
                Retour
              </button>
              {next && (
                <button
                  type="button"
                  className="journey-btn is-primary"
                  disabled={loading || !idea}
                  onClick={() =>
                    navigate(`/tiktok/${next.stepId}`, {
                      state: idea?.id ? { resumeWorkspaceIdeaId: idea.id } : undefined,
                    })
                  }
                >
                  {next.label}
                </button>
              )}
            </div>
          </header>

          <div className="idea-tabs" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                className={`idea-tab ${tab === t.id ? 'is-active' : ''}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="idea-meta-strip">
            <div className="idea-meta-cell">
              <div className="idea-meta-label">Durée</div>
              <div className="idea-meta-val">{idea?.duration || '—'}</div>
            </div>
            <div className="idea-meta-cell">
              <div className="idea-meta-label">Format</div>
              <div className="idea-meta-val">{idea?.format || '9:16 · 1080p'}</div>
            </div>
            <div className="idea-meta-cell">
              <div className="idea-meta-label">Render ID</div>
              <div className="idea-meta-val is-mono">{idea?.renderId || '—'}</div>
            </div>
            <div className="idea-meta-cell">
              <div className="idea-meta-label">Stage</div>
              <div className="idea-meta-val is-mono">{stage}</div>
            </div>
          </div>

          {!loading && idea && tab === 'overview' && (
            <section className="idea-grid-2">
              <aside>
                <div className="idea-video-card">
                  {idea.shotstackUrl ? (
                    <video src={idea.shotstackUrl} controls playsInline className="idea-video">
                      <track kind="captions" />
                    </video>
                  ) : (
                    <div className="idea-video-frame">
                      <div className="idea-video-empty">Vidéo non rendue</div>
                    </div>
                  )}
                  <div className="idea-video-actions">
                    {idea.shotstackUrl && (
                      <a
                        href={idea.shotstackUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="journey-btn"
                      >
                        Ouvrir la video
                      </a>
                    )}
                    {idea.uploadUrl && (
                      <a
                        href={idea.uploadUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="journey-btn"
                      >
                        Télécharger MP4
                      </a>
                    )}
                  </div>
                </div>
              </aside>

              <div className="idea-right">
                <section>
                  <div className="idea-sec-head">
                    <h2>Contenu généré</h2>
                  </div>
                  <div className="journey-kv-row">
                    <span className="journey-kv-row-label">Topic</span>
                    <span className={`journey-kv-row-value ${!idea.topic ? 'is-empty' : ''}`}>
                      {idea.topic || 'En attente'}
                    </span>
                  </div>
                  <div className="journey-kv-row">
                    <span className="journey-kv-row-label">Mot-clé</span>
                    <span
                      className={`journey-kv-row-value is-mono ${!idea.keyword ? 'is-empty' : ''}`}
                    >
                      {idea.keyword || 'En attente'}
                    </span>
                  </div>
                  <div className="journey-kv-row">
                    <span className="journey-kv-row-label">Caption</span>
                    <span className={`journey-kv-row-value ${!idea.caption ? 'is-empty' : ''}`}>
                      {idea.caption || 'En attente'}
                    </span>
                  </div>
                  {(idea.script || idea.scripts) && (
                    <div
                      className="journey-kv-row"
                      style={{ alignItems: 'flex-start', flexDirection: 'column', gap: 4 }}
                    >
                      <span className="journey-kv-row-label">Script</span>
                      <span className="journey-kv-row-value" style={{ whiteSpace: 'pre-wrap' }}>
                        {idea.script || idea.scripts}
                      </span>
                    </div>
                  )}
                </section>

                {next && (
                  <section className="idea-next-strip">
                    <div className="idea-next-copy">
                      <span className="idea-next-title">{next.label}</span>
                      <span className="idea-next-desc">
                        Continue dans le parcours pour faire avancer cette idée.
                      </span>
                    </div>
                    <button
                      className="journey-btn is-primary"
                      onClick={() =>
                        navigate(`/tiktok/${next.stepId}`, {
                          state: idea?.id ? { resumeWorkspaceIdeaId: idea.id } : undefined,
                        })
                      }
                    >
                      Continuer →
                    </button>
                  </section>
                )}
              </div>
            </section>
          )}

          {!loading && idea && tab === 'caption' && (
            <div className="idea-caption-card">
              <div className="idea-caption-head">
                <span>Caption · {captionLen} caractères</span>
                <span>Hashtags · {hashtags.length}</span>
              </div>
              <div className="idea-caption-body">{caption || 'Aucune caption générée.'}</div>
              {hashtags.length > 0 && (
                <div className="idea-caption-tags">
                  {hashtags.map((h, i) => (
                    <span key={i} className={`idea-tag ${i === 0 ? 'is-warm' : ''}`}>
                      {h}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {!loading && idea && tab === 'pipeline' && (
            <div className="idea-timeline">
              {(steps.length > 0 ? steps : [{ title: stage, status: 'current' }]).map((s, i) => (
                <div key={i} className={`idea-step is-${s.status || 'done'}`}>
                  <div>
                    <h3 className="idea-step-title">{s.title || s.name}</h3>
                    {s.detail && <div className="idea-step-meta">{s.detail}</div>}
                  </div>
                  <div className="idea-step-when">{s.when || '—'}</div>
                </div>
              ))}
            </div>
          )}

          {!loading && idea && tab === 'logs' && (
            <div className="idea-logs">
              {logs.length === 0 ? (
                <div className="idea-log">
                  <span className="t">—</span>
                  <span>Aucun log disponible.</span>
                </div>
              ) : (
                logs.map((l, i) => (
                  <div key={i} className={`idea-log is-${l.level || 'info'}`}>
                    <span className="t">{l.time}</span>
                    <span className="lvl">{l.tag}</span>
                    <span>{l.message}</span>
                  </div>
                ))
              )}
            </div>
          )}

          {!loading && !idea && (
            <div className="accounts-empty" style={{ marginTop: 16 }}>
              Idée introuvable.
            </div>
          )}
        </div>
      </AdminShell>
    </div>
  )
}
