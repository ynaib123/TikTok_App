import { useRef, useState, useCallback } from 'react'
import type { ContentIdea } from '../../types'
import { usePipelineStage } from './usePipelineStage'

const CATEGORY_BG: Record<string, string> = {
  Food: 'vc-thumb-bg--food',
  Love: 'vc-thumb-bg--love',
  Sport: 'vc-thumb-bg--sport',
  Fitness: 'vc-thumb-bg--fitness',
  Beauty: 'vc-thumb-bg--beauty',
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5.14v13.72a1 1 0 0 0 1.514.857l11-6.86a1 1 0 0 0 0-1.714l-11-6.86A1 1 0 0 0 8 5.14z" />
    </svg>
  )
}

function AlertIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4" />
      <circle cx="12" cy="16" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  )
}

interface VideoCardThumbnailProps {
  idea: ContentIdea
  onPlay: () => void
}

export default function VideoCardThumbnail({ idea, onPlay }: VideoCardThumbnailProps) {
  const { key, isFailed } = usePipelineStage(idea)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [thumbError, setThumbError] = useState(false)

  const hasVideo = Boolean(idea.shotstackUrl) && !thumbError

  const handleLoadedMetadata = useCallback(() => {
    const el = videoRef.current
    if (el) el.currentTime = 0.5
  }, [])

  const handleVideoError = useCallback(() => setThumbError(true), [])

  // --- Failed ---
  if (isFailed) {
    return (
      <div className="tiktok-video-card-media vc-thumb-state--failed">
        <div className="vc-thumb-center">
          <AlertIcon />
          <span className="vc-thumb-failed-msg" title={idea.lastError ?? undefined}>
            {idea.lastError ?? 'Render echoue'}
          </span>
        </div>
      </div>
    )
  }

  // --- Rendering shimmer (no video yet) ---
  if (key === 'rendering' && !hasVideo) {
    return (
      <div className="tiktok-video-card-media vc-thumb-state--rendering" aria-label="Rendu en cours">
        <div className="vc-thumb-shimmer" aria-hidden="true" />
        <div className="vc-thumb-center">
          <span className="vc-thumb-spinner" aria-hidden="true" />
          <span className="vc-thumb-rendering-text">Rendering…</span>
        </div>
      </div>
    )
  }

  // --- Video ready (thumbnail + play) ---
  if (hasVideo) {
    const isPublished = String(idea.tiktokStatus ?? '').toLowerCase() === 'published'
    return (
      <div className="tiktok-video-card-media vc-thumb-state--video">
        <video
          ref={videoRef}
          src={idea.shotstackUrl!}
          className="vc-thumb-video"
          preload="metadata"
          muted
          playsInline
          onLoadedMetadata={handleLoadedMetadata}
          onError={handleVideoError}
        />
        <div className="vc-thumb-overlay" aria-hidden="true" />
        <button
          type="button"
          className="vc-play-btn"
          onClick={onPlay}
          aria-label={`Lire: ${idea.topic ?? `Video #${idea.id}`}`}
        >
          <span className="vc-play-btn-inner" aria-hidden="true">
            <PlayIcon />
          </span>
        </button>
        {isPublished && (
          <span className="vc-published-tag" aria-label="Video publiee sur TikTok">
            Publiee
          </span>
        )}
      </div>
    )
  }

  // --- Placeholder (draft / script) ---
  const bgClass = CATEGORY_BG[idea.category ?? ''] ?? 'vc-thumb-bg--default'
  const initial = (idea.topic ?? idea.category ?? String(idea.id))[0].toUpperCase()

  return (
    <div className={`tiktok-video-card-media vc-thumb-state--placeholder ${bgClass}`}>
      <div className="vc-thumb-center">
        <span className="vc-thumb-initial" aria-hidden="true">{initial}</span>
        {idea.category && (
          <span className="vc-thumb-category" aria-hidden="true">{idea.category}</span>
        )}
      </div>
    </div>
  )
}
