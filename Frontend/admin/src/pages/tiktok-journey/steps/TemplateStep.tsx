import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useJourney } from '../JourneyContext'
import {
  searchPexelsVideos,
  type PexelsSearchResponse,
  type PexelsVideo,
} from '../../../services/videoOpsSupabase'
import { getIdeaSceneTexts, normalizeSceneCount } from '../journeyHelpers'
import { Button } from '../../../design-system'
import { PexelsGallerySkeleton } from './PexelsSkeleton'
import { PexelsGalleryGrid } from './PexelsGalleryGrid'

/**
 * Step 2 — merged Template + Médias.
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
 * The carousel doubles as the scene navigator — picking a scene in the
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

  // ----- Style controls (live-bound to the carousel preview overlay) -------
  const [textX, setTextX] = useState(STYLE_DEFAULTS.textX)
  const [textY, setTextY] = useState(STYLE_DEFAULTS.textY)
  const [textColor, setTextColor] = useState(STYLE_DEFAULTS.textColor)
  const [fontFamily, setFontFamily] = useState(STYLE_DEFAULTS.fontFamily)
  const [fontSize, setFontSize] = useState(STYLE_DEFAULTS.fontSize)
  const [fontWeight, setFontWeight] = useState<number>(STYLE_DEFAULTS.fontWeight)
  const [uppercase, setUppercase] = useState<boolean>(STYLE_DEFAULTS.uppercase)
  const [shadow, setShadow] = useState<'none' | 'soft' | 'strong'>(STYLE_DEFAULTS.shadow)

  const resetStyleDefaults = () => {
    setTextX(STYLE_DEFAULTS.textX)
    setTextY(STYLE_DEFAULTS.textY)
    setTextColor(STYLE_DEFAULTS.textColor)
    setFontFamily(STYLE_DEFAULTS.fontFamily)
    setFontSize(STYLE_DEFAULTS.fontSize)
    setFontWeight(STYLE_DEFAULTS.fontWeight)
    setUppercase(STYLE_DEFAULTS.uppercase)
    setShadow(STYLE_DEFAULTS.shadow)
  }

  // ----- Scene state --------------------------------------------------------
  useEffect(() => {
    p.setSelectedSceneMediaUrls((current) => {
      const next = current.slice(0, sceneCount)
      while (next.length < sceneCount) next.push('')
      return next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneCount])

  const [activeSlot, setActiveSlot] = useState<number>(0)
  useEffect(() => {
    if (activeSlot >= sceneCount) setActiveSlot(Math.max(0, sceneCount - 1))
  }, [sceneCount, activeSlot])

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
    queryKey: ['pexels-videos', trimmedCommittedQuery, 'portrait', 18],
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
  const searchError = pexelsQuery.isError ? (pexelsQuery.error?.message || 'Recherche échouée') : null

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
      void queryClient.invalidateQueries({ queryKey: ['pexels-videos', trimmed, 'portrait', 18] })
      return
    }
    setCommittedQuery(trimmed)
  }

  // ----- Slot assignment helpers -------------------------------------------
  // useCallback so PexelsGalleryGrid (React.memo) doesn't re-render every time
  // a style slider moves — its props stay referentially stable.
  const setSelectedSceneMediaUrls = p.setSelectedSceneMediaUrls
  const assignSlot = useCallback((slotIndex: number, url: string) => {
    setSelectedSceneMediaUrls((current) => {
      const next = [...current]
      while (next.length < sceneCount) next.push('')
      next[slotIndex] = url
      return next
    })
    if (slotIndex < sceneCount - 1) setActiveSlot(slotIndex + 1)
  }, [sceneCount, setSelectedSceneMediaUrls])

  const clearVideo = useCallback((url: string) => {
    setSelectedSceneMediaUrls((current) => current.map((value) => (value === url ? '' : value)))
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

  const goPrevScene = () => setActiveSlot((index) => (index - 1 + sceneCount) % sceneCount)
  const goNextScene = () => setActiveSlot((index) => (index + 1) % sceneCount)

  return (
    <div className="journey-wizard-grid is-media-stage is-template-merged">
      {/* ── Left : style parameters + Suivant ─────────────────────────── */}
      <aside className="journey-wizard-grid-side journey-template-side">
        <div className="journey-wizard-side-card is-narrow journey-style-card">
          <div className="journey-style-card-head">
            <span className="journey-wizard-card-label">Paramètres</span>
            <button
              type="button"
              className="journey-style-reset"
              onClick={resetStyleDefaults}
              aria-label="Réinitialiser les paramètres"
            >
              Réinitialiser
            </button>
          </div>

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
              onClick={p.handleValidateMedia}
              disabled={p.isBusy || !idea || !allFilled}
            >
              {t('common.next')}
            </Button>
          </div>
        </div>
      </aside>

      {/* ── Middle : search + gallery (2 cards / row) ─────────────────── */}
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
          <PexelsGalleryGrid
            videos={videos}
            selectedSceneMediaUrls={p.selectedSceneMediaUrls}
            activeSlot={activeSlot}
            pickPortraitFile={pickPortraitFile}
            onAssign={assignSlot}
            onSelectExistingSlot={selectExistingSlot}
            onClear={clearVideo}
            registerVideoRef={registerVideoRef}
          />
        )}
      </section>

      {/* ── Right : TikTok 9:16 carousel preview ──────────────────────── */}
      <aside className="journey-media-preview">
        <div className="journey-template-head">
          <span className="journey-wizard-card-label">{t('templateStyle.previewLabel')}</span>
          <span className="journey-step-row-hint">
            Scène {activeSlot + 1} / {sceneCount}
          </span>
        </div>
        <div className="journey-template-preview-frame">
          {currentSceneVideo ? (
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
                Aucune vidéo assignée
              </span>
            </div>
          )}
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
              {currentSceneText || '—'}
            </strong>
          </div>
          {sceneCount > 1 ? (
            <>
              <button
                type="button"
                className="journey-media-preview-arrow is-prev"
                onClick={goPrevScene}
                aria-label="Scène précédente"
              >
                ‹
              </button>
              <button
                type="button"
                className="journey-media-preview-arrow is-next"
                onClick={goNextScene}
                aria-label="Scène suivante"
              >
                ›
              </button>
              <span className="journey-template-preview-counter">
                {activeSlot + 1} / {sceneCount}
              </span>
            </>
          ) : null}
        </div>
        {sceneCount > 1 ? (
          <div className="journey-media-carousel-dots" role="tablist" aria-label="Scènes">
            {Array.from({ length: sceneCount }).map((_, index) => {
              const isActive = index === activeSlot
              const isFilled = Boolean(p.selectedSceneMediaUrls[index] && p.selectedSceneMediaUrls[index].trim())
              return (
                <button
                  key={index}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-label={`Aller à la scène ${index + 1}${isFilled ? ' (assignée)' : ' (vide)'}`}
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
