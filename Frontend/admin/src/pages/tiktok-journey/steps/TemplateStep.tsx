import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useJourney } from '../JourneyContext'
import {
  searchPexelsVideos,
  type PexelsSearchResponse,
  type PexelsVideo,
} from '../../../services/videoOpsSupabase'
import { VIDEO_OPS_QUERY_KEYS } from '../../../services/videoOpsQueries'
import { getIdeaSceneTexts, normalizeSceneCount } from '../journeyHelpers'
import { useRenderProgress } from '../useRenderProgress'
import type { SceneTextStyle } from '../types'
import { Button } from '../../../design-system'
import { PexelsGallerySkeleton } from './PexelsSkeleton'
import { PexelsGalleryGrid } from './PexelsGalleryGrid'

/**
 * Step 2 Ã¢â‚¬â€ merged Template + MÃƒÂ©dias.
 *
 *   Left   : grouped style controls (position / typography / appearance).
 *            Suivant button at the bottom.
 *   Middle : Pexels keyword search + gallery (2 cards per row) and a compact
 *            scene strip showing which slot is currently being filled.
 *   Right  : TikTok 9:16 carousel previewing each scene paired with the
 *            assigned video, the matching scene text, and the live style
 *            settings from the left panel. Prev / next arrows + dot
 *            indicators stay in sync with the active slot.
 *
 * The carousel doubles as the scene navigator Ã¢â‚¬â€ picking a scene in the
 * carousel is the same as picking it in the strip; clicking a Pexels tile
 * fills that scene and advances to the next one.
 */

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

const STYLE_DEFAULTS = {
  textX: 50,
  textY: 48,
  textColor: '#ffffff',
  fontFamily: 'Inter',
  fontSize: 36,
  fontWeight: 800,
  uppercase: true,
  shadow: 'strong' as const,
}

function createDefaultSceneStyle(saved = false): SceneTextStyle {
  return { ...STYLE_DEFAULTS, saved }
}

function normalizeSceneStyle(value: unknown): SceneTextStyle {
  const raw = value && typeof value === 'object' ? value as Partial<SceneTextStyle> : {}
  return {
    textX: Number.isFinite(Number(raw.textX)) ? Math.min(94, Math.max(6, Number(raw.textX))) : STYLE_DEFAULTS.textX,
    textY: Number.isFinite(Number(raw.textY)) ? Math.min(94, Math.max(6, Number(raw.textY))) : STYLE_DEFAULTS.textY,
    textColor: typeof raw.textColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(raw.textColor) ? raw.textColor : STYLE_DEFAULTS.textColor,
    fontFamily: typeof raw.fontFamily === 'string' && raw.fontFamily.trim() ? raw.fontFamily : STYLE_DEFAULTS.fontFamily,
    fontSize: Number.isFinite(Number(raw.fontSize)) ? Math.min(80, Math.max(14, Number(raw.fontSize))) : STYLE_DEFAULTS.fontSize,
    fontWeight: Number.isFinite(Number(raw.fontWeight)) ? Number(raw.fontWeight) : STYLE_DEFAULTS.fontWeight,
    uppercase: typeof raw.uppercase === 'boolean' ? raw.uppercase : STYLE_DEFAULTS.uppercase,
    shadow: raw.shadow === 'none' || raw.shadow === 'soft' || raw.shadow === 'strong' ? raw.shadow : STYLE_DEFAULTS.shadow,
    saved: Boolean(raw.saved),
  }
}

// Pause + detach src on a <video>, aborting any in-flight metadata fetch.
function releaseVideoElement(video: HTMLVideoElement | null) {
  if (!video) return
  try {
    video.pause()
    video.removeAttribute('src')
    video.load()
  } catch {
    // best-effort cleanup
  }
}

function pickPortraitFile(video: PexelsVideo): string | null {
  const files = video.video_files || []
  const portrait = files.filter((f) => f.height > f.width)
  portrait.sort((a, b) => Math.abs(1080 - a.width) - Math.abs(1080 - b.width))
  return (portrait[0] || files[0])?.link || null
}

export default function TemplateStep() {
  const { t } = useTranslation('journey')
  const p = useJourney()
  const idea = p.scriptedIdea || p.selectedGeneratedIdea
  const sceneCount = Math.max(1, Math.min(10, p.generationSceneCount || 1))
  const previewUrl = p.manualAction?.shotstackUrl || idea?.shotstackUrl
  const isRenderActive = p.isPreparingVideo && !previewUrl
  const renderProgress = useRenderProgress(p.currentRenderRunId, isRenderActive)
  const [renderOutputUrl, setRenderOutputUrl] = useState<string>('')
  useEffect(() => {
    if (renderProgress.outputUrl) setRenderOutputUrl(renderProgress.outputUrl)
  }, [renderProgress.outputUrl])
  const effectivePreviewUrl = previewUrl || renderOutputUrl || ''
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

  // ----- Style controls (live-bound to the carousel preview overlay) -------
  const [textX, setTextX] = useState(STYLE_DEFAULTS.textX)
  const [textY, setTextY] = useState(STYLE_DEFAULTS.textY)
  const [textColor, setTextColor] = useState(STYLE_DEFAULTS.textColor)
  const [fontFamily, setFontFamily] = useState(STYLE_DEFAULTS.fontFamily)
  const [fontSize, setFontSize] = useState(STYLE_DEFAULTS.fontSize)
  const [fontWeight, setFontWeight] = useState<number>(STYLE_DEFAULTS.fontWeight)
  const [uppercase, setUppercase] = useState<boolean>(STYLE_DEFAULTS.uppercase)
  const [shadow, setShadow] = useState<'none' | 'soft' | 'strong'>(STYLE_DEFAULTS.shadow)

  const applyStyleToControls = useCallback((style: SceneTextStyle) => {
    setTextX(style.textX)
    setTextY(style.textY)
    setTextColor(style.textColor)
    setFontFamily(style.fontFamily)
    setFontSize(style.fontSize)
    setFontWeight(style.fontWeight)
    setUppercase(style.uppercase)
    setShadow(style.shadow)
  }, [])

  const resetStyleDefaults = () => {
    applyStyleToControls(createDefaultSceneStyle(false))
  }

  // ----- Scene state --------------------------------------------------------
  useEffect(() => {
    p.setSelectedSceneMediaUrls((current) => {
      const next = current.slice(0, sceneCount)
      while (next.length < sceneCount) next.push('')
      return next
    })
    p.setSceneTextStyles((current) => {
      const next = current.slice(0, sceneCount).map(normalizeSceneStyle)
      while (next.length < sceneCount) next.push(createDefaultSceneStyle(false))
      return next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneCount])

  const [activeSlot, setActiveSlot] = useState<number>(0)
  useEffect(() => {
    if (activeSlot >= sceneCount) setActiveSlot(Math.max(0, sceneCount - 1))
  }, [sceneCount, activeSlot])

  useEffect(() => {
    applyStyleToControls(normalizeSceneStyle(p.sceneTextStyles[activeSlot]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSlot])

  // ----- Pexels search ------------------------------------------------------
  const defaultQuery = String(idea?.keyword || idea?.topic || p.editedKeyword || '').trim() || 'lifestyle'
  const [query, setQuery] = useState<string>(defaultQuery)
  const [committedQuery, setCommittedQuery] = useState<string>(defaultQuery)
  useEffect(() => {
    setQuery(defaultQuery)
    setCommittedQuery(defaultQuery)
  }, [defaultQuery])

  const queryClient = useQueryClient()
  const trimmedCommittedQuery = committedQuery.trim()
  const pexelsQuery = useQuery<PexelsSearchResponse, Error>({
    queryKey: VIDEO_OPS_QUERY_KEYS.pexelsVideos(trimmedCommittedQuery, 'portrait', 18),
    queryFn: () => searchPexelsVideos(trimmedCommittedQuery, 18, 'portrait'),
    enabled: trimmedCommittedQuery.length > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    placeholderData: () => {
      const cached = p.pexelsCache
      if (cached && cached.query === trimmedCommittedQuery && Array.isArray(cached.videos)) {
        return { videos: cached.videos as PexelsVideo[] }
      }
      return undefined
    },
    retry: 1,
  })

  const videos = pexelsQuery.data?.videos ?? []
  const isSearching = pexelsQuery.isFetching
  const searchError = pexelsQuery.isError ? (pexelsQuery.error?.message || 'Recherche ÃƒÂ©chouÃƒÂ©e') : null

  // Mirror the React Query result into the global flow state for workspace
  // save / leave / resume.
  useEffect(() => {
    if (!pexelsQuery.data) return
    p.setPexelsCache({ query: trimmedCommittedQuery, videos: pexelsQuery.data.videos })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pexelsQuery.data, trimmedCommittedQuery])

  // Track every <video> currently rendered in the gallery so we can pause and
  // release them when the search switches or the step unmounts. The ref
  // callback is memoized (stable identity) so that PexelsGalleryGrid's React
  // .memo doesn't trip on a new function on every parent render.
  const videoRefs = useRef<Set<HTMLVideoElement>>(new Set())
  const registerVideoRef = useCallback((node: HTMLVideoElement | null) => {
    if (!node) return
    videoRefs.current.add(node)
  }, [])
  useEffect(() => {
    return () => {
      videoRefs.current.forEach(releaseVideoElement)
      videoRefs.current = new Set()
    }
  }, [videos])
  useEffect(() => () => {
    videoRefs.current.forEach(releaseVideoElement)
    videoRefs.current.clear()
  }, [])

  const submitSearch = (q: string) => {
    const trimmed = q.trim()
    if (!trimmed) return
    if (trimmed === trimmedCommittedQuery) {
      void queryClient.invalidateQueries({ queryKey: VIDEO_OPS_QUERY_KEYS.pexelsVideos(trimmed, 'portrait', 18) })
      return
    }
    setCommittedQuery(trimmed)
  }

  // ----- Slot assignment helpers -------------------------------------------
  // useCallback so PexelsGalleryGrid (React.memo) doesn't re-render every time
  // a style slider moves Ã¢â‚¬â€ its props stay referentially stable.
  const setSelectedSceneMediaUrls = p.setSelectedSceneMediaUrls
  const assignSlot = useCallback((slotIndex: number, url: string) => {
    setSelectedSceneMediaUrls((current) => {
      const next = [...current]
      while (next.length < sceneCount) next.push('')
      for (let i = 0; i < next.length; i += 1) {
        if (next[i] === url) next[i] = ''
      }
      next[slotIndex] = url
      return next
    })
    setActiveSlot(slotIndex)
  }, [sceneCount, setSelectedSceneMediaUrls])

  const clearVideo = useCallback((url: string) => {
    setSelectedSceneMediaUrls((current) => current.map((value) => (value === url ? '' : value)))
  }, [setSelectedSceneMediaUrls])

  const clearSlot = useCallback((slotIndex: number) => {
    setSelectedSceneMediaUrls((current) => current.map((value, index) => (index === slotIndex ? '' : value)))
    setActiveSlot(slotIndex)
  }, [setSelectedSceneMediaUrls])

  const selectExistingSlot = useCallback((slotIndex: number) => {
    setActiveSlot(slotIndex)
  }, [])

  const filledSlots = p.selectedSceneMediaUrls.filter((u) => Boolean(u && u.trim())).length
  const allFilled = filledSlots === sceneCount

  // ----- Carousel scene texts ----------------------------------------------
  const sceneTexts = useMemo(() => {
    const raw = getIdeaSceneTexts(idea, p.editedScript)
    return normalizeSceneCount(raw, sceneCount)
  }, [idea, p.editedScript, sceneCount])

  const currentSceneText = (sceneTexts[activeSlot] || '').slice(0, 140)
  const currentSceneVideo = p.selectedSceneMediaUrls[activeSlot] || ''
  const currentControlsStyle: SceneTextStyle = {
    textX,
    textY,
    textColor,
    fontFamily,
    fontSize,
    fontWeight,
    uppercase,
    shadow,
    saved: true,
  }
  const savedStyleCount = p.sceneTextStyles
    .slice(0, sceneCount)
    .map(normalizeSceneStyle)
    .filter((style) => style.saved).length
  const allStylesSaved = savedStyleCount === sceneCount
  const allScenesConfigured = allFilled && allStylesSaved

  const saveActiveSceneStyle = () => {
    p.setSceneTextStyles((current) => {
      const next = current.slice(0, sceneCount).map(normalizeSceneStyle)
      while (next.length < sceneCount) next.push(createDefaultSceneStyle(false))
      next[activeSlot] = currentControlsStyle
      return next
    })
  }

  const applyCurrentStyleToAllScenes = () => {
    const style = { ...currentControlsStyle, saved: true }
    p.setSceneTextStyles(Array.from({ length: sceneCount }, () => ({ ...style })))
  }

  const goPrevScene = () => setActiveSlot((index) => (index - 1 + sceneCount) % sceneCount)
  const goNextScene = () => setActiveSlot((index) => (index + 1) % sceneCount)

  return (
    <div className="journey-wizard-grid is-media-stage is-template-merged">
      <aside className="journey-wizard-grid-side journey-template-side">
        <div className="journey-wizard-side-card is-narrow journey-style-card">
          <div className="journey-style-card-head">
            <span className="journey-wizard-card-label">Parametres</span>
            <button
              type="button"
              className="journey-style-reset"
              onClick={resetStyleDefaults}
              aria-label="Reinitialiser les parametres"
            >
              Reinitialiser
            </button>
          </div>
          <div className="journey-style-scroll">

          <section className="journey-style-section" aria-labelledby="merged-section-scene">
            <div className="journey-style-section-head">
              <h3 id="merged-section-scene" className="journey-style-section-title">Scene active</h3>
              <span className="journey-step-row-hint">{savedStyleCount}/{sceneCount} styles</span>
            </div>
            <div className="journey-scene-style-tabs" role="tablist" aria-label="Scenes">
              {Array.from({ length: sceneCount }).map((_, index) => {
                const saved = normalizeSceneStyle(p.sceneTextStyles[index]).saved
                const filled = Boolean(p.selectedSceneMediaUrls[index] && p.selectedSceneMediaUrls[index].trim())
                return (
                  <button
                    key={index}
                    type="button"
                    role="tab"
                    aria-selected={index === activeSlot}
                    className={`journey-scene-style-tab ${index === activeSlot ? 'is-active' : ''} ${saved ? 'is-saved' : ''} ${filled ? 'is-filled' : ''}`}
                    onClick={() => setActiveSlot(index)}
                  >
                    {index + 1}
                  </button>
                )
              })}
            </div>
            <div className="journey-style-actions">
              <button type="button" className="journey-style-action" onClick={saveActiveSceneStyle}>
                Enregistrer cette scene
              </button>
              <button type="button" className="journey-style-action" onClick={applyCurrentStyleToAllScenes}>
                Appliquer a toutes
              </button>
            </div>
          </section>


          <section className="journey-style-section" aria-labelledby="merged-section-position">
            <h3 id="merged-section-position" className="journey-style-section-title">Position</h3>
            <div className="journey-style-row">
              <div className="journey-style-row-head">
                <label htmlFor="merged-text-y">Verticale</label>
                <span className="journey-style-row-value">{textY}%</span>
              </div>
              <input id="merged-text-y" type="range" min={6} max={94} value={textY} onChange={(e) => setTextY(Number(e.target.value))} />
            </div>
            <div className="journey-style-row">
              <div className="journey-style-row-head">
                <label htmlFor="merged-text-x">Horizontale</label>
                <span className="journey-style-row-value">{textX}%</span>
              </div>
              <input id="merged-text-x" type="range" min={6} max={94} value={textX} onChange={(e) => setTextX(Number(e.target.value))} />
            </div>
          </section>

          <section className="journey-style-section" aria-labelledby="merged-section-typo">
            <h3 id="merged-section-typo" className="journey-style-section-title">Typographie</h3>
            <div className="journey-style-row">
              <div className="journey-style-row-head">
                <label htmlFor="merged-text-size">Taille</label>
                <span className="journey-style-row-value">{fontSize}px</span>
              </div>
              <input id="merged-text-size" type="range" min={14} max={80} value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} />
            </div>
            <div className="journey-style-grid-2">
              <div className="journey-style-row">
                <label htmlFor="merged-font">Police</label>
                <select id="merged-font" className="journey-step-select" value={fontFamily} onChange={(e) => setFontFamily(e.target.value)}>
                  {FONT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div className="journey-style-row">
                <label htmlFor="merged-font-weight">Graisse</label>
                <select id="merged-font-weight" className="journey-step-select" value={fontWeight} onChange={(e) => setFontWeight(Number(e.target.value))}>
                  {FONT_WEIGHT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <label className="journey-style-toggle">
              <input type="checkbox" checked={uppercase} onChange={(e) => setUppercase(e.target.checked)} />
              <span>Majuscules</span>
            </label>
          </section>

          <section className="journey-style-section" aria-labelledby="merged-section-color">
            <h3 id="merged-section-color" className="journey-style-section-title">Apparence</h3>
            <div className="journey-style-row">
              <div className="journey-style-row-head">
                <label htmlFor="merged-text-color">Couleur du texte</label>
                <span className="journey-style-color-value">{textColor.toUpperCase()}</span>
              </div>
              <div className="journey-style-color-pair">
                <input id="merged-text-color" className="journey-color-input" type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} />
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
                  aria-label="Couleur hexadÃƒÂ©cimale"
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

          <section className="journey-style-section" aria-labelledby="merged-section-render">
            <h3 id="merged-section-render" className="journey-style-section-title">Rendu</h3>
            <div className="journey-style-grid-2">
              <div className="journey-style-row">
                <label htmlFor="merged-quality">Qualite</label>
                <select
                  id="merged-quality"
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
              <div className="journey-style-row">
                <label htmlFor="merged-duration">Duree</label>
                <input
                  id="merged-duration"
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
          </section>

          </div>
          <div className="journey-step-cta journey-step-cta-stack">
            <span className="journey-style-save-status">
              {allStylesSaved ? 'Styles scenes enregistres' : `Enregistre les styles: ${savedStyleCount}/${sceneCount}`}
            </span>
            {effectivePreviewUrl ? (
              <>
                <Button variant="secondary" onClick={() => void p.handleRetryInitPublish()} disabled={p.isBusy || !idea || !allScenesConfigured}>
                  {t('render.regenerate')}
                </Button>
                <Button variant="primary" onClick={p.handleValidateInitPublish} disabled={p.isBusy}>
                  {t('render.validate')}
                </Button>
              </>
            ) : (
              <Button
                variant="primary"
                onClick={() => void p.handleRetryInitPublish()}
                disabled={p.isBusy || !idea || !allScenesConfigured}
              >
                {p.isPreparingVideo ? t('common.generating') : t('common.generate')}
              </Button>
            )}
          </div>
        </div>
      </aside>

      {/* Ã¢â€â‚¬Ã¢â€â‚¬ Middle : search + gallery (2 cards / row) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */}
      <section className="journey-media-middle">
        <div className="journey-media-gallery-head">
          <div className="journey-media-gallery-title">
            <span className="journey-wizard-card-label">{t('media.galleryLabel')}</span>
            <span className="journey-media-gallery-status">
              {t('media.sceneActiveStatus', {
                active: activeSlot + 1,
                filled: filledSlots,
                total: sceneCount,
                label: filledSlots > 1 ? t('media.scenesPickedPlural') : t('media.scenesPickedSingular'),
              })}
            </span>
          </div>
          <form
            className="journey-media-search"
            onSubmit={(e) => {
              e.preventDefault()
              submitSearch(query)
            }}
          >
            <input
              type="search"
              className="journey-step-select"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('media.searchPlaceholder')}
              disabled={isSearching}
            />
            <Button type="submit" variant="secondary" disabled={isSearching || !query.trim()}>
              {isSearching ? t('common.searching') : t('common.search')}
            </Button>
          </form>
        </div>

        {searchError ? (
          <div className="journey-empty">
            <strong>{t('media.errorTitle')}</strong>
            <p>{searchError}</p>
          </div>
        ) : isSearching && videos.length === 0 ? (
          <PexelsGallerySkeleton tiles={8} />
        ) : videos.length === 0 ? (
          <div className="journey-empty">
            <strong>{t('media.noVideoTitle')}</strong>
            <p>{t('media.noVideoSub')}</p>
          </div>
        ) : (
          <>
            <div className="journey-media-scene-map">
              {Array.from({ length: sceneCount }).map((_, index) => {
                const url = p.selectedSceneMediaUrls[index] || ''
                return (
                  <button
                    key={index}
                    type="button"
                    className={`journey-media-scene-map-item ${index === activeSlot ? 'is-active' : ''} ${url ? 'is-filled' : ''}`}
                    onClick={() => setActiveSlot(index)}
                  >
                    <span>Scene {index + 1}</span>
                    {url ? (
                      <span
                        className="journey-media-scene-map-remove"
                        onClick={(event) => {
                          event.stopPropagation()
                          clearSlot(index)
                        }}
                      >
                        Retirer
                      </span>
                    ) : <span>Vide</span>}
                  </button>
                )
              })}
            </div>
            <PexelsGalleryGrid
              videos={videos}
              selectedSceneMediaUrls={p.selectedSceneMediaUrls}
              activeSlot={activeSlot}
              sceneCount={sceneCount}
              pickPortraitFile={pickPortraitFile}
              onAssign={assignSlot}
              onSelectExistingSlot={selectExistingSlot}
              onClear={clearVideo}
              onClearSlot={clearSlot}
              registerVideoRef={registerVideoRef}
            />
          </>
        )}
      </section>

      {/* Ã¢â€â‚¬Ã¢â€â‚¬ Right : TikTok 9:16 carousel preview Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */}
      <aside className="journey-media-preview">
        <div className="journey-template-head">
          <span className="journey-wizard-card-label">{t('templateStyle.previewLabel')}</span>
          <span className="journey-step-row-hint">
            Scene {activeSlot + 1} / {sceneCount}
          </span>
        </div>
        <div className="journey-template-preview-frame">
          {isRenderActive && !effectivePreviewUrl ? (
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
                </div>
              </div>
            </div>
          ) : effectivePreviewUrl ? (
            <video
              key={effectivePreviewUrl}
              src={effectivePreviewUrl}
              className="journey-template-preview-video"
              controls
              playsInline
              preload="metadata"
            />
          ) : currentSceneVideo ? (
            <video
              key={currentSceneVideo}
              src={currentSceneVideo}
              className="journey-template-preview-video"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
            />
          ) : (
            <div className="journey-template-preview-fallback" aria-hidden="true">
              <span className="journey-media-preview-empty-copy">
                Aucune video assignee
              </span>
            </div>
          )}
          {!isRenderActive && !effectivePreviewUrl ? (
            <div
              className="journey-template-preview-text"
              style={{
                left: `${textX}%`,
                top: `${textY}%`,
                color: textColor,
                fontFamily,
                textShadow: SHADOW_CSS[shadow],
              }}
              key={activeSlot}
            >
              <strong
                style={{
                  fontSize: `${fontSize}px`,
                  lineHeight: 1.1,
                  fontWeight,
                  textTransform: uppercase ? 'uppercase' : 'none',
                }}
              >
                {currentSceneText || '-'}
              </strong>
            </div>
          ) : null}
          {!isRenderActive && !effectivePreviewUrl && sceneCount > 1 ? (
            <>
              <button
                type="button"
                className="journey-media-preview-arrow is-prev"
                onClick={goPrevScene}
                aria-label="Scene precedente"
              >
                {'<'}
              </button>
              <button
                type="button"
                className="journey-media-preview-arrow is-next"
                onClick={goNextScene}
                aria-label="Scene suivante"
              >
                {'>'}
              </button>
              <span className="journey-template-preview-counter">
                {activeSlot + 1} / {sceneCount}
              </span>
            </>
          ) : null}
        </div>
        {!isRenderActive && !effectivePreviewUrl && sceneCount > 1 ? (
          <div className="journey-media-carousel-dots" role="tablist" aria-label="Scenes">
            {Array.from({ length: sceneCount }).map((_, index) => {
              const isActive = index === activeSlot
              const isFilled = Boolean(p.selectedSceneMediaUrls[index] && p.selectedSceneMediaUrls[index].trim())
              return (
                <button
                  key={index}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-label={`Aller a la scene ${index + 1}${isFilled ? ' (assignee)' : ' (vide)'}`}
                  className={`journey-media-carousel-dot ${isActive ? 'is-active' : ''} ${isFilled ? 'is-filled' : ''}`}
                  onClick={() => setActiveSlot(index)}
                />
              )
            })}
          </div>
        ) : null}
        <div className="journey-media-assignment-footer">
          <span>{t('media.scenesReady', { filled: filledSlots, total: sceneCount })}</span>
          <span>{t('media.activeScene', { index: activeSlot + 1 })}</span>
        </div>
      </aside>
    </div>
  )
}

