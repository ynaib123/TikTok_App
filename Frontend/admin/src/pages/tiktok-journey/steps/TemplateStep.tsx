import { useEffect, useMemo, useRef, useState } from 'react'
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

/**
 * Step 3 — Pexels media picker.
 *
 *   Left   : scene-by-scene assignment list. Click a slot to make it the
 *            current one; click a Pexels tile to fill it.
 *   Middle : Pexels gallery for the active idea's keyword.
 *   Right  : TikTok 9:16 carousel previewing each scene paired with its
 *            assigned video and the matching text overlay. Prev / next
 *            arrows + dot indicators keep the carousel in sync with the
 *            assignment list (both share `activeSlot`).
 */

// Pause + detach src on a <video>, aborting any in-flight metadata fetch.
// Without this, switching searches or unmounting the step can leave the
// browser holding onto buffered video data tied to the previous query.
function releaseVideoElement(video: HTMLVideoElement | null) {
  if (!video) return
  try {
    video.pause()
    video.removeAttribute('src')
    video.load()
  } catch {
    // best-effort cleanup; never throw during unmount
  }
}

export default function TemplateStep() {
  const { t } = useTranslation('journey')
  const p = useJourney()
  const idea = p.scriptedIdea || p.selectedGeneratedIdea
  const sceneCount = Math.max(1, Math.min(10, p.generationSceneCount || 1))

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

  const defaultQuery = String(idea?.keyword || idea?.topic || p.editedKeyword || '').trim() || 'lifestyle'
  // `query` is the value visible in the search input (controlled).
  // `committedQuery` is the value React Query actually fetches against — only
  // updated on submit so each keystroke does not trigger a network call.
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

  // Mirror the React Query result back into the global flow state so workspace
  // save / leave / resume can reuse the active query string.
  useEffect(() => {
    if (!pexelsQuery.data) return
    p.setPexelsCache({ query: trimmedCommittedQuery, videos: pexelsQuery.data.videos })
    setCarouselIndex(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pexelsQuery.data, trimmedCommittedQuery])

  const [carouselIndex, setCarouselIndex] = useState<number>(0)

  // Track every <video> currently rendered in the gallery so we can pause and
  // release them when the search switches or the step unmounts.
  const videoRefs = useRef<Set<HTMLVideoElement>>(new Set())
  const registerVideoRef = (node: HTMLVideoElement | null) => {
    if (!node) return
    videoRefs.current.add(node)
  }
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

  const pickPortraitFile = (video: PexelsVideo): string | null => {
    const files = video.video_files || []
    const portrait = files.filter((f) => f.height > f.width)
    portrait.sort((a, b) => Math.abs(1080 - a.width) - Math.abs(1080 - b.width))
    return (portrait[0] || files[0])?.link || null
  }

  const assignSlot = (slotIndex: number, url: string) => {
    p.setSelectedSceneMediaUrls((current) => {
      const next = [...current]
      while (next.length < sceneCount) next.push('')
      next[slotIndex] = url
      return next
    })
    if (slotIndex < sceneCount - 1) {
      setActiveSlot(slotIndex + 1)
    }
  }

  const clearSlot = (slotIndex: number) => {
    p.setSelectedSceneMediaUrls((current) => {
      const next = [...current]
      while (next.length < sceneCount) next.push('')
      next[slotIndex] = ''
      return next
    })
    setActiveSlot(slotIndex)
  }

  const clearVideo = (url: string) => {
    p.setSelectedSceneMediaUrls((current) => current.map((value) => (value === url ? '' : value)))
  }

  const filledSlots = p.selectedSceneMediaUrls.filter((u) => Boolean(u && u.trim())).length
  const allFilled = filledSlots === sceneCount

  // Scene text per slot — same source the renderer consumes (planned scenes
  // when present, otherwise the script split sentence-by-sentence).
  const sceneTexts = useMemo(() => {
    const raw = getIdeaSceneTexts(idea, p.editedScript)
    return normalizeSceneCount(raw, sceneCount)
  }, [idea, p.editedScript, sceneCount])

  const currentSceneText = (sceneTexts[activeSlot] || '').slice(0, 140)
  const currentSceneVideo = p.selectedSceneMediaUrls[activeSlot] || ''

  const goPrevScene = () => setActiveSlot((index) => (index - 1 + sceneCount) % sceneCount)
  const goNextScene = () => setActiveSlot((index) => (index + 1) % sceneCount)

  return (
    <div className="journey-wizard-grid is-media-stage">
      <aside className="journey-wizard-grid-side journey-media-side">
        <div className="journey-wizard-side-card is-wide">
          <span className="journey-wizard-card-label">{t('media.assignmentLabel')}</span>
          <div
            className="journey-media-assignment-list"
            role="radiogroup"
            aria-label={t('media.assignmentLabel')}
          >
            {Array.from({ length: sceneCount }).map((_, index) => {
              const selectedUrl = p.selectedSceneMediaUrls[index] || ''
              const isActive = index === activeSlot
              return (
                <div
                  key={index}
                  role="radio"
                  tabIndex={0}
                  aria-checked={isActive}
                  aria-label={`Scène ${index + 1}${selectedUrl ? ' (assignée)' : ' (vide)'}`}
                  className={`journey-media-assignment ${isActive ? 'is-active' : ''} ${selectedUrl ? 'is-filled' : ''}`}
                  onClick={() => setActiveSlot(index)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      setActiveSlot(index)
                    }
                  }}
                >
                  <span className="journey-media-assignment-thumb">
                    {selectedUrl ? (
                      <video src={selectedUrl} muted playsInline preload="metadata" />
                    ) : (
                      <span>{t('media.assignmentEmpty')}</span>
                    )}
                  </span>
                  <span className="journey-media-assignment-index">{`Scène ${index + 1}`}</span>
                  <span className="journey-media-assignment-copy">
                    {selectedUrl ? t('media.assignmentVideoPicked') : t('media.assignmentVideoPick')}
                  </span>
                  {selectedUrl ? (
                    <button
                      type="button"
                      className="journey-media-assignment-clear"
                      aria-label={t('media.assignmentRemoveAria', { index: index + 1 })}
                      onClick={(event) => {
                        event.stopPropagation()
                        clearSlot(index)
                      }}
                    >
                      {t('common.remove')}
                    </button>
                  ) : null}
                </div>
              )
            })}
          </div>
          <div className="journey-media-assignment-footer">
            <span>{t('media.scenesReady', { filled: filledSlots, total: sceneCount })}</span>
            <span>{t('media.activeScene', { index: activeSlot + 1 })}</span>
          </div>
        </div>
        <div className="journey-step-cta journey-step-cta-stack">
          <Button
            variant="primary"
            onClick={p.handleValidateMedia}
            disabled={p.isBusy || !idea || !allFilled}
          >
            {t('common.next')}
          </Button>
        </div>
      </aside>

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
            <Button
              type="submit"
              variant="secondary"
              disabled={isSearching || !query.trim()}
            >
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
          <PexelsGallerySkeleton tiles={9} />
        ) : videos.length === 0 ? (
          <div className="journey-empty">
            <strong>{t('media.noVideoTitle')}</strong>
            <p>{t('media.noVideoSub')}</p>
          </div>
        ) : (
          <div className="journey-media-grid" role="listbox" aria-label={t('media.galleryLabel')}>
            {videos.map((video, vIdx) => {
              const url = pickPortraitFile(video)
              if (!url) return null
              const usedAtIndex = p.selectedSceneMediaUrls.findIndex((u) => u === url)
              const isUsed = usedAtIndex >= 0
              const isFocused = vIdx === carouselIndex
              const handleSelect = () => {
                setCarouselIndex(vIdx)
                if (isUsed) setActiveSlot(usedAtIndex)
                else assignSlot(activeSlot, url)
              }
              return (
                <div
                  key={video.id}
                  role="option"
                  tabIndex={0}
                  aria-selected={isUsed}
                  aria-label={isUsed
                    ? t('media.assignmentVideoPicked') + ` (${usedAtIndex + 1})`
                    : t('media.assignTo', { index: activeSlot + 1 })}
                  className={`journey-media-card ${isUsed ? 'is-used' : ''} ${isFocused ? 'is-focused' : ''}`}
                  onClick={handleSelect}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      handleSelect()
                    }
                  }}
                >
                  <video
                    ref={registerVideoRef}
                    src={url}
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    className="journey-media-card-video"
                    onMouseEnter={(e) => void (e.currentTarget as HTMLVideoElement).play()}
                    onMouseLeave={(e) => {
                      const v = e.currentTarget as HTMLVideoElement
                      v.pause()
                      v.currentTime = 0
                    }}
                  />
                  {isUsed ? (
                    <span className="journey-media-card-badge">Scene {usedAtIndex + 1}</span>
                  ) : null}
                  <div className="journey-media-card-actions">
                    {isUsed ? (
                      <button
                        type="button"
                        className="journey-media-card-action is-danger"
                        aria-label={t('media.deselectFromScene', { index: usedAtIndex + 1 })}
                        onClick={(event) => {
                          event.stopPropagation()
                          clearVideo(url)
                        }}
                      >
                        {t('common.deselect')}
                      </button>
                    ) : (
                      <span className="journey-media-card-action">{t('media.assignTo', { index: activeSlot + 1 })}</span>
                    )}
                  </div>
                  <div className="journey-media-card-meta">
                    <span>{video.width}×{video.height}</span>
                    <span>{Math.round(video.duration)}s</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

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
              left: '50%',
              top: '48%',
              color: '#ffffff',
              fontFamily: 'Inter',
              textShadow: '0 2px 16px rgba(0, 0, 0, 0.7), 0 0 4px rgba(0, 0, 0, 0.4)',
            }}
            key={activeSlot}
          >
            <strong
              style={{
                fontSize: '28px',
                lineHeight: 1.1,
                fontWeight: 800,
                textTransform: 'uppercase',
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
              return (
                <button
                  key={index}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-label={`Aller à la scène ${index + 1}`}
                  className={`journey-media-carousel-dot ${isActive ? 'is-active' : ''}`}
                  onClick={() => setActiveSlot(index)}
                />
              )
            })}
          </div>
        ) : null}
      </aside>
    </div>
  )
}
