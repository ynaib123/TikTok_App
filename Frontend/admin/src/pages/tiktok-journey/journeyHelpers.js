export const MAX_IDEA_BATCH_SIZE = 5

export function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

export function isWorkflowRunTerminal(run) {
  const status = String(run?.status || '').toUpperCase()
  return status === 'SUCCEEDED' || status === 'FAILED'
}

export function isRenderReady(idea) {
  return Boolean(idea?.shotstackUrl)
    || idea?.finalVideoStatus === 'ready'
    || idea?.shotstackStatus === 'done'
}

export function hasScriptGenerationResult(idea) {
  return Boolean(
    String(idea?.script || '').trim()
    || String(idea?.caption || '').trim()
    || String(idea?.keyword || '').trim()
  )
}

export function isPublished(idea) {
  return String(idea?.tiktokStatus || '').toLowerCase() === 'published'
}

export function isUploadCompleted(idea) {
  return ['uploaded', 'uploading', 'published'].includes(String(idea?.tiktokStatus || '').toLowerCase())
}

export function normalizeUrl(value) {
  const url = String(value || '').trim()
  return url || null
}

export function normalizeText(value) {
  return String(value || '').trim().toLowerCase()
}

export function formatShortOpenId(value) {
  const normalized = String(value || '').trim()
  if (!normalized) return '-'
  if (normalized.length <= 18) return normalized
  return `${normalized.slice(0, 8)}...${normalized.slice(-6)}`
}

export function mergeIdeasById(existingIdeas, incomingIdeas) {
  const byId = new Map()
  existingIdeas.forEach((idea) => {
    byId.set(Number(idea?.id), idea)
  })
  incomingIdeas.forEach((idea) => {
    byId.set(Number(idea?.id), idea)
  })
  return [...byId.values()].sort((left, right) => Number(right?.id || 0) - Number(left?.id || 0))
}

export function getIdeaStatusLabel(idea) {
  if (isPublished(idea)) return 'publiee'
  if (String(idea?.tiktokStatus || '').toLowerCase() === 'uploaded') return 'uploadee'
  if (String(idea?.tiktokStatus || '').toLowerCase() === 'uploading') return 'publication en cours'
  if (idea?.uploadUrl) return 'prete upload'
  if (isRenderReady(idea)) return 'rendue'
  if (idea?.shotstackStatus === 'rendering') return 'rendering'
  return idea?.tiktokStatus || 'draft'
}

export function buildWorkflowStatusUpdate(currentStatus, patch) {
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

export async function raceWorkflowRunAndDatabaseUpdate({
  waitForWorkflowRun,
  waitForDatabaseUpdate,
}) {
  const settled = await Promise.race([
    (async () => ({ type: 'workflowRun', value: await waitForWorkflowRun() }))(),
    (async () => ({ type: 'database', value: await waitForDatabaseUpdate() }))(),
  ])

  return settled
}
