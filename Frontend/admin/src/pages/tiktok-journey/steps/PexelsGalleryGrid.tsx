import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import type { PexelsVideo } from '../../../services/videoOpsSupabase'

/**
 * Memoized Pexels gallery (2 cards per row).
 *
 * Lives in its own component so that style controls in the parent
 * (TemplateStep) don't re-render the entire grid on every keystroke. Props
 * are kept primitive / stable to maximize the cache hit rate of `React.memo`:
 *   - `videos` & `selectedSceneMediaUrls` come from React Query / context
 *     (referentially stable until they actually change),
 *   - `activeSlot` is a single number,
 *   - the callbacks are passed already memoized (useCallback) by the parent.
 */
export interface PexelsGalleryGridProps {
  videos: PexelsVideo[]
  selectedSceneMediaUrls: string[]
  activeSlot: number
  pickPortraitFile: (video: PexelsVideo) => string | null
  onAssign: (slot: number, url: string) => void
  onSelectExistingSlot: (slotIndex: number) => void
  onClear: (url: string) => void
  registerVideoRef: (node: HTMLVideoElement | null) => void
}

function PexelsGalleryGridImpl({
  videos,
  selectedSceneMediaUrls,
  activeSlot,
  pickPortraitFile,
  onAssign,
  onSelectExistingSlot,
  onClear,
  registerVideoRef,
}: PexelsGalleryGridProps) {
  const { t } = useTranslation('journey')

  return (
    <div
      className="journey-media-grid is-two-cols"
      role="listbox"
      aria-label={t('media.galleryLabel')}
    >
      {videos.map((video) => {
        const url = pickPortraitFile(video)
        if (!url) return null
        const usedAtIndex = selectedSceneMediaUrls.findIndex((u) => u === url)
        const isUsed = usedAtIndex >= 0
        const handleSelect = () => {
          if (isUsed) onSelectExistingSlot(usedAtIndex)
          else onAssign(activeSlot, url)
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
            className={`journey-media-card ${isUsed ? 'is-used' : ''}`}
            onClick={handleSelect}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                handleSelect()
              }
            }}
          >
            <div className="journey-media-card-frame">
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
                <span className="journey-media-card-badge">Scène {usedAtIndex + 1}</span>
              ) : null}
              <div className="journey-media-card-actions">
                {isUsed ? (
                  <button
                    type="button"
                    className="journey-media-card-action is-danger"
                    aria-label={t('media.deselectFromScene', { index: usedAtIndex + 1 })}
                    onClick={(event) => {
                      event.stopPropagation()
                      onClear(url)
                    }}
                  >
                    {t('common.deselect')}
                  </button>
                ) : (
                  <span className="journey-media-card-action">{t('media.assignTo', { index: activeSlot + 1 })}</span>
                )}
              </div>
            </div>
            <div className="journey-media-card-meta">
              <span>{video.width}×{video.height}</span>
              <span>{Math.round(video.duration)}s</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export const PexelsGalleryGrid = memo(PexelsGalleryGridImpl)
