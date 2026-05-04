import type { ContentIdea } from '../../types'
import { usePipelineStage, STAGE_ORDER } from './usePipelineStage'

interface PipelineBadgeProps {
  idea: ContentIdea
}

export default function PipelineBadge({ idea }: PipelineBadgeProps) {
  const { key, index, isFailed, label } = usePipelineStage(idea)
  const badgeVariant = isFailed ? 'failed' : key

  return (
    <div className="vc-badge-row">
      <div className="vc-stepper" aria-hidden="true">
        {STAGE_ORDER.map((stage, i) => {
          const isPast = i < index
          const isActive = i === index
          return (
            <span
              key={stage}
              className={[
                'vc-stepper-dot',
                isPast ? 'is-past' : '',
                isActive && !isFailed ? 'is-active' : '',
                isActive && isFailed ? 'is-failed' : '',
              ].filter(Boolean).join(' ')}
            />
          )
        })}
      </div>

      <span
        className={`vc-badge vc-badge--${badgeVariant}`}
        aria-label={`Statut: ${label}`}
      >
        <span className="vc-badge-dot" aria-hidden="true" />
        {label}
      </span>
    </div>
  )
}
