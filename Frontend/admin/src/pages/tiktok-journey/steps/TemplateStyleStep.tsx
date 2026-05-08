import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useJourney } from '../JourneyContext'
import DataEditableCard from './DataEditableCard'
import {
  getIdeaSceneTexts,
  normalizeSceneCount,
} from '../journeyHelpers'
import {
  searchPexelsVideos,
  type PexelsSearchResponse,
  type PexelsVideo,
} from '../../../services/videoOpsSupabase'
import { Button } from '../../../design-system'

/**
 * Step 2 — text-style picker. Three columns:
 *   1. Paramètres : grouped style controls (position / typographie / couleur)
 *   2. Données    : the script broken into scenes (read-only)
 *   3. Prévisualisation : real Pexels footage at TikTok 9:16, with the script
 *      scenes auto-cycling every ~2.5s on top so the user can preview the
 *      same overlay rhythm the renderer will produce.
 *
 * Neither the topic nor the caption are baked into the video. The topic is
 * the working title used elsewhere in the journey, the caption is the post
 * description on the TikTok feed — only the script scenes are overlaid here.
 */

const SCENE_CYCLE_MS = 2500

function pickPortraitFile(video: PexelsVideo): string | null {
  const files = video.video_files || []
  const portrait = files.filter((f) => f.height > f.width)
  portrait.sort((a, b) => Math.abs(1080 - a.width) - Math.abs(1080 - b.width))
  return (portrait[0] || files[0])?.link || null
}

const FONT_OPTIONS = [
  { value: 'Inter', label: 'Inter' },
  { value: 'Arial', label: 'Arial' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Impact', label: 'Impact' },
  { value: 'Poppins, system-ui, sans-serif', label: 'Poppins (system)' },
]

const FONT_WEIGHT_OPTIONS = [
  { value: 400, label: 'Regular' },
  { value: 600, label: 'Semibold' },
  { value: 800, label: 'Bold' },
  { value: 900, label: 'Black' },
]

const SHADOW_OPTIONS: Array<{ value: 'none' | 'soft' | 'strong'; label: string }> = [
  { value: 'none', label: 'Aucune' },
  { value: 'soft', label: 'Douce' },
  { value: 'strong', label: 'Forte' },
]

const SHADOW_CSS: Record<'none' | 'soft' | 'strong', string> = {
  none: 'none',
  soft: '0 1px 6px rgba(0, 0, 0, 0.45)',
  strong: '0 2px 16px rgba(0, 0, 0, 0.7), 0 0 4px rgba(0, 0, 0, 0.4)',
}

const DEFAULTS = {
  textX: 50,
  textY: 48,
  textColor: '#ffffff',
  fontFamily: 'Inter',
  fontSize: 36,
  fontWeight: 800,
  uppercase: true,
  shadow: 'strong' as const,
}

export default function TemplateStyleStep() {
  const { t } = useTranslation('journey')
  const p = useJourney()
  const idea = p.scriptedIdea || p.selectedGeneratedIdea
  const selectedTemplate = p.templateOptions.find((option) => option.value === p.selectedTemplateId)

  const [textX, setTextX] = useState(DEFAULTS.textX)
  const [textY, setTextY] = useState(DEFAULTS.textY)
  const [textColor, setTextColor] = useState(DEFAULTS.textColor)
  const [fontFamily, setFontFamily] = useState(DEFAULTS.fontFamily)
  const [fontSize, setFontSize] = useState(DEFAULTS.fontSize)
  const [fontWeight, setFontWeight] = useState<number>(DEFAULTS.fontWeight)
  const [uppercase, setUppercase] = useState<boolean>(DEFAULTS.uppercase)
  const [shadow, setShadow] = useState<'none' | 'soft' | 'strong'>(DEFAULTS.shadow)

  const resetDefaults = () => {
    setTextX(DEFAULTS.textX)
    setTextY(DEFAULTS.textY)
    setTextColor(DEFAULTS.textColor)
    setFontFamily(DEFAULTS.fontFamily)
    setFontSize(DEFAULTS.fontSize)
    setFontWeight(DEFAULTS.fontWeight)
    setUppercase(DEFAULTS.uppercase)
    setShadow(DEFAULTS.shadow)
  }

  // Scene texts come from the same source the render workflow consumes:
  // planned scenes when available, otherwise the script split sentence-by-
  // sentence. They are normalized to `generationSceneCount` so the preview
  // matches the count chosen in step 1.
  const sceneTexts = useMemo(() => {
    const raw = getIdeaSceneTexts(idea, p.editedScript)
    return normalizeSceneCount(raw, p.generationSceneCount).filter((scene) => scene.trim().length > 0)
  }, [idea, p.editedScript, p.generationSceneCount])

  const [activeSceneIndex, setActiveSceneIndex] = useState(0)
  useEffect(() => {
    // Reset to the first scene whenever the underlying list changes so the
    // user always lands on scene 1 after editing the script or switching ideas.
    setActiveSceneIndex(0)
  }, [sceneTexts.length, sceneTexts[0]])

  useEffect(() => {
    if (sceneTexts.length <= 1) return undefined
    const id = window.setInterval(() => {
      setActiveSceneIndex((current) => (current + 1) % sceneTexts.length)
    }, SCENE_CYCLE_MS)
    return () => window.clearInterval(id)
  }, [sceneTexts.length])

  const activeSceneText = sceneTexts[activeSceneIndex] || ''
  const previewText = activeSceneText.slice(0, 140)

  const firstSelectedScene = useMemo(
    () => p.selectedSceneMediaUrls.find((u) => Boolean(u && u.trim())) || null,
    [p.selectedSceneMediaUrls],
  )
  const previewKeyword = String(idea?.keyword || idea?.topic || p.editedKeyword || '').trim() || 'lifestyle'
  const previewQuery = useQuery<PexelsSearchResponse, Error>({
    queryKey: ['pexels-style-preview', previewKeyword],
    queryFn: () => searchPexelsVideos(previewKeyword, 5, 'portrait'),
    enabled: !firstSelectedScene && previewKeyword.length > 0,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  })
  const fetchedVideoUrl = previewQuery.data?.videos?.[0]
    ? pickPortraitFile(previewQuery.data.videos[0])
    : null
  const previewVideoUrl = firstSelectedScene || fetchedVideoUrl

  return (
    <div className="journey-wizard-grid is-template-stage">
      <aside className="journey-wizard-grid-side journey-template-side">
        <div className="journey-wizard-side-card is-narrow journey-style-card">
          <div className="journey-style-card-head">
            <span className="journey-wizard-card-label">Paramètres</span>
            <button
              type="button"
              className="journey-style-reset"
              onClick={resetDefaults}
              aria-label="Réinitialiser les paramètres"
            >
              Réinitialiser
            </button>
          </div>

          <section className="journey-style-section" aria-labelledby="style-section-position">
            <h3 id="style-section-position" className="journey-style-section-title">Position</h3>
            <div className="journey-style-row">
              <div className="journey-style-row-head">
                <label htmlFor="template-text-y">Verticale</label>
                <span className="journey-style-row-value">{textY}%</span>
              </div>
              <input
                id="template-text-y"
                type="range"
                min={6}
                max={94}
                value={textY}
                onChange={(e) => setTextY(Number(e.target.value))}
              />
            </div>
            <div className="journey-style-row">
              <div className="journey-style-row-head">
                <label htmlFor="template-text-x">Horizontale</label>
                <span className="journey-style-row-value">{textX}%</span>
              </div>
              <input
                id="template-text-x"
                type="range"
                min={6}
                max={94}
                value={textX}
                onChange={(e) => setTextX(Number(e.target.value))}
              />
            </div>
          </section>

          <section className="journey-style-section" aria-labelledby="style-section-typo">
            <h3 id="style-section-typo" className="journey-style-section-title">Typographie</h3>
            <div className="journey-style-row">
              <div className="journey-style-row-head">
                <label htmlFor="template-text-size">Taille</label>
                <span className="journey-style-row-value">{fontSize}px</span>
              </div>
              <input
                id="template-text-size"
                type="range"
                min={14}
                max={80}
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
              />
            </div>
            <div className="journey-style-grid-2">
              <div className="journey-style-row">
                <label htmlFor="template-font">Police</label>
                <select
                  id="template-font"
                  className="journey-step-select"
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value)}
                >
                  {FONT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div className="journey-style-row">
                <label htmlFor="template-font-weight">Graisse</label>
                <select
                  id="template-font-weight"
                  className="journey-step-select"
                  value={fontWeight}
                  onChange={(e) => setFontWeight(Number(e.target.value))}
                >
                  {FONT_WEIGHT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <label className="journey-style-toggle">
              <input
                type="checkbox"
                checked={uppercase}
                onChange={(e) => setUppercase(e.target.checked)}
              />
              <span>Majuscules</span>
            </label>
          </section>

          <section className="journey-style-section" aria-labelledby="style-section-color">
            <h3 id="style-section-color" className="journey-style-section-title">Apparence</h3>
            <div className="journey-style-row">
              <div className="journey-style-row-head">
                <label htmlFor="template-text-color">Couleur du texte</label>
                <span className="journey-style-color-value">{textColor.toUpperCase()}</span>
              </div>
              <div className="journey-style-color-pair">
                <input
                  id="template-text-color"
                  className="journey-color-input"
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                />
                <input
                  type="text"
                  className="journey-step-select journey-style-color-hex"
                  value={textColor}
                  onChange={(e) => {
                    const next = e.target.value.trim()
                    if (/^#[0-9a-fA-F]{0,6}$/.test(next) || next === '') setTextColor(next)
                  }}
                  maxLength={7}
                  spellCheck={false}
                  aria-label="Couleur hexadécimale"
                />
              </div>
            </div>
            <div className="journey-style-row">
              <label>Ombre du texte</label>
              <div className="journey-style-segmented" role="radiogroup" aria-label="Ombre du texte">
                {SHADOW_OPTIONS.map((option) => {
                  const active = option.value === shadow
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      className={`journey-style-segmented-item ${active ? 'is-active' : ''}`}
                      onClick={() => setShadow(option.value)}
                    >
                      {option.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </section>

          <div className="journey-step-cta journey-step-cta-stack">
            <Button
              variant="primary"
              onClick={p.handleValidateTemplate}
              disabled={p.isBusy || !idea || !p.selectedTemplateId}
            >
              {t('common.next')}
            </Button>
          </div>
        </div>
      </aside>

      <section className="journey-template-data-panel">
        <DataEditableCard
          loading={false}
          emptyTitle={t('render.emptyTitle')}
          emptySub={t('render.emptySub')}
          readOnly
          scenesOnly
        />
      </section>

      <section className="journey-template-stage">
        <div className="journey-template-head">
          <span className="journey-wizard-card-label">{t('templateStyle.previewLabel')}</span>
          <span className="journey-step-row-hint">
            {selectedTemplate?.label || t('templateStyle.selectTemplate')}
          </span>
        </div>
        <div className={`journey-template-preview-frame is-${p.selectedTemplateId}`}>
          {previewVideoUrl ? (
            <video
              key={previewVideoUrl}
              src={previewVideoUrl}
              className="journey-template-preview-video"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
            />
          ) : (
            <div className="journey-template-preview-fallback" aria-hidden="true">
              {previewQuery.isFetching ? (
                <div className="journey-template-preview-fallback-spinner" />
              ) : null}
            </div>
          )}
          {sceneTexts.length > 1 ? (
            <span className="journey-template-preview-counter" aria-live="polite">
              Scène {activeSceneIndex + 1} / {sceneTexts.length}
            </span>
          ) : null}
          <div
            className="journey-template-preview-text"
            style={{
              left: `${textX}%`,
              top: `${textY}%`,
              color: textColor,
              fontFamily,
              textShadow: SHADOW_CSS[shadow],
            }}
            key={activeSceneIndex}
          >
            <strong
              style={{
                fontSize: `${fontSize}px`,
                lineHeight: 1.1,
                fontWeight,
                textTransform: uppercase ? 'uppercase' : 'none',
              }}
            >
              {previewText || '—'}
            </strong>
          </div>
        </div>
      </section>
    </div>
  )
}
