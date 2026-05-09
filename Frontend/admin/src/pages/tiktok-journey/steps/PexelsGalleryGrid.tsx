import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import type { PexelsVideo } from '../../../services/videoOpsSupabase'

export interface PexelsGalleryGridProps {
  videos: PexelsVideo[]
  selectedSceneMediaUrls: string[]
  activeSlot: number
  sceneCount: number
  pickPortraitFile: (video: PexelsVideo) => string | null
  onAssign: (slot: number, url: string) => void
  onSelectExistingSlot: (slotIndex: number) => void
  onClear: (url: string) => void
  onClearSlot: (slotIndex: number) => void
  registerVideoRef: (node: HTMLVideoElement | null) => void
}

function PexelsGalleryGridImpl({
  videos,
  selectedSceneMediaUrls,
  activeSlot,
  sceneCount,
  pickPortraitFile,
  onAssign,
  onSelectExistingSlot,
  onClear,
  onClearSlot,
  registerVideoRef,
}: PexelsGalleryGridProps) {
  const { t } = useTranslation('journey')

  return (
    <div className="journey-media-grid is-two-cols" role="listbox" aria-label={t('media.galleryLabel')}>
      {videos.map((video) => {
        const url = pickPortraitFile(video)
        if (!url) return null

        const usedAtIndex = selectedSceneMediaUrls.findIndex((u) => u === url)
        const isUsed = usedAtIndex >= 0
        const poster = video.image || video.video_pictures?.[0]?.picture || undefined

        return (
          <div
            key={video.id}
            role="option"
            tabIndex={0}
            aria-selected={isUsed}
            aria-label={isUsed ? `Media assigne a la scene ${usedAtIndex + 1}` : 'Media disponible'}
            className={`journey-media-card ${isUsed ? 'is-used' : ''}`}
            onClick={() => {
              if (isUsed) onSelectExistingSlot(usedAtIndex)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                if (isUsed) onSelectExistingSlot(usedAtIndex)
              }
            }}
          >
            <div className="journey-media-card-frame">
              <video
                ref={registerVideoRef}
                src={url}
                poster={poster}
                muted
                loop
                playsInline
                controls
                preload="metadata"
                className="journey-media-card-video"
                onClick={(event) => event.stopPropagation()}
                onMouseEnter={(event) => void event.currentTarget.play()}
                onMouseLeave={(event) => event.currentTarget.pause()}
              />
              {isUsed ? <span className="journey-media-card-badge">Scene {usedAtIndex + 1}</span> : null}
            </div>

            <div className="journey-media-assign-row" aria-label="Assigner ce media a une scene">
              {Array.from({ length: sceneCount }).map((_, index) => {
                const isAssignedHere = selectedSceneMediaUrls[index] === url
                return (
                  <button
                    key={index}
                    type="button"
                    className={`journey-media-assign-btn ${isAssignedHere ? 'is-active' : ''} ${index === activeSlot ? 'is-current' : ''}`}
                    aria-label={isAssignedHere ? `Deselectionner la scene ${index + 1}` : `Assigner a la scene ${index + 1}`}
                    onClick={(event) => {
                      event.stopPropagation()
                      if (isAssignedHere) onClearSlot(index)
                      else onAssign(index, url)
                    }}
                  >
                    S{index + 1}
                  </button>
                )
              })}
            </div>

            {isUsed ? (
              <button
                type="button"
                className="journey-media-card-remove"
                onClick={(event) => {
                  event.stopPropagation()
                  onClear(url)
                }}
              >
                Retirer de la scene {usedAtIndex + 1}
              </button>
            ) : null}

            <div className="journey-media-card-meta">
              <span>{video.width}x{video.height}</span>
              <span>{Math.round(video.duration)}s</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export const PexelsGalleryGrid = memo(PexelsGalleryGridImpl)
