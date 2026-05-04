import type { ContentIdea } from '../../types'

export type StageKey = 'draft' | 'script' | 'rendering' | 'ready' | 'published'

export const STAGE_ORDER: StageKey[] = ['draft', 'script', 'rendering', 'ready', 'published']

const STAGE_LABELS: Record<StageKey, string> = {
  draft: 'Draft',
  script: 'Script',
  rendering: 'Rendering',
  ready: 'Ready',
  published: 'Publiee',
}

const PIPELINE_STATUS_TO_STAGE: Record<string, StageKey> = {
  UNKNOWN: 'draft',
  CREATION_REQUESTED: 'draft',
  IDEA_CREATED: 'draft',
  SCRIPT_REQUESTED: 'script',
  SCRIPT_READY: 'script',
  RENDERING_REQUESTED: 'rendering',
  RENDER_READY: 'ready',
  UPLOAD_PREPARING: 'ready',
  PUBLISH_INITIALIZED: 'ready',
  UPLOAD_COMPLETED: 'ready',
  PUBLISHED: 'published',
}

export interface PipelineStageInfo {
  key: StageKey
  index: number
  isFailed: boolean
  label: string
}

function resolveStageFromSignals(idea: ContentIdea): StageKey {
  if (String(idea.tiktokStatus ?? '').toLowerCase() === 'published') return 'published'
  if (idea.uploadUrl) return 'ready'
  if (idea.shotstackUrl || idea.shotstackStatus === 'done') return 'ready'
  if (
    idea.shotstackStatus === 'rendering' ||
    idea.shotstackStatus === 'queued' ||
    idea.shotstackStatus === 'preprocessing'
  ) return 'rendering'
  if (idea.script) return 'script'
  return 'draft'
}

export function usePipelineStage(idea: ContentIdea): PipelineStageInfo {
  const isFailed =
    idea.pipelineStatus === 'FAILED' ||
    idea.shotstackStatus === 'failed' ||
    idea.finalVideoStatus === 'failed'

  const ps = (idea.pipelineStatus ?? '').toUpperCase()
  const key: StageKey = PIPELINE_STATUS_TO_STAGE[ps] ?? resolveStageFromSignals(idea)

  return {
    key,
    index: STAGE_ORDER.indexOf(key),
    isFailed,
    label: isFailed ? 'Erreur' : STAGE_LABELS[key],
  }
}
