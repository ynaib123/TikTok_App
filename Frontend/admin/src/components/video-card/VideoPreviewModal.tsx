import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { ContentIdea } from '../../types'

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}

interface VideoPreviewModalProps {
  idea: ContentIdea
  onClose: () => void
}

export default function VideoPreviewModal({ idea, onClose }: VideoPreviewModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  // Scroll lock
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  // Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  // Stop video on unmount
  useEffect(() => {
    const videoElement = videoRef.current
    return () => {
      videoElement?.pause()
    }
  }, [])

  const title = idea.topic ?? `Video #${idea.id}`
  const sub = [idea.category, idea.caption].filter(Boolean).join(' · ')

  return createPortal(
    <div
      className="vc-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Apercu video: ${title}`}
    >
      <div className="vc-modal" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="vc-modal-close"
          onClick={onClose}
          aria-label="Fermer l apercu video"
        >
          <CloseIcon />
        </button>

        <div className="vc-modal-player">
          <video
            ref={videoRef}
            src={idea.shotstackUrl!}
            className="vc-modal-video"
            controls
            autoPlay
            playsInline
          />
        </div>

        <div className="vc-modal-footer">
          <p className="vc-modal-title">{title}</p>
          {sub && <p className="vc-modal-sub">{sub}</p>}
        </div>
      </div>
    </div>,
    document.body,
  )
}
