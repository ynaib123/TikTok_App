import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useJourney } from '../JourneyContext'
import { useRenderProgress } from '../useRenderProgress'
import { Button } from '../../../design-system'
import { VIDEO_OPS_QUERY_KEYS } from '../../../services/videoOpsQueries'
import { listAudioAssets } from '../../../services/audioApi'

type RenderState = 'idle' | 'generating' | 'ready' | 'error'
type CardStatus = 'ok' | 'warn' | 'optional' | 'error'

export default function RecapStep() {
  const p = useJourney()
  const idea = p.scriptedIdea || p.selectedGeneratedIdea
  const contentIdeaId = idea?.id ? Number(idea.id) : null

  // ── État de rendu ─────────────────────────────────────────────────────────
  const isGenerating = p.isPreparingVideo

  const persistedUrl = p.manualAction?.shotstackUrl || idea?.shotstackUrl || null
  const [progressUrl, setProgressUrl] = useState<string | null>(persistedUrl)
  const renderProgress = useRenderProgress(p.currentRenderRunId, isGenerating)

  useEffect(() => {
    if (renderProgress.outputUrl) setProgressUrl(renderProgress.outputUrl)
  }, [renderProgress.outputUrl])

  useEffect(() => {
    if (persistedUrl) setProgressUrl(persistedUrl)
  }, [persistedUrl])

  const effectiveUrl = progressUrl

  // FIX: check effectiveUrl BEFORE isGenerating — the URL can arrive while the
  // background action is still running its post-render cleanup.  As soon as the
  // URL is available we switch to 'ready' so the video player appears immediately.
  const renderState: RenderState = (() => {
    if (renderProgress.status === 'error') return 'error'
    if (effectiveUrl) return 'ready'
    if (isGenerating) return 'generating'
    return 'idle'
  })()

  const progressPct = Math.round(renderProgress.progress * 100)
  const statusLabel: Record<typeof renderProgress.status, string> = {
    queued: renderProgress.queuePosition
      ? `En file — position ${renderProgress.queuePosition}`
      : "En file d'attente…",
    preparing: 'Préparation du rendu…',
    rendering: 'Rendu des scènes…',
    'post-processing': 'Post-traitement…',
    uploading: 'Envoi sur le CDN…',
    done: 'Vidéo prête !',
    error: 'Erreur de rendu',
    cancelled: 'Rendu annulé',
    unknown: 'En attente…',
  }

  // ── Téléchargement ────────────────────────────────────────────────────────
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownload = async () => {
    if (!effectiveUrl || isDownloading) return
    setIsDownloading(true)
    try {
      const res = await fetch(effectiveUrl, { mode: 'cors' })
      if (!res.ok) throw new Error('fetch failed')
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = `tiktok-video-${idea?.id ?? Date.now()}.mp4`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)
    } catch {
      window.open(effectiveUrl, '_blank', 'noopener,noreferrer')
    } finally {
      setIsDownloading(false)
    }
  }

  // ── Audio ─────────────────────────────────────────────────────────────────
  const assetsQuery = useQuery({
    queryKey: VIDEO_OPS_QUERY_KEYS.audioAssets(contentIdeaId),
    queryFn: () => listAudioAssets(contentIdeaId as number),
    enabled: typeof contentIdeaId === 'number' && contentIdeaId > 0,
    staleTime: 30_000,
  })
  const selectedAsset = assetsQuery.data?.find((a) => a.selected) ?? null

  const sceneCount = Math.max(1, p.generationSceneCount || 1)
  const filledSlots = p.selectedSceneMediaUrls.filter((u) => Boolean(u?.trim())).length

  // ── Statuts des cartes ────────────────────────────────────────────────────
  const creationStatus: CardStatus = idea ? 'ok' : 'error'
  const audioStatus: CardStatus = selectedAsset || p.selectedTikTokSoundId ? 'ok' : 'optional'
  const mediaStatus: CardStatus =
    filledSlots === sceneCount ? 'ok' : filledSlots > 0 ? 'warn' : 'optional'
  const canGenerateVideo = Boolean(idea) && filledSlots === sceneCount
  const renderDiagnostic = {
    contentIdeaId,
    currentRenderRunId: p.currentRenderRunId,
    renderProgress,
    selectedSceneMediaUrls: p.selectedSceneMediaUrls.slice(0, sceneCount),
    sceneTextStyles: p.sceneTextStyles.slice(0, sceneCount),
    selectedAudioAsset: selectedAsset
      ? {
          id: selectedAsset.id,
          assetKind: selectedAsset.assetKind,
          storageUrl: selectedAsset.storageUrl,
          voiceId: selectedAsset.voiceId,
          voiceVolume: selectedAsset.voiceVolume,
          musicVolume: selectedAsset.musicVolume,
        }
      : null,
    selectedTikTokSoundId: p.selectedTikTokSoundId,
    templateId: p.selectedTemplateId,
    qualityProfile: p.selectedQualityProfile,
    durationSec: p.videoDurationSec,
  }

  return (
    <div className="journey-recap-layout">
      {/* ── Colonne gauche : résumé des 3 étapes ──────────────────────────── */}
      <section className="journey-recap-cards">
        {/* ─ Création ─ */}
        <RecapCard
          step={1}
          icon="📝"
          title="Création"
          status={creationStatus}
          statusLabel={creationStatus === 'ok' ? '✓ Complet' : '✕ Manquant'}
          onManage={() => p.goToStepFromRecap('creation')}
        >
          {idea ? (
            <>
              <RecapRow label="Topic" value={p.editedTopic || idea.topic || '—'} />
              <RecapRow label="Keyword" value={p.editedKeyword || idea.keyword || '—'} />
              <RecapRow label="Scènes" value={`${sceneCount} scène${sceneCount > 1 ? 's' : ''}`} />
              <RecapRow label="Caption" value={truncate(p.editedCaption || idea.caption, 80)} />
            </>
          ) : (
            <p className="journey-recap-empty">Aucune idée — retourne à l'étape Création.</p>
          )}
        </RecapCard>

        {/* ─ Audio ─ */}
        <RecapCard
          step={2}
          icon="🎙"
          title="Audio"
          status={audioStatus}
          statusLabel={audioStatus === 'ok' ? '✓ Configuré' : '— Optionnel'}
          onManage={() => p.goToStepFromRecap('audio')}
        >
          {selectedAsset ? (
            <>
              <div className="journey-recap-audio-chip">
                <span className="journey-recap-audio-chip-icon">🎙</span>
                <span className="journey-recap-audio-chip-name">
                  {selectedAsset.voiceName || selectedAsset.voiceId || 'Voix IA'}
                </span>
              </div>
              <div className="journey-recap-meta-grid">
                <div className="journey-recap-meta-item">
                  <span className="journey-recap-meta-label">Vol. voix</span>
                  <span className="journey-recap-meta-value">{selectedAsset.voiceVolume}%</span>
                </div>
                <div className="journey-recap-meta-item">
                  <span className="journey-recap-meta-label">Vol. musique</span>
                  <span className="journey-recap-meta-value">{selectedAsset.musicVolume}%</span>
                </div>
                {selectedAsset.durationMs != null && (
                  <div className="journey-recap-meta-item">
                    <span className="journey-recap-meta-label">Durée</span>
                    <span className="journey-recap-meta-value">
                      {(selectedAsset.durationMs / 1000).toFixed(1)}s
                    </span>
                  </div>
                )}
              </div>
            </>
          ) : null}

          {p.selectedTikTokSoundId ? (
            <div className="journey-recap-audio-chip">
              <span className="journey-recap-audio-chip-icon">🎵</span>
              <span className="journey-recap-audio-chip-name">Son TikTok natif</span>
              <span className="journey-recap-audio-chip-id">
                {p.selectedTikTokSoundId.slice(0, 14)}…
              </span>
            </div>
          ) : null}

          {!selectedAsset && !p.selectedTikTokSoundId && (
            <p className="journey-recap-empty">Aucun audio — la vidéo sera silencieuse.</p>
          )}
        </RecapCard>

        {/* ─ Médias ─ */}
        <RecapCard
          step={3}
          icon="🎬"
          title="Médias"
          status={mediaStatus}
          statusLabel={
            mediaStatus === 'ok'
              ? '✓ Complet'
              : mediaStatus === 'warn'
                ? `⚠ ${filledSlots}/${sceneCount} scènes`
                : '— Optionnel'
          }
          onManage={() => p.goToStepFromRecap('media')}
        >
          {filledSlots > 0 && (
            <div className="journey-recap-thumbs">
              {p.selectedSceneMediaUrls.slice(0, sceneCount).map((url, i) =>
                url?.trim() ? (
                  <div key={i} className="journey-recap-thumb">
                    <video
                      src={url}
                      muted
                      playsInline
                      preload="metadata"
                      className="journey-recap-thumb-video"
                    >
                      <track kind="captions" />
                    </video>
                    <span className="journey-recap-thumb-label">S{i + 1}</span>
                  </div>
                ) : (
                  <div key={i} className="journey-recap-thumb is-empty">
                    <span>S{i + 1}</span>
                  </div>
                ),
              )}
            </div>
          )}
          <div className="journey-recap-meta-grid">
            <div className="journey-recap-meta-item">
              <span className="journey-recap-meta-label">Template</span>
              <span className="journey-recap-meta-value">
                {templateLabel(p.selectedTemplateId)}
              </span>
            </div>
            <div className="journey-recap-meta-item">
              <span className="journey-recap-meta-label">Qualité</span>
              <span className="journey-recap-meta-value">{p.selectedQualityProfile || '—'}</span>
            </div>
            <div className="journey-recap-meta-item">
              <span className="journey-recap-meta-label">Durée</span>
              <span className="journey-recap-meta-value">{p.videoDurationSec}s</span>
            </div>
          </div>
        </RecapCard>
      </section>

      {/* ── Colonne droite : panneau génération + prévisualisation ──────────── */}
      <aside className="journey-recap-preview">
        <div className="journey-wizard-side-card is-narrow journey-recap-render-card">
          <div className="journey-recap-render-header">
            <span className="journey-wizard-card-label">Prévisualisation</span>
            {renderState === 'ready' && (
              <span className="journey-recap-ready-badge">✓ Vidéo prête</span>
            )}
          </div>

          {/* ── IDLE ──────────────────────────────────────────────────────── */}
          {renderState === 'idle' && (
            <>
              <div className="journey-recap-idle">
                <div className="journey-recap-idle-icon">🎬</div>
                <strong>Prêt à générer</strong>
                <p>Lance la génération pour créer ta vidéo TikTok avec tous tes paramètres.</p>
                <div className="journey-recap-idle-params">
                  {selectedAsset?.storageUrl && (
                    <audio src={selectedAsset.storageUrl} controls className="journey-audio-player">
                      <track kind="captions" />
                    </audio>
                  )}
                  <div className="journey-recap-param">
                    <span>📝</span>
                    <span>
                      {idea ? truncate(p.editedTopic || idea.topic, 40) : "⚠️ Pas d'idée"}
                    </span>
                  </div>
                  {selectedAsset && (
                    <div className="journey-recap-param">
                      <span>🎙</span>
                      <span>
                        {selectedAsset.voiceName || 'Voix'} · v{selectedAsset.voiceVolume}% m
                        {selectedAsset.musicVolume}%
                      </span>
                    </div>
                  )}
                  {p.selectedTikTokSoundId && (
                    <div className="journey-recap-param">
                      <span>🎵</span>
                      <span>Son TikTok sélectionné</span>
                    </div>
                  )}
                  <div className="journey-recap-param">
                    <span>🎬</span>
                    <span>
                      {filledSlots}/{sceneCount} scènes · {p.selectedQualityProfile} ·{' '}
                      {p.videoDurationSec}s
                    </span>
                  </div>
                </div>
              </div>
              <details className="journey-recap-diagnostic">
                <summary>Diagnostic rendu</summary>
                <pre>{JSON.stringify(renderDiagnostic, null, 2)}</pre>
              </details>
              <Button
                variant="primary"
                onClick={() => void p.handleRetryInitPublish()}
                disabled={p.isBusy || !canGenerateVideo}
                style={{ marginTop: 'auto' }}
              >
                🎬 Générer la vidéo
              </Button>
              {!canGenerateVideo && (
                <p className="journey-step-row-hint" style={{ textAlign: 'center', margin: 0 }}>
                  Assigne une vidéo à chaque scène avant de lancer le rendu final.
                </p>
              )}
            </>
          )}

          {/* ── GENERATING ────────────────────────────────────────────────── */}
          {renderState === 'generating' && (
            <div className="journey-recap-progress-panel">
              <div className="journey-recap-progress-icon">
                <div className="journey-recap-progress-spinner" />
              </div>
              <div className="journey-recap-progress-status">
                <strong>{statusLabel[renderProgress.status]}</strong>
                <span className="journey-recap-progress-pct">{progressPct}%</span>
              </div>
              <div className="journey-recap-progress-track">
                <div
                  className="journey-recap-progress-fill"
                  style={{ width: `${Math.max(3, progressPct)}%` }}
                />
              </div>
              <p className="journey-recap-progress-hint">
                La génération peut prendre entre 30 secondes et quelques minutes selon la qualité
                choisie.
              </p>
              <div className="journey-recap-progress-steps">
                {(['preparing', 'rendering', 'post-processing', 'uploading'] as const).map(
                  (step) => {
                    const order = ['preparing', 'rendering', 'post-processing', 'uploading']
                    const current = order.indexOf(renderProgress.status)
                    const mine = order.indexOf(step)
                    const done = current > mine
                    const active = current === mine
                    return (
                      <div
                        key={step}
                        className={`journey-recap-progress-step ${done ? 'is-done' : active ? 'is-active' : ''}`}
                      >
                        <span className="journey-recap-progress-step-dot" />
                        <span className="journey-recap-progress-step-label">
                          {statusLabel[step].replace('…', '')}
                        </span>
                      </div>
                    )
                  },
                )}
              </div>
            </div>
          )}

          {/* ── ERROR ─────────────────────────────────────────────────────── */}
          {renderState === 'error' && (
            <div className="journey-recap-error-panel">
              <span className="journey-recap-error-icon">⚠️</span>
              <strong>Erreur de génération</strong>
              <p>{renderProgress.error || "Une erreur inattendue s'est produite."}</p>
              <Button
                variant="primary"
                onClick={() => void p.handleRetryInitPublish()}
                disabled={p.isBusy || !idea}
              >
                Réessayer
              </Button>
            </div>
          )}

          {/* ── READY ─────────────────────────────────────────────────────── */}
          {renderState === 'ready' && effectiveUrl && (
            <>
              <div className="journey-recap-video-frame">
                <video
                  key={effectiveUrl}
                  src={effectiveUrl}
                  controls
                  playsInline
                  preload="metadata"
                  className="journey-recap-video"
                >
                  <track kind="captions" />
                </video>
              </div>

              <div className="journey-recap-actions">
                <Button variant="primary" onClick={p.handleValidateInitPublish} disabled={p.isBusy}>
                  🚀 Publier sur TikTok
                </Button>
                <button
                  type="button"
                  className="journey-recap-action-btn"
                  onClick={() => void handleDownload()}
                  disabled={isDownloading}
                >
                  {isDownloading ? <>⏳ Téléchargement…</> : <>⬇ Télécharger la vidéo</>}
                </button>
                <button
                  type="button"
                  className="journey-recap-action-btn is-secondary"
                  onClick={() => void p.handleRetryInitPublish()}
                  disabled={p.isBusy || !idea}
                >
                  🔄 Régénérer
                </button>
              </div>

              <div className="journey-recap-manage-group">
                <span className="journey-recap-manage-label">Modifier un paramètre :</span>
                <div className="journey-recap-manage-btns">
                  <button
                    type="button"
                    className="journey-recap-manage-chip"
                    onClick={() => p.goToStepFromRecap('creation')}
                  >
                    📝 Création
                  </button>
                  <button
                    type="button"
                    className="journey-recap-manage-chip"
                    onClick={() => p.goToStepFromRecap('audio')}
                  >
                    🎙 Audio
                  </button>
                  <button
                    type="button"
                    className="journey-recap-manage-chip"
                    onClick={() => p.goToStepFromRecap('media')}
                  >
                    🎬 Médias
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </aside>
    </div>
  )
}

/* ── Composants utilitaires ──────────────────────────────────────────────── */

function RecapCard({
  step,
  icon,
  title,
  status,
  statusLabel,
  onManage,
  children,
}: {
  step: number
  icon: string
  title: string
  status: CardStatus
  statusLabel: string
  onManage: () => void
  children: React.ReactNode
}) {
  return (
    <div className={`journey-recap-card is-${status}`}>
      <div className="journey-recap-card-step">
        <span className="journey-recap-card-stepnum">{String(step).padStart(2, '0')}</span>
      </div>
      <div className="journey-recap-card-content">
        <div className="journey-recap-card-head">
          <span className="journey-recap-card-title">
            <span className="journey-recap-card-icon">{icon}</span>
            {title}
          </span>
          <div className="journey-recap-card-badges">
            <span className={`journey-recap-status-badge is-${status}`}>{statusLabel}</span>
            <button type="button" className="journey-recap-modify-btn" onClick={onManage}>
              Modifier
            </button>
          </div>
        </div>
        <div className="journey-recap-card-body">{children}</div>
      </div>
    </div>
  )
}

function RecapRow({
  label,
  value,
  status,
}: {
  label: string
  value: string
  status?: 'ok' | 'warn' | 'empty'
}) {
  return (
    <div className="journey-recap-row">
      <span className="journey-recap-row-label">{label}</span>
      <span className={`journey-recap-row-value ${status ? `is-${status}` : ''}`}>{value}</span>
    </div>
  )
}

function truncate(value: string | null | undefined, max: number): string {
  const s = String(value || '').trim()
  if (!s) return '—'
  return s.length > max ? `${s.slice(0, max)}…` : s
}

function templateLabel(id: string | null | undefined): string {
  const map: Record<string, string> = {
    'tiktok-scene-sequence': 'Scene Sequence',
    'tiktok-pro-vertical': 'Pro Vertical',
    'tiktok-bold-story': 'Bold Story',
    'tiktok-clean-minimal': 'Clean Minimal',
  }
  return (id && map[id]) || id || '—'
}
