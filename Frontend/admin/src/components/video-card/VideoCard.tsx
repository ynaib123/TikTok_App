import { useState, type KeyboardEvent, type MouseEvent } from 'react'
import type { ContentIdea } from '../../types'
import VideoCardThumbnail from './VideoCardThumbnail'
import PipelineBadge from './PipelineBadge'
import VideoPreviewModal from './VideoPreviewModal'
import './video-card.css'

interface VideoCardProps {
  idea: ContentIdea
  selectable?: boolean
  selected?: boolean
  disabledReason?: string | null
  onToggleSelection?: (id: number) => void
}

export default function VideoCard({
  idea,
  selectable = false,
  selected = false,
  disabledReason = null,
  onToggleSelection,
}: VideoCardProps) {
  const [previewOpen, setPreviewOpen] = useState(false)
  const isPublished = String(idea.tiktokStatus ?? '').toLowerCase() === 'published'
  const hasVideo = Boolean(idea.shotstackUrl)
  const showCheckbox = selectable || disabledReason !== null
  const checkboxDisabled = !selectable
  const cardClasses = [
    'tiktok-video-card',
    isPublished ? 'is-published' : 'is-unpublished',
    showCheckbox ? 'is-selectable' : '',
    selected ? 'is-selected' : '',
    !selectable && disabledReason !== null ? 'is-not-eligible' : '',
  ].filter(Boolean).join(' ')

  const handleCheckboxClick = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation()
    if (checkboxDisabled || !onToggleSelection) return
    onToggleSelection(idea.id)
  }

  const handleCheckboxKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== ' ' && event.key !== 'Enter') return
    event.preventDefault()
    event.stopPropagation()
    if (checkboxDisabled || !onToggleSelection) return
    onToggleSelection(idea.id)
  }

  return (
    <>
      <article className={cardClasses}>
        {showCheckbox ? (
          <div
            role="checkbox"
            aria-checked={selected}
            aria-disabled={checkboxDisabled}
            tabIndex={checkboxDisabled ? -1 : 0}
            className={`tiktok-video-card-checkbox ${selected ? 'is-checked' : ''} ${checkboxDisabled ? 'is-disabled' : ''}`}
            title={checkboxDisabled ? (disabledReason ?? 'Non eligible') : (selected ? 'Deselectionner' : 'Selectionner')}
            onClick={handleCheckboxClick}
            onKeyDown={handleCheckboxKey}
          >
            {selected ? 'v' : ''}
          </div>
        ) : null}
        <VideoCardThumbnail
          idea={idea}
          onPlay={() => setPreviewOpen(true)}
        />
        <div className="tiktok-video-card-body">
          <strong>{idea.topic ?? `Video #${idea.id}`}</strong>
          <p>{idea.caption ?? idea.script ?? 'Aucune description disponible.'}</p>
          <PipelineBadge idea={idea} />
        </div>
      </article>

      {hasVideo && previewOpen && (
        <VideoPreviewModal
          idea={idea}
          onClose={() => setPreviewOpen(false)}
        />
      )}
    </>
  )
}
