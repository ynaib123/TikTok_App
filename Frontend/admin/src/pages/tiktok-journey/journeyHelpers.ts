export const MAX_IDEA_BATCH_SIZE = 5

export interface IdeaLike {
  id?: number | string | null
  shotstackUrl?: string | null
  finalVideoStatus?: string | null
  shotstackStatus?: string | null
  script?: string | null
  caption?: string | null
  keyword?: string | null
  tiktokStatus?: string | null
  uploadUrl?: string | null
  category?: string | null
  topic?: string | null
  pipelineStatus?: string | null
  lastError?: string | null
}

export interface WorkflowRunLike {
  status?: string | null
  workflowType?: string | null
  contentIdeaId?: number | null
  errorMessage?: string | null
  completedAt?: string | null
}

export interface WorkflowStatusUpdate {
  runId?: number | string | null
  workflowType?: string
  contentIdeaId?: number | null
  state?: string
  message?: string | null
  startedAt?: string | null
  completedAt?: string | null
  durationMs?: number | null
  lastUpdatedAt?: string
}

export interface WorkflowStatusSnapshot extends Required<Pick<WorkflowStatusUpdate, 'state' | 'workflowType'>> {
  runId: number | string | null
  contentIdeaId: number | null
  state: string
  message: string | null
  startedAt: string | null
  completedAt: string | null
  durationMs: number | null
  lastUpdatedAt: string
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

export function isWorkflowRunTerminal(run: WorkflowRunLike | null | undefined): boolean {
  const status = String(run?.status || '').toUpperCase()
  return status === 'SUCCEEDED' || status === 'FAILED'
}

export function isRenderReady(idea: IdeaLike | null | undefined): boolean {
  return Boolean(idea?.shotstackUrl)
    || idea?.finalVideoStatus === 'ready'
    || idea?.shotstackStatus === 'done'
}

export function hasScriptGenerationResult(idea: IdeaLike | null | undefined): boolean {
  return Boolean(
    String(idea?.script || '').trim()
    || String(idea?.caption || '').trim()
    || String(idea?.keyword || '').trim(),
  )
}

export function isPublished(idea: IdeaLike | null | undefined): boolean {
  return String(idea?.tiktokStatus || '').toLowerCase() === 'published'
}

export function isUploadCompleted(idea: IdeaLike | null | undefined): boolean {
  return ['uploaded', 'uploading', 'published'].includes(String(idea?.tiktokStatus || '').toLowerCase())
}

export function normalizeUrl(value: unknown): string | null {
  const url = String(value || '').trim()
  return url || null
}

export function normalizeText(value: unknown): string {
  return String(value || '').trim().toLowerCase()
}

export function formatShortOpenId(value: unknown): string {
  const normalized = String(value || '').trim()
  if (!normalized) return '-'
  if (normalized.length <= 18) return normalized
  return `${normalized.slice(0, 8)}...${normalized.slice(-6)}`
}

export function mergeIdeasById<T extends IdeaLike>(existingIdeas: T[], incomingIdeas: T[]): T[] {
  const byId = new Map<number, T>()
  existingIdeas.forEach((idea) => {
    byId.set(Number(idea?.id), idea)
  })
  incomingIdeas.forEach((idea) => {
    byId.set(Number(idea?.id), idea)
  })
  return [...byId.values()].sort((left, right) => Number(right?.id || 0) - Number(left?.id || 0))
}

export function getIdeaStatusLabel(idea: IdeaLike | null | undefined): string {
  if (isPublished(idea)) return 'publiee'
  if (String(idea?.tiktokStatus || '').toLowerCase() === 'uploaded') return 'uploadee'
  if (String(idea?.tiktokStatus || '').toLowerCase() === 'uploading') return 'publication en cours'
  if (idea?.uploadUrl) return 'prete upload'
  if (isRenderReady(idea)) return 'rendue'
  if (idea?.shotstackStatus === 'rendering') return 'rendering'
  return idea?.tiktokStatus || 'draft'
}

export function buildWorkflowStatusUpdate(
  currentStatus: WorkflowStatusSnapshot | null | undefined,
  patch: WorkflowStatusUpdate | null | undefined,
): WorkflowStatusSnapshot {
  return {
    runId: patch?.runId ?? currentStatus?.runId ?? null,
    workflowType: patch?.workflowType ?? currentStatus?.workflowType ?? '',
    contentIdeaId: patch?.contentIdeaId ?? currentStatus?.contentIdeaId ?? null,
    state: patch?.state ?? currentStatus?.state ?? 'idle',
    message: patch?.message ?? currentStatus?.message ?? '',
    startedAt: patch?.startedAt ?? currentStatus?.startedAt ?? null,
    completedAt: patch?.completedAt ?? currentStatus?.completedAt ?? null,
    durationMs: patch?.durationMs ?? currentStatus?.durationMs ?? null,
    lastUpdatedAt: patch?.lastUpdatedAt ?? new Date().toISOString(),
  }
}

export interface RaceWorkflowOptions<W, D> {
  waitForWorkflowRun: () => Promise<W>
  waitForDatabaseUpdate: () => Promise<D>
}

export type RaceWorkflowResult<W, D> =
  | { type: 'workflowRun'; value: W }
  | { type: 'database'; value: D }

export async function raceWorkflowRunAndDatabaseUpdate<W, D>({
  waitForWorkflowRun,
  waitForDatabaseUpdate,
}: RaceWorkflowOptions<W, D>): Promise<RaceWorkflowResult<W, D>> {
  const settled = await Promise.race<RaceWorkflowResult<W, D>>([
    (async () => ({ type: 'workflowRun' as const, value: await waitForWorkflowRun() }))(),
    (async () => ({ type: 'database' as const, value: await waitForDatabaseUpdate() }))(),
  ])

  return settled
}

export function splitScriptIntoScenes(script: string): string[] {
  return String(script || '')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

export function getIdeaSceneTexts(idea: IdeaLike | null, fallbackScript: string): string[] {
  const planned = Array.isArray((idea as any)?.plannedScenes)
    ? (idea as any).plannedScenes.map((scene: any) => String(scene?.sceneText || '').trim()).filter(Boolean)
    : []
  return planned.length > 0 ? planned : splitScriptIntoScenes(fallbackScript)
}

export function normalizeSceneCount(scenes: string[], count: number): string[] {
  const targetCount = Math.min(10, Math.max(1, Number(count) || 1))
  const normalized = scenes.map((scene) => scene.trim()).filter((scene) => scene.length > 0)
  if (normalized.length > targetCount) {
    return [
      ...normalized.slice(0, targetCount - 1),
      normalized.slice(targetCount - 1).join(' '),
    ]
  }
  while (normalized.length < targetCount) normalized.push('')
  return normalized
}

export function joinScenes(scenes: string[]): string {
  return scenes
    .map((s) => {
      const t = s.trim()
      if (!t) return ''
      return /[.!?]$/.test(t) ? t : t + '.'
    })
    .filter(Boolean)
    .join(' ')
}
