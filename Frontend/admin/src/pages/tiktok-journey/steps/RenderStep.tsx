import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useJourney } from '../JourneyContext'
import DataEditableCard from './DataEditableCard'
import { useRenderProgress } from '../useRenderProgress'
import { Button } from '../../../design-system'

/**
 * Step 4 — kicks off the `RENDER_TEMPLATE_VIDEO` workflow and shows a live
 * progress overlay until the rendered MP4 is ready. Also surfaces video
 * parameters (quality, duration, scene count, template) and the immutable
 * idea data on the same screen so the user can confirm before publishing.
 */
function formatEtaSeconds(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '<1s'
  const total = Math.round(seconds)
  if (total < 60) return `${total}s`
  const m = Math.floor(total / 60)
  const s = total % 60
  return s === 0 ? `${m}m` : `${m}m${s.toString().padStart(2, '0')}`
}

function KV({ label, value, mono = false }: { label: string; value: string | null | undefined; mono?: boolean }) {
  const isEmpty = !value || value === '-' || value === 'En attente'
  return (
    <div className="journey-kv-row">
      <span className="journey-kv-row-label">{label}</span>
      <span className={`journey-kv-row-value ${mono ? 'is-mono' : ''} ${isEmpty ? 'is-empty' : ''}`}>
        {value || 'En attente'}
      </span>
    </div>
  )
}

export default function RenderStep() {
  const { t } = useTranslation('journey')
  const p = useJourney()
  const [paramsTab, setParamsTab] = useState<'standard' | 'advanced'>('standard')
  const idea = p.scriptedIdea || p.selectedGeneratedIdea
  const previewUrl = p.manualAction?.shotstackUrl || idea?.shotstackUrl
  const renderEngine = idea?.renderEngine
  const isRenderActive = p.isPreparingVideo && !previewUrl
  const renderProgress = useRenderProgress(p.currentRenderRunId, isRenderActive)
  const progressPct = Math.round(renderProgress.progress * 100)
  const statusLabel: Record<typeof renderProgress.status, string> = {
    preparing: t('render.status.preparing'),
    rendering: t('render.status.rendering'),
    'post-processing': t('render.status.post-processing'),
    uploading: t('render.status.uploading'),
    done: t('render.status.done'),
    error: t('render.status.error'),
    unknown: t('render.status.unknown'),
  }

  const [nowMs, setNowMs] = useState(() => Date.now())
  useEffect(() => {
    if (!isRenderActive) return
    const interval = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [isRenderActive])

  let etaText: string | null = null
  if (isRenderActive && renderProgress.startedAt && renderProgress.progress > 0.05 && renderProgress.progress < 1) {
    const elapsedSec = Math.max(0, (nowMs - renderProgress.startedAt) / 1000)
    const remainingSec = elapsedSec * (1 - renderProgress.progress) / renderProgress.progress
    etaText = t('render.etaRemaining', { eta: formatEtaSeconds(remainingSec) })
  } else if (isRenderActive) {
    etaText = t('render.etaPending')
  }

  return (
    <div className="journey-wizard-grid is-video-stage is-render-stage">
      <aside className="journey-wizard-grid-side journey-render-side">
        <div className="journey-wizard-side-card is-narrow">
          <span className="journey-wizard-card-label">{t('render.paramsLabel')}</span>

            <div className="journey-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={paramsTab === 'standard'}
                className={`journey-tab ${paramsTab === 'standard' ? 'is-active' : ''}`}
                onClick={() => setParamsTab('standard')}
              >
                {t('tabs.standard')}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={paramsTab === 'advanced'}
                className={`journey-tab ${paramsTab === 'advanced' ? 'is-active' : ''}`}
                onClick={() => setParamsTab('advanced')}
              >
                {t('tabs.advanced')}
              </button>
            </div>

            {paramsTab === 'standard' ? (
              <div className="journey-tab-panel" role="tabpanel">
                <div className="journey-step-row-grid">
                  <div className="journey-step-row">
                    <label htmlFor="journey-quality-select">{t('render.quality')}</label>
                    <select
                      id="journey-quality-select"
                      className="journey-step-select"
                      value={p.selectedQualityProfile}
                      onChange={(event) => p.setSelectedQualityProfile(event.target.value)}
                      disabled={p.isBusy}
                    >
                      {p.qualityOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="journey-step-row">
                    <label htmlFor="journey-video-duration">{t('render.duration')}</label>
                    <input
                      id="journey-video-duration"
                      className="journey-step-select"
                      type="number"
                      min={p.minVideoDurationSec}
                      max={p.maxVideoDurationSec}
                      step={1}
                      value={p.videoDurationSec}
                      onChange={(event) => {
                        const next = Number(event.target.value)
                        if (Number.isFinite(next)) {
                          p.setVideoDurationSec(Math.min(p.maxVideoDurationSec, Math.max(p.minVideoDurationSec, next)))
                        }
                      }}
                      disabled={p.isBusy}
                    />
                  </div>
                </div>

                <div className="journey-step-row">
                  <label htmlFor="journey-render-scene-count">{t('render.sceneCount')}</label>
                  <select
                    id="journey-render-scene-count"
                    className="journey-step-select"
                    value={String(p.generationSceneCount)}
                    onChange={(event) => p.setGenerationSceneCount(Number(event.target.value))}
                    disabled={p.isBusy}
                  >
                    {p.sceneCountOptions.map((option) => (
                      <option key={option.value} value={String(option.value)}>{option.label}</option>
                    ))}
                  </select>
                  <span className="journey-step-row-hint">
                    {t('render.sceneCountHint', {
                      count: p.generationSceneCount,
                      plural: p.generationSceneCount === 1 ? '' : 's',
                      perScene: (p.videoDurationSec / Math.max(1, p.generationSceneCount)).toFixed(1),
                    })}
                  </span>
                </div>
              </div>
            ) : (
              <div className="journey-tab-panel" role="tabpanel">
                <div className="journey-step-row">
                  <label htmlFor="journey-template-select">{t('render.template')}</label>
                  <select
                    id="journey-template-select"
                    className="journey-step-select"
                    value={p.selectedTemplateId}
                    onChange={(event) => p.setSelectedTemplateId(event.target.value)}
                    disabled={p.isBusy}
                  >
                    {p.templateOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  {(() => {
                    const tpl = p.templateOptions.find((opt) => opt.value === p.selectedTemplateId)
                    return tpl?.description ? (
                      <span className="journey-step-row-hint">{tpl.description}</span>
                    ) : null
                  })()}
                </div>

                {renderEngine ? (
                  <div className="journey-step-row">
                    <label>{t('render.engine')}</label>
                    <div className="journey-kv-grid">
                      <KV label="Engine" value={renderEngine.toUpperCase()} mono />
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            <div className="journey-step-cta journey-step-cta-stack">
              {previewUrl ? (
                <>
                  <Button variant="secondary" onClick={() => void p.handleRetryInitPublish()} disabled={p.isBusy}>
                    {t('render.regenerate')}
                  </Button>
                  <Button
                    variant="primary"
                    onClick={p.handleValidateInitPublish}
                    disabled={p.isBusy}
                  >
                    {t('render.validate')}
                  </Button>
                </>
              ) : (
                <Button
                  variant="primary"
                  onClick={() => void p.handleRetryInitPublish()}
                  disabled={p.isBusy || !idea}
                >
                  {p.isPreparingVideo ? t('common.generating') : t('common.generate')}
                </Button>
              )}
            </div>
        </div>
      </aside>

      <section className="journey-render-data-panel">
        <DataEditableCard
          loading={false}
          emptyTitle={t('render.emptyTitle')}
          emptySub={t('render.emptySub')}
          readOnly
        />
      </section>

      <section className="journey-wizard-grid-main is-video-stage">
        <span className="journey-wizard-card-label">{t('render.previewLabel')}</span>
        {isRenderActive ? (
          <div className="journey-render-stage">
            <div className="journey-render-stage-frame" />
            <div className="journey-render-progress is-overlay">
              <div className="journey-render-progress-copy">
                <strong>{statusLabel[renderProgress.status]}</strong>
                <span>{progressPct}%</span>
              </div>
              <div className="journey-render-progress-track">
                <div
                  className="journey-render-progress-fill"
                  style={{ width: `${Math.max(2, progressPct)}%` }}
                />
              </div>
              <div className="journey-render-progress-foot">
                {renderProgress.status === 'error' && renderProgress.error ? (
                  <span className="journey-render-progress-error">{renderProgress.error}</span>
                ) : <span />}
                {etaText ? <span className="journey-render-progress-eta">{etaText}</span> : null}
              </div>
            </div>
          </div>
        ) : (
          <p.VideoPreview url={previewUrl} />
        )}
      </section>
    </div>
  )
}
