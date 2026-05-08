import type { Dispatch, SetStateAction } from 'react'
import {
  isRenderReady,
  mergeIdeasById,
} from './journeyHelpers'
import type { ContentIdea, ContentIdeaStatus, ManualAction, TikTokAccount, WorkflowRun } from '../../types'

type RunAction = <T>(name: string, fn: () => Promise<T>) => Promise<T>
type ShowSuccess = (message: string) => void
type ShowError = (error: unknown, fallback?: string) => void

export interface ManualActionState {
  shotstackUrl?: string | null
  uploadUrl?: string | null
  [key: string]: unknown
}

interface WorkflowResponseLike {
  runId?: number | string | null
  workflowType?: string | null
}

interface MarkWorkflowInput {
  runId?: number | string | null
  workflowType?: string
  contentIdeaId?: number | null
  message?: string | null
  state?: string
  completedAt?: string | null
}

type SetState<T> = Dispatch<SetStateAction<T>>

export interface UseCreationStepOptions {
  generationCategory: string | null | undefined
  generationTopic?: string | null
  generationDurationTarget?: string | null
  generationLanguage?: string | null
  generationInspirationRef?: string | null
  generationSceneCount?: number | null
  connectedTikTokAccount: TikTokAccount | null
  fetchRecentContentIdeas: () => Promise<ContentIdea[]>
  triggerMainContentPipeline: (input: Record<string, unknown>) => Promise<WorkflowResponseLike>
  refreshPipelineData: () => Promise<unknown>
  resetGeneratedIdeasState: () => void
  setGeneratedIdeas: SetState<ContentIdea[]>
  setSelectedGeneratedIdeaId: (id: number | null) => void
  setScriptedIdea: SetState<ContentIdea | null>
  setManualAction: SetState<ManualActionState | null>
  setUploadResult: (value: unknown) => void
  setLastGenerationBaselineId: (id: number) => void
  setLastGenerationExpectedCount: (count: number) => void
  waitForNewIdeas: (baselineMaxId: number, expectedCount: number, requestedCategory: string) => Promise<ContentIdea[]>
  waitForScriptGeneration: (ideaId: number | string, baselineIdea: ContentIdea | null) => Promise<ContentIdea>
  showSuccess: ShowSuccess
  showError: ShowError
  runAction: RunAction
  markWorkflowStarted: (input: MarkWorkflowInput) => void
  markWorkflowFinished: (input: MarkWorkflowInput) => void
}

export function useCreationStep({
  generationCategory,
  generationTopic,
  generationDurationTarget,
  generationLanguage,
  generationInspirationRef,
  generationSceneCount,
  connectedTikTokAccount,
  fetchRecentContentIdeas,
  triggerMainContentPipeline,
  refreshPipelineData,
  resetGeneratedIdeasState,
  setGeneratedIdeas,
  setSelectedGeneratedIdeaId,
  setScriptedIdea,
  setManualAction,
  setUploadResult,
  setLastGenerationBaselineId,
  setLastGenerationExpectedCount,
  waitForNewIdeas,
  waitForScriptGeneration,
  showSuccess,
  showError,
  runAction,
  markWorkflowStarted,
  markWorkflowFinished,
}: UseCreationStepOptions) {
  const handleGenerateIdea = async () => runAction('generateIdea', async () => {
    const requestedCount = 1
    const requestedCategory = String(generationCategory || '').trim()

    if (!requestedCategory) {
      throw new Error('Renseigne une categorie avant de lancer la generation.')
    }

    const ideas = await fetchRecentContentIdeas()
    const baselineMaxId = ideas.reduce((maxId, idea) => Math.max(maxId, Number(idea?.id) || 0), 0)
    resetGeneratedIdeasState()
    setLastGenerationBaselineId(baselineMaxId)
    setLastGenerationExpectedCount(requestedCount)

    const optionalString = (value: string | null | undefined) => {
      const trimmed = String(value || '').trim()
      return trimmed.length > 0 ? trimmed : null
    }

    const workflowResponse = await triggerMainContentPipeline({
      source: `backoffice-tiktok-step-creation-${Date.now()}`,
      ideaCount: requestedCount,
      category: requestedCategory,
      tiktokAccountOpenId: String(connectedTikTokAccount?.openId || '').trim() || null,
      topic: optionalString(generationTopic),
      durationTarget: optionalString(generationDurationTarget),
      language: optionalString(generationLanguage),
      inspirationRef: optionalString(generationInspirationRef),
      sceneCount: typeof generationSceneCount === 'number' && generationSceneCount > 0 ? generationSceneCount : null,
      force: true,
    })

    markWorkflowStarted({
      runId: workflowResponse?.runId || null,
      workflowType: workflowResponse?.workflowType || 'MAIN_PIPELINE',
      message: 'Generation de l idee + script en cours.',
    })

    // Invalide le cache react-query immediatement pour que le fallback
    // `displayedGeneratedIdeas` (base sur la query content_ideas) puisse
    // afficher la nouvelle idee meme si le polling direct ci-dessous
    // rencontre une erreur transitoire (auth refresh, glitch reseau).
    void refreshPipelineData()

    try {
      const nextIdeas = await waitForNewIdeas(baselineMaxId, requestedCount, requestedCategory)
      const idea = nextIdeas[0]
      setGeneratedIdeas(nextIdeas)
      setSelectedGeneratedIdeaId(idea?.id ? Number(idea.id) : null)
      setManualAction(null)
      setUploadResult(null)

      const scriptedIdea = await waitForScriptGeneration(Number(idea.id), null)

      setScriptedIdea(scriptedIdea)
      setGeneratedIdeas(() => [scriptedIdea])
      await refreshPipelineData()
      markWorkflowFinished({
        runId: workflowResponse?.runId || null,
        workflowType: workflowResponse?.workflowType || 'MAIN_PIPELINE',
        contentIdeaId: Number(idea.id),
        state: 'succeeded',
        message: 'Idee et script generes.',
      })
      showSuccess('Idee et script generes. Tu peux la regenerer ou valider pour passer a la video.')
    } catch (error) {
      markWorkflowFinished({
        runId: workflowResponse?.runId || null,
        workflowType: workflowResponse?.workflowType || 'MAIN_PIPELINE',
        state: 'failed',
        message: (error as Error)?.message || "La generation n'a pas abouti.",
      })
      throw error
    }
  }).catch((error: unknown) => {
    showError(error, "La generation n'a pas abouti.")
  })

  return { handleGenerateIdea }
}

export interface UseRenderStepOptions {
  scriptedIdea: ContentIdea | null
  selectedGeneratedIdea: ContentIdea | null
  selectedTemplateId: string | null
  selectedQualityProfile: string | null
  generationSceneCount?: number | null
  goToStep: (step: string) => void
  triggerRenderTemplateWorkflow: (input: Record<string, unknown>) => Promise<WorkflowResponseLike>
  fetchContentIdeaById: (ideaId: number | string) => Promise<ContentIdea | null>
  waitForWorkflowRunCompletion: (runId: number | string | null | undefined, timeoutMs?: number) => Promise<WorkflowRun | null>
  waitForContentIdeaStatus: (ideaId: number | string, predicate: (s: ContentIdeaStatus | null) => boolean, timeoutMs?: number) => Promise<ContentIdeaStatus | null>
  waitForRenderedVideo: (ideaId: number | string, checkRenderStatus?: (() => Promise<unknown>) | null) => Promise<ContentIdea>
  refreshPipelineData: () => Promise<unknown>
  setScriptedIdea: SetState<ContentIdea | null>
  setGeneratedIdeas: SetState<ContentIdea[]>
  setManualAction: SetState<ManualActionState | null>
  showSuccess: ShowSuccess
  showError: ShowError
  runAction: RunAction
  markWorkflowStarted: (input: MarkWorkflowInput) => void
  markWorkflowFinished: (input: MarkWorkflowInput) => void
  setCurrentRenderRunId?: (runId: number | null) => void
}

export function useRenderStep({
  scriptedIdea,
  selectedGeneratedIdea,
  selectedTemplateId,
  selectedQualityProfile,
  generationSceneCount,
  goToStep,
  triggerRenderTemplateWorkflow,
  fetchContentIdeaById,
  waitForWorkflowRunCompletion,
  waitForContentIdeaStatus,
  waitForRenderedVideo,
  refreshPipelineData,
  setScriptedIdea,
  setGeneratedIdeas,
  setManualAction,
  showSuccess,
  showError,
  runAction,
  markWorkflowStarted,
  markWorkflowFinished,
  setCurrentRenderRunId,
}: UseRenderStepOptions) {
  const handleValidateScript = async () => runAction('renderVideo', async () => {
    const idea = scriptedIdea || selectedGeneratedIdea
    if (!idea?.id) {
      throw new Error('Aucun resultat script a valider.')
    }

    goToStep('init-publish')
    const workflowRun = await triggerRenderTemplateWorkflow({
      source: 'backoffice-tiktok-step-video-render',
      contentIdeaId: idea.id,
      topic: idea.topic,
      script: idea.script,
      caption: idea.caption,
      keyword: idea.keyword,
      templateId: selectedTemplateId || null,
      qualityProfile: selectedQualityProfile || null,
      sceneCount: typeof generationSceneCount === 'number' && generationSceneCount > 0 ? generationSceneCount : null,
    })
    if (setCurrentRenderRunId && workflowRun?.runId) {
      setCurrentRenderRunId(Number(workflowRun.runId))
    }
    markWorkflowStarted({
      runId: workflowRun?.runId,
      workflowType: workflowRun?.workflowType || 'RENDER_TEMPLATE_VIDEO',
      contentIdeaId: Number(idea.id),
      message: 'Rendu video en cours.',
    })
    showSuccess('Generation video lancee. La video apparaitra ici des qu elle sera prete.')

    const completedRun = await waitForWorkflowRunCompletion(workflowRun?.runId, 12 * 1000)
    let renderedIdea: ContentIdea | null = null

    if (completedRun && String(completedRun.status || '').toUpperCase() === 'SUCCEEDED') {
      const status = await waitForContentIdeaStatus(Number(idea.id), (candidate) => candidate?.pipelineStage === 'RENDER_READY', 20_000)
      if (status?.pipelineStage === 'RENDER_READY') {
        renderedIdea = await fetchContentIdeaById(Number(idea.id))
      }
    }

    if (!renderedIdea || !isRenderReady(renderedIdea)) {
      renderedIdea = await waitForRenderedVideo(Number(idea.id), null)
    }

    const finalIdea = renderedIdea
    setScriptedIdea(finalIdea)
    setGeneratedIdeas((currentIdeas) => mergeIdeasById(currentIdeas, [finalIdea]))
    setManualAction((currentAction) => ({
      id: Number(finalIdea.id),
      topic: finalIdea.topic ?? null,
      shotstackUrl: finalIdea.shotstackUrl || currentAction?.shotstackUrl || '',
      uploadUrl: currentAction?.uploadUrl || '',
      workflowStatus: currentAction?.workflowStatus || 'render_ready',
      tiktokStatus: finalIdea.tiktokStatus || currentAction?.tiktokStatus || '',
      finalVideoStatus: finalIdea.finalVideoStatus || currentAction?.finalVideoStatus || '',
      shotstackStatus: finalIdea.shotstackStatus || currentAction?.shotstackStatus || '',
      pipelineStatus: finalIdea.pipelineStatus || currentAction?.pipelineStatus || '',
      lastError: finalIdea.lastError || currentAction?.lastError || null,
    }))
    await refreshPipelineData()
    markWorkflowFinished({
      runId: workflowRun?.runId,
      workflowType: workflowRun?.workflowType || 'RENDER_TEMPLATE_VIDEO',
      contentIdeaId: Number(idea.id),
      state: 'succeeded',
      message: 'Video prete pour publication.',
    })
    showSuccess('Video prete. Verifie le template avant de passer a la publication.')
    if (setCurrentRenderRunId) setCurrentRenderRunId(null)
  }).catch((error: unknown) => {
    if (setCurrentRenderRunId) setCurrentRenderRunId(null)
    showError(error, "L'initialisation publish n'a pas abouti.")
  })

  return {
    handleValidateScript,
    handleRetryInitPublish: handleValidateScript,
  }
}

export interface UseUploadStepOptions {
  scriptedIdea: ContentIdea | null
  selectedGeneratedIdea: ContentIdea | null
  manualAction: ManualActionState | null
  triggerPublishTikTokWorkflow: (input: Record<string, unknown>) => Promise<WorkflowResponseLike>
  uploadTikTokMedia: (input: { id: number | string; shotstackUrl: string; uploadUrl: string; force?: boolean }) => Promise<unknown>
  fetchContentIdeaById: (ideaId: number | string) => Promise<ContentIdea | null>
  fetchManualActions: () => Promise<ManualAction[]>
  raceWorkflowRunAndUploadPreparation: (runId: number | string | null | undefined, ideaId: number | string) => Promise<ManualActionState>
  refreshPipelineData: () => Promise<unknown>
  setManualAction: SetState<ManualActionState | null>
  setScriptedIdea: SetState<ContentIdea | null>
  setGeneratedIdeas: SetState<ContentIdea[]>
  setUploadResult: (value: unknown) => void
  showSuccess: ShowSuccess
  showError: ShowError
  runAction: RunAction
  markWorkflowStarted: (input: MarkWorkflowInput) => void
  markWorkflowFinished: (input: MarkWorkflowInput) => void
  isUploadCompleted: (idea: ContentIdea | null | undefined) => boolean
}

export function useUploadStep({
  scriptedIdea,
  selectedGeneratedIdea,
  manualAction,
  triggerPublishTikTokWorkflow,
  uploadTikTokMedia,
  fetchContentIdeaById,
  fetchManualActions,
  raceWorkflowRunAndUploadPreparation,
  refreshPipelineData,
  setManualAction,
  setScriptedIdea,
  setGeneratedIdeas,
  setUploadResult,
  showSuccess,
  showError,
  runAction,
  markWorkflowStarted,
  markWorkflowFinished,
  isUploadCompleted,
}: UseUploadStepOptions) {
  const uploadVideo = async (actionOverride?: ManualActionState | null) => {
    const idea = scriptedIdea || selectedGeneratedIdea
    const action = actionOverride || manualAction

    if (!idea?.id || !action?.shotstackUrl || !action?.uploadUrl) {
      throw new Error('Il manque la video ou les informations necessaires pour lancer la publication.')
    }

    markWorkflowStarted({
      workflowType: 'TIKTOK_UPLOAD',
      contentIdeaId: Number(idea.id),
      message: 'Publication TikTok en cours.',
    })

    try {
      const result = await uploadTikTokMedia({
        id: idea.id,
        shotstackUrl: action.shotstackUrl,
        uploadUrl: action.uploadUrl,
      })
      setUploadResult(result || { ok: true })
      await refreshPipelineData()
      markWorkflowFinished({
        workflowType: 'TIKTOK_UPLOAD',
        contentIdeaId: Number(idea.id),
        state: 'succeeded',
        message: 'Publication TikTok terminee.',
      })
      showSuccess('Publication TikTok terminee.')
    } catch (error) {
      const [refreshedIdea, manualActions] = await Promise.all([
        fetchContentIdeaById(Number(idea.id)),
        fetchManualActions(),
      ])
      const refreshedAction = manualActions.find((item) => Number(item?.id) === Number(idea.id)) || null

      if (refreshedIdea && isUploadCompleted(refreshedIdea)) {
        setScriptedIdea((currentIdea) => (Number(currentIdea?.id) === Number(refreshedIdea.id) ? refreshedIdea : currentIdea))
        setGeneratedIdeas((currentIdeas) => mergeIdeasById(currentIdeas, [refreshedIdea]))
        setManualAction((currentAction) => ({
          ...currentAction,
          ...(refreshedAction || {}),
        }))
        setUploadResult({
          ok: true,
          recovered: true,
        })
        await refreshPipelineData()
        markWorkflowFinished({
          workflowType: 'TIKTOK_UPLOAD',
          contentIdeaId: Number(idea.id),
          state: 'succeeded',
          message: 'Publication terminee cote serveur avant le callback.',
        })
        showSuccess('Publication terminee cote serveur. La reponse HTTP a probablement expire, mais la video est bien passee en statut upload.')
        return
      }

      markWorkflowFinished({
        workflowType: 'TIKTOK_UPLOAD',
        contentIdeaId: Number(idea.id),
        state: 'failed',
        message: (error as Error)?.message || "La publication TikTok n'a pas abouti.",
      })
      throw error
    }
  }

  const prepareUpload = async () => {
    const idea = scriptedIdea || selectedGeneratedIdea
    if (!idea?.id) {
      throw new Error('Aucune video disponible pour preparer la publication.')
    }

    const workflowRun = await triggerPublishTikTokWorkflow({
      source: 'backoffice-tiktok-step-upload-prepare',
      contentIdeaId: idea.id,
      topic: idea.topic,
    })
    markWorkflowStarted({
      runId: workflowRun?.runId,
      workflowType: workflowRun?.workflowType || 'INIT_PUBLISH_TIKTOK',
      contentIdeaId: Number(idea.id),
      message: 'Preparation de la publication TikTok en cours.',
    })

    const nextManualAction = await raceWorkflowRunAndUploadPreparation(workflowRun?.runId, Number(idea.id))

    setManualAction((currentAction) => ({
      ...currentAction,
      ...nextManualAction,
    }))
    await refreshPipelineData()
    markWorkflowFinished({
      runId: workflowRun?.runId,
      workflowType: workflowRun?.workflowType || 'INIT_PUBLISH_TIKTOK',
      contentIdeaId: Number(idea.id),
      state: 'succeeded',
      message: 'Publication TikTok prete.',
    })
    return nextManualAction
  }

  const handlePrepareUpload = async () => runAction('prepareUpload', async () => {
    await prepareUpload()
    showSuccess('Publication TikTok prete. Tu peux la lancer.')
  }).catch((error: unknown) => {
    showError(error, "La preparation de la publication n'a pas abouti.")
  })

  const handleUploadVideo = async () => runAction('uploadVideo', async () => {
    await uploadVideo()
  }).catch((error: unknown) => {
    showError(error, "La publication TikTok n'a pas abouti.")
  })

  const handlePrepareAndUploadVideo = async (): Promise<boolean> => {
    try {
      const nextAction = manualAction?.uploadUrl
        ? manualAction
        : await runAction('prepareUpload', async () => prepareUpload())

      await runAction('uploadVideo', async () => {
        await uploadVideo(nextAction)
      })
      return true
    } catch {
      // Errors are already surfaced by the underlying handlers.
      return false
    }
  }

  return {
    handlePrepareUpload,
    handlePrepareAndUploadVideo,
    handleUploadVideo,
  }
}

export interface UsePublishStepOptions {
  scriptedIdea: ContentIdea | null
  selectedGeneratedIdea: ContentIdea | null
  markPublishComplete: (ideaId: number | string) => Promise<unknown>
  refreshPipelineData: () => Promise<unknown>
  showSuccess: ShowSuccess
  showError: ShowError
  runAction: RunAction
  markWorkflowStarted: (input: MarkWorkflowInput) => void
  markWorkflowFinished: (input: MarkWorkflowInput) => void
  navigate?: ((path: string) => void) | null
}

export function usePublishStep({
  scriptedIdea,
  selectedGeneratedIdea,
  markPublishComplete,
  refreshPipelineData,
  showSuccess,
  showError,
  runAction,
  markWorkflowStarted,
  markWorkflowFinished,
  navigate,
}: UsePublishStepOptions) {
  const handlePublishVideo = async () => runAction('publishVideo', async () => {
    const idea = scriptedIdea || selectedGeneratedIdea
    if (!idea?.id) {
      throw new Error('Aucune video disponible pour finaliser la publication.')
    }

    markWorkflowStarted({
      workflowType: 'FINALIZE_PUBLISH',
      contentIdeaId: Number(idea.id),
      message: 'Finalisation de la publication en cours.',
    })
    await markPublishComplete(idea.id)
    await refreshPipelineData()
    markWorkflowFinished({
      workflowType: 'FINALIZE_PUBLISH',
      contentIdeaId: Number(idea.id),
      state: 'succeeded',
      message: 'Publication finale enregistree.',
    })
    showSuccess('Video publiee avec succes.')
    if (typeof navigate === 'function') {
      navigate(`/tiktok/idea/${idea.id}`)
    }
  }).catch((error: unknown) => {
    showError(error, "La publication finale n'a pas abouti.")
  })

  return { handlePublishVideo }
}
