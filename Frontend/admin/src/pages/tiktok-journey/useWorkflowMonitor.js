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
} from './journeyHelpers.js'

export function useWorkflowMonitor({
  fetchContentIdeas,
  fetchManualActions,
  fetchContentIdeaStatus,
  fetchWorkflowRun,
}) {
  const [workflowStatus, setWorkflowStatus] = useState(null)

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

  const markWorkflowStarted = ({ runId, workflowType, contentIdeaId, message }) => {
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
    }))
  }

  const markWorkflowFinished = ({ runId, workflowType, contentIdeaId, state, message, completedAt }) => {
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
      })
    })
  }

  const waitForWorkflowRunCompletion = async (runId, timeoutMs = 60_000) => {
    if (!runId) return null

    const timeoutAt = Date.now() + timeoutMs
    let lastRun = null

    while (Date.now() < timeoutAt) {
      const run = await fetchWorkflowRun(runId)
      lastRun = run

      if (String(run?.status || '').toUpperCase() === 'FAILED') {
        markWorkflowFinished({
          runId,
          workflowType: run?.workflowType,
          contentIdeaId: run?.contentIdeaId,
          state: 'failed',
          message: run?.errorMessage || `Le workflow ${run?.workflowType || runId} a echoue.`,
          completedAt: run?.completedAt,
        })
        throw new Error(run?.errorMessage || `Le workflow ${run?.workflowType || runId} a echoue.`)
      }

      if (isWorkflowRunTerminal(run)) {
        markWorkflowFinished({
          runId,
          workflowType: run?.workflowType,
          contentIdeaId: run?.contentIdeaId,
          state: 'succeeded',
          message: 'Workflow termine avec succes.',
          completedAt: run?.completedAt,
        })
        return run
      }

      await sleep(1500)
    }

    return lastRun
  }

  const waitForContentIdeaStatus = async (contentIdeaId, predicate, timeoutMs = 45_000) => {
    const timeoutAt = Date.now() + timeoutMs
    let lastStatus = null

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

  const waitForNewIdeas = async (baselineMaxId, expectedCount, requestedCategory) => {
    const timeoutAt = Date.now() + 90_000
    let bestMatch = []

    while (Date.now() < timeoutAt) {
      const ideas = await fetchContentIdeas()
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

  const waitForScriptGeneration = async (ideaId, baselineIdea = null) => {
    const timeoutAt = Date.now() + 120_000
    const baselineScript = String(baselineIdea?.script || '').trim()
    const baselineCaption = String(baselineIdea?.caption || '').trim()
    const baselineKeyword = String(baselineIdea?.keyword || '').trim()

    while (Date.now() < timeoutAt) {
      const ideas = await fetchContentIdeas()
      const nextIdea = ideas.find((idea) => Number(idea.id) === Number(ideaId))
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

  const waitForRenderedVideo = async (ideaId) => {
    const timeoutAt = Date.now() + 180_000

    while (Date.now() < timeoutAt) {
      const ideas = await fetchContentIdeas()
      const nextIdea = ideas.find((idea) => Number(idea.id) === Number(ideaId))
      if (!nextIdea) {
        await sleep(2000)
        continue
      }

      if (isRenderReady(nextIdea)) {
        return nextIdea
      }

      await sleep(2000)
    }

    throw new Error("La generation de la video n'a pas fini dans le temps attendu.")
  }

  const waitForUploadPreparation = async (ideaId) => {
    const timeoutAt = Date.now() + 90_000

    while (Date.now() < timeoutAt) {
      const status = await fetchContentIdeaStatus(ideaId)
      if (status?.uploadUrl) {
        const manualActions = await fetchManualActions()
        return manualActions.find((item) => Number(item.id) === Number(ideaId)) || {
          id: ideaId,
          uploadUrl: status.uploadUrl,
          shotstackUrl: status.shotstackUrl,
          pipelineStatus: String(status.pipelineStage || '').toLowerCase(),
          tiktokStatus: status.tiktokStatus,
          finalVideoStatus: status.finalVideoStatus,
          shotstackStatus: status.shotstackStatus,
          lastError: status.lastErrorMessage,
        }
      }
      await sleep(1500)
    }

    throw new Error("L'upload URL TikTok n'a pas ete generee.")
  }

  const raceWorkflowRunAndUploadPreparation = async (runId, ideaId) => {
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
        return action
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
