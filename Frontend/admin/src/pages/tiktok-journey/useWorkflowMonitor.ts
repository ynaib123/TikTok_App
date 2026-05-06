import { useEffect, useState } from 'react'
import {
  buildWorkflowStatusUpdate,
  hasScriptGenerationResult,
  isRenderReady,
  isUploadCompleted,
  isWorkflowRunTerminal,
  mergeIdeasById,
  raceWorkflowRunAndDatabaseUpdate,
  sleep,
  type WorkflowStatusSnapshot,
  type WorkflowStatusUpdate,
} from './journeyHelpers'
import type { ContentIdea, ContentIdeaStatus, ManualAction, WorkflowRun } from '../../types'
import type { ManualActionState } from './useTikTokJourneySteps'

export interface UseWorkflowMonitorOptions {
  fetchContentIdeaById: (ideaId: number | string) => Promise<ContentIdea | null>
  fetchManualActions: () => Promise<ManualAction[]>
  fetchContentIdeaStatus: (ideaId: number | string) => Promise<ContentIdeaStatus | null>
  fetchRecentContentIdeas: () => Promise<ContentIdea[]>
  fetchWorkflowRun: (runId: number | string) => Promise<WorkflowRun | null>
}

interface MarkWorkflowStartedInput {
  runId?: number | string | null
  workflowType?: string
  contentIdeaId?: number | null
  message?: string | null
}

interface MarkWorkflowFinishedInput extends MarkWorkflowStartedInput {
  state?: string
  completedAt?: string | null
}

export function useWorkflowMonitor({
  fetchContentIdeaById,
  fetchManualActions,
  fetchContentIdeaStatus,
  fetchRecentContentIdeas,
  fetchWorkflowRun,
}: UseWorkflowMonitorOptions) {
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatusSnapshot | null>(null)

  useEffect(() => {
    if (!workflowStatus?.state || workflowStatus.state === 'idle') return undefined

    const timeoutId = window.setTimeout(() => {
      setWorkflowStatus((current) => {
        if (!current || current.state === 'running') return current
        return buildWorkflowStatusUpdate(current, { state: 'idle' })
      })
    }, 12_000)

    return () => window.clearTimeout(timeoutId)
  }, [workflowStatus])

  const markWorkflowStarted = ({ runId, workflowType, contentIdeaId, message }: MarkWorkflowStartedInput) => {
    const now = new Date().toISOString()
    setWorkflowStatus((current) => buildWorkflowStatusUpdate(current, {
      runId,
      workflowType,
      contentIdeaId,
      state: 'running',
      message,
      startedAt: now,
      completedAt: null,
      durationMs: null,
      lastUpdatedAt: now,
    } as WorkflowStatusUpdate))
  }

  const markWorkflowFinished = ({ runId, workflowType, contentIdeaId, state, message, completedAt }: MarkWorkflowFinishedInput) => {
    const completedTime = completedAt || new Date().toISOString()
    setWorkflowStatus((current) => {
      const nextStartedAt = current?.startedAt || completedTime
      const durationMs = nextStartedAt ? Math.max(0, Date.parse(completedTime) - Date.parse(nextStartedAt)) : null
      return buildWorkflowStatusUpdate(current, {
        runId,
        workflowType,
        contentIdeaId,
        state,
        message,
        completedAt: completedTime,
        durationMs,
        lastUpdatedAt: completedTime,
      } as WorkflowStatusUpdate)
    })
  }

  const waitForWorkflowRunCompletion = async (
    runId: number | string | null | undefined,
    timeoutMs: number = 60_000,
  ): Promise<WorkflowRun | null> => {
    if (!runId) return null

    const timeoutAt = Date.now() + timeoutMs
    let lastRun: WorkflowRun | null = null

    while (Date.now() < timeoutAt) {
      const run = await fetchWorkflowRun(runId)
      lastRun = run

      if (String(run?.status || '').toUpperCase() === 'FAILED') {
        markWorkflowFinished({
          runId,
          workflowType: run?.workflowType ?? undefined,
          contentIdeaId: run?.contentIdeaId ?? null,
          state: 'failed',
          message: run?.errorMessage || `Le workflow ${run?.workflowType || runId} a echoue.`,
          completedAt: run?.completedAt ?? null,
        })
        throw new Error(run?.errorMessage || `Le workflow ${run?.workflowType || runId} a echoue.`)
      }

      if (isWorkflowRunTerminal(run)) {
        markWorkflowFinished({
          runId,
          workflowType: run?.workflowType ?? undefined,
          contentIdeaId: run?.contentIdeaId ?? null,
          state: 'succeeded',
          message: 'Workflow termine avec succes.',
          completedAt: run?.completedAt ?? null,
        })
        return run
      }

      await sleep(1500)
    }

    return lastRun
  }

  const waitForContentIdeaStatus = async (
    contentIdeaId: number | string,
    predicate: (status: ContentIdeaStatus | null) => boolean,
    timeoutMs: number = 45_000,
  ): Promise<ContentIdeaStatus | null> => {
    const timeoutAt = Date.now() + timeoutMs
    let lastStatus: ContentIdeaStatus | null = null

    while (Date.now() < timeoutAt) {
      const status = await fetchContentIdeaStatus(contentIdeaId)
      lastStatus = status
      if (predicate(status)) {
        return status
      }
      await sleep(1500)
    }

    return lastStatus
  }

  const waitForNewIdeas = async (
    baselineMaxId: number,
    expectedCount: number,
    requestedCategory: string | null | undefined,
  ): Promise<ContentIdea[]> => {
    const timeoutAt = Date.now() + 90_000
    let bestMatch: ContentIdea[] = []

    while (Date.now() < timeoutAt) {
      const ideas = await fetchRecentContentIdeas()
      const nextIdeas = ideas
        .filter((idea) => Number(idea.id) > baselineMaxId)
        .filter((idea) => {
          const currentCategory = String(idea?.category || '').trim().toLowerCase()
          const expectedCategory = String(requestedCategory || '').trim().toLowerCase()
          return !expectedCategory || !currentCategory || currentCategory === expectedCategory
        })
        .sort((left, right) => Number(right?.id || 0) - Number(left?.id || 0))

      if (nextIdeas.length) {
        bestMatch = nextIdeas.slice(0, Math.max(expectedCount, nextIdeas.length))
      }
      if (nextIdeas.length >= expectedCount) {
        return nextIdeas.slice(0, expectedCount)
      }
      await sleep(1500)
    }

    if (bestMatch.length) return bestMatch.slice(0, expectedCount)
    throw new Error("Les nouvelles idees n'ont pas ete trouvees dans content_ideas.")
  }

  const waitForScriptGeneration = async (
    ideaId: number | string,
    baselineIdea: ContentIdea | null = null,
  ): Promise<ContentIdea> => {
    const timeoutAt = Date.now() + 120_000
    const baselineScript = String(baselineIdea?.script || '').trim()
    const baselineCaption = String(baselineIdea?.caption || '').trim()
    const baselineKeyword = String(baselineIdea?.keyword || '').trim()

    while (Date.now() < timeoutAt) {
      const nextIdea = await fetchContentIdeaById(ideaId)
      if (!nextIdea) {
        await sleep(1500)
        continue
      }

      const nextScript = String(nextIdea?.script || '').trim()
      const nextCaption = String(nextIdea?.caption || '').trim()
      const nextKeyword = String(nextIdea?.keyword || '').trim()
      const hasChanged = nextScript !== baselineScript || nextCaption !== baselineCaption || nextKeyword !== baselineKeyword

      if (hasScriptGenerationResult(nextIdea) && (hasChanged || !baselineIdea)) {
        return nextIdea
      }

      await sleep(1500)
    }

    throw new Error("La generation du script n'a pas fini dans le temps attendu.")
  }

  const waitForRenderedVideo = async (
    ideaId: number | string,
    checkRenderStatus: (() => Promise<unknown>) | null = null,
  ): Promise<ContentIdea> => {
    const timeoutAt = Date.now() + 180_000

    while (Date.now() < timeoutAt) {
      if (typeof checkRenderStatus === 'function') {
        await checkRenderStatus()
      }

      const status = await fetchContentIdeaStatus(ideaId)
      if (String(status?.pipelineStage || '').toUpperCase() === 'FAILED') {
        throw new Error(status?.lastErrorMessage || "La generation de la video a echoue.")
      }

      const nextIdea = await fetchContentIdeaById(ideaId)
      if (!nextIdea) {
        await sleep(4000)
        continue
      }

      if (isRenderReady(nextIdea)) {
        return nextIdea
      }

      await sleep(4000)
    }

    throw new Error("La generation de la video n'a pas fini dans le temps attendu.")
  }

  const waitForUploadPreparation = async (ideaId: number | string): Promise<ManualActionState> => {
    const timeoutAt = Date.now() + 90_000

    while (Date.now() < timeoutAt) {
      const status = await fetchContentIdeaStatus(ideaId)
      if (status?.uploadUrl) {
        const manualActions = await fetchManualActions()
        const found = manualActions.find((item) => Number(item.id) === Number(ideaId))
        if (found) return found as unknown as ManualActionState
        return {
          id: Number(ideaId),
          uploadUrl: status.uploadUrl,
          shotstackUrl: status.shotstackUrl,
          pipelineStatus: String(status.pipelineStage || '').toLowerCase(),
          tiktokStatus: status.tiktokStatus,
          finalVideoStatus: status.finalVideoStatus,
          shotstackStatus: status.shotstackStatus,
          lastError: status.lastErrorMessage,
        } as ManualActionState
      }
      await sleep(1500)
    }

    throw new Error("L'upload URL TikTok n'a pas ete generee.")
  }

  const raceWorkflowRunAndUploadPreparation = async (
    runId: number | string | null | undefined,
    ideaId: number | string,
  ): Promise<ManualActionState> => {
    const settled = await raceWorkflowRunAndDatabaseUpdate({
      waitForWorkflowRun: () => waitForWorkflowRunCompletion(runId, 60_000),
      waitForDatabaseUpdate: () => waitForUploadPreparation(ideaId),
    })

    if (settled?.type === 'database') {
      return settled.value
    }

    const completedRun = settled?.value || null
    if (completedRun && String(completedRun.status || '').toUpperCase() === 'SUCCEEDED') {
      const manualActions = await fetchManualActions()
      const action = manualActions.find((item) => Number(item.id) === Number(ideaId)) || null
      if (action?.uploadUrl) {
        return action as unknown as ManualActionState
      }
    }

    return waitForUploadPreparation(ideaId)
  }

  return {
    workflowStatus,
    setWorkflowStatus,
    markWorkflowStarted,
    markWorkflowFinished,
    waitForWorkflowRunCompletion,
    waitForContentIdeaStatus,
    waitForNewIdeas,
    waitForScriptGeneration,
    waitForRenderedVideo,
    waitForUploadPreparation,
    raceWorkflowRunAndUploadPreparation,
    mergeIdeasById,
    isUploadCompleted,
  }
}
