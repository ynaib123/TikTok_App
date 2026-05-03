import {
  MAX_IDEA_BATCH_SIZE,
  hasScriptGenerationResult,
  isRenderReady,
  mergeIdeasById,
} from './journeyHelpers.js'

export function useCreationStep({
  displayedGeneratedIdeas,
  generationCategory,
  generationCount,
  connectedTikTokAccount,
  fetchContentIdeas,
  triggerMainContentPipeline,
  triggerScriptGenerationWorkflow,
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
  waitForWorkflowRunCompletion,
  waitForContentIdeaStatus,
  waitForScriptGeneration,
  showSuccess,
  showError,
  runAction,
  markWorkflowStarted,
  markWorkflowFinished,
}) {
  const handleGenerateIdea = async () => runAction('generateIdea', async () => {
    const requestedCount = 1
    const requestedCategory = String(generationCategory || '').trim()
    const shouldForceGeneration = displayedGeneratedIdeas.length > 0

    if (!requestedCategory) {
      throw new Error('Renseigne une categorie avant de lancer la generation.')
    }

    const ideas = await fetchContentIdeas()
    const baselineMaxId = ideas.reduce((maxId, idea) => Math.max(maxId, Number(idea?.id) || 0), 0)
    resetGeneratedIdeasState()
    setLastGenerationBaselineId(baselineMaxId)
    setLastGenerationExpectedCount(requestedCount)

    const generationRequests = Array.from({ length: requestedCount }, (_, index) => (
      triggerMainContentPipeline({
        source: `backoffice-tiktok-step-creation-${Date.now()}-${index + 1}`,
        ideaCount: 1,
        category: requestedCategory,
        tiktokAccountOpenId: String(connectedTikTokAccount?.openId || '').trim() || null,
        force: shouldForceGeneration,
      })
    ))

    const workflowResponses = await Promise.all(generationRequests)
    markWorkflowStarted({
      runId: workflowResponses[0]?.runId || null,
      workflowType: workflowResponses[0]?.workflowType || 'MAIN_PIPELINE',
      message: 'Generation de l idee en cours.',
    })

    try {
      const nextIdeas = await waitForNewIdeas(baselineMaxId, requestedCount, requestedCategory)
      setGeneratedIdeas(nextIdeas)
      setSelectedGeneratedIdeaId(nextIdeas[0]?.id || null)
      setManualAction(null)
      setUploadResult(null)
      await refreshPipelineData()
      markWorkflowFinished({
        runId: workflowResponses[0]?.runId || null,
        workflowType: workflowResponses[0]?.workflowType || 'MAIN_PIPELINE',
        contentIdeaId: nextIdeas[0]?.id || null,
        state: 'succeeded',
        message: 'Idee generee. Script en cours.',
      })

      const idea = nextIdeas[0]
      const scriptWorkflowRun = await triggerScriptGenerationWorkflow({
        source: 'backoffice-tiktok-step-creation-script',
        contentIdeaId: idea.id,
        topic: idea.topic,
      })
      markWorkflowStarted({
        runId: scriptWorkflowRun?.runId,
        workflowType: scriptWorkflowRun?.workflowType || 'CHECK_SHOTSTACK',
        contentIdeaId: idea.id,
        message: 'Generation du script en cours.',
      })

      const completedRun = await waitForWorkflowRunCompletion(scriptWorkflowRun?.runId, 60 * 1000)
      let nextScriptedIdea = null

      if (completedRun && String(completedRun.status || '').toUpperCase() === 'SUCCEEDED') {
        const status = await waitForContentIdeaStatus(idea.id, (candidate) => candidate?.pipelineStage === 'SCRIPT_READY', 12_000)
        if (status?.pipelineStage === 'SCRIPT_READY') {
          const ideas = await fetchContentIdeas()
          nextScriptedIdea = ideas.find((item) => Number(item.id) === Number(idea.id)) || null
        }
      }

      if (!nextScriptedIdea || !hasScriptGenerationResult(nextScriptedIdea)) {
        nextScriptedIdea = await waitForScriptGeneration(idea.id, idea)
      }

      setScriptedIdea(nextScriptedIdea)
      setGeneratedIdeas((currentIdeas) => [nextScriptedIdea])
      await refreshPipelineData()
      markWorkflowFinished({
        runId: scriptWorkflowRun?.runId,
        workflowType: scriptWorkflowRun?.workflowType || 'CHECK_SHOTSTACK',
        contentIdeaId: idea.id,
        state: 'succeeded',
        message: 'Idee et script generes.',
      })
      showSuccess('Idee et script generes. Tu peux la regenerer ou valider pour passer a la video.')
    } catch (error) {
      markWorkflowFinished({
        runId: workflowResponses[0]?.runId || null,
        workflowType: workflowResponses[0]?.workflowType || 'MAIN_PIPELINE',
        state: 'failed',
        message: error?.message || "La generation n'a pas abouti.",
      })
      throw error
    }
  }).catch((error) => {
    showError(error, "La generation n'a pas abouti.")
  })

  return { handleGenerateIdea }
}

export function useScriptStep({
  selectedGeneratedIdea,
  scriptedIdea,
  goToStep,
  triggerScriptGenerationWorkflow,
  fetchContentIdeas,
  waitForWorkflowRunCompletion,
  waitForContentIdeaStatus,
  waitForScriptGeneration,
  refreshPipelineData,
  setScriptedIdea,
  setGeneratedIdeas,
  showSuccess,
  showError,
  runAction,
  markWorkflowStarted,
  markWorkflowFinished,
}) {
  const runScriptWorkflow = async ({ idea, source, force = false, successMessage }) => runAction('generateScript', async () => {
    if (!idea?.id) {
      throw new Error('Aucune idee disponible pour cette action.')
    }

    const workflowRun = await triggerScriptGenerationWorkflow({
      source,
      contentIdeaId: idea.id,
      topic: idea.topic,
      force,
    })
    markWorkflowStarted({
      runId: workflowRun?.runId,
      workflowType: workflowRun?.workflowType || 'CHECK_SHOTSTACK',
      contentIdeaId: idea.id,
      message: 'Generation du script en cours.',
    })

    const completedRun = await waitForWorkflowRunCompletion(workflowRun?.runId, 60 * 1000)
    let nextScriptedIdea = null

    if (completedRun && String(completedRun.status || '').toUpperCase() === 'SUCCEEDED') {
      const status = await waitForContentIdeaStatus(idea.id, (candidate) => candidate?.pipelineStage === 'SCRIPT_READY', 12_000)
      if (status?.pipelineStage === 'SCRIPT_READY') {
        const ideas = await fetchContentIdeas()
        nextScriptedIdea = ideas.find((item) => Number(item.id) === Number(idea.id)) || null
      }
    }

    if (!nextScriptedIdea || !hasScriptGenerationResult(nextScriptedIdea)) {
      nextScriptedIdea = await waitForScriptGeneration(idea.id, idea)
    }

    setScriptedIdea(nextScriptedIdea)
    setGeneratedIdeas((currentIdeas) => mergeIdeasById(currentIdeas, [nextScriptedIdea]))
    await refreshPipelineData()
    markWorkflowFinished({
      runId: workflowRun?.runId,
      workflowType: workflowRun?.workflowType || 'CHECK_SHOTSTACK',
      contentIdeaId: idea.id,
      state: 'succeeded',
      message: 'Script, caption et keyword disponibles.',
    })
    showSuccess(successMessage)
  }).catch((error) => {
    showError(error, "La generation script n'a pas abouti.")
  })

  const handleValidateCreation = async () => {
    if (!selectedGeneratedIdea?.id) {
      showError(new Error('Genere une idee avant de valider cette etape.'), 'Genere une idee avant de valider cette etape.')
      return
    }
    goToStep('init-publish')
  }

  const handleRegenerateScript = async () => {
    handleGenerateIdea()
  }

  return { handleValidateCreation, handleRegenerateScript }
}

export function useRenderStep({
  scriptedIdea,
  selectedGeneratedIdea,
  goToStep,
  triggerCheckShotstackWorkflow,
  triggerRenderTemplateWorkflow,
  fetchContentIdeas,
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
}) {
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
    })
    markWorkflowStarted({
      runId: workflowRun?.runId,
      workflowType: workflowRun?.workflowType || 'RENDER_TEMPLATE_VIDEO',
      contentIdeaId: idea.id,
      message: 'Rendu video en cours.',
    })
    showSuccess('Generation video lancee. La video apparaitra ici des qu elle sera prete.')

    const completedRun = await waitForWorkflowRunCompletion(workflowRun?.runId, 12 * 1000)
    let renderedIdea = null

    if (completedRun && String(completedRun.status || '').toUpperCase() === 'SUCCEEDED') {
      const status = await waitForContentIdeaStatus(idea.id, (candidate) => candidate?.pipelineStage === 'RENDER_READY', 20_000)
      if (status?.pipelineStage === 'RENDER_READY') {
        const ideas = await fetchContentIdeas()
        renderedIdea = ideas.find((item) => Number(item.id) === Number(idea.id)) || null
      }
    }

    if (!renderedIdea || !isRenderReady(renderedIdea)) {
      renderedIdea = await waitForRenderedVideo(idea.id, async () => {
        await triggerCheckShotstackWorkflow({
          source: 'backoffice-tiktok-step-render-status-check',
          contentIdeaId: idea.id,
          force: true,
        })
      })
    }

    setScriptedIdea(renderedIdea)
    setGeneratedIdeas((currentIdeas) => mergeIdeasById(currentIdeas, [renderedIdea]))
    setManualAction((currentAction) => ({
      id: renderedIdea.id,
      topic: renderedIdea.topic,
      shotstackUrl: renderedIdea.shotstackUrl || currentAction?.shotstackUrl || '',
      uploadUrl: currentAction?.uploadUrl || '',
      workflowStatus: currentAction?.workflowStatus || 'render_ready',
      tiktokStatus: renderedIdea.tiktokStatus || currentAction?.tiktokStatus || '',
      finalVideoStatus: renderedIdea.finalVideoStatus || currentAction?.finalVideoStatus || '',
      shotstackStatus: renderedIdea.shotstackStatus || currentAction?.shotstackStatus || '',
      pipelineStatus: renderedIdea.pipelineStatus || currentAction?.pipelineStatus || '',
      lastError: renderedIdea.lastError || currentAction?.lastError || null,
    }))
    await refreshPipelineData()
    markWorkflowFinished({
      runId: workflowRun?.runId,
      workflowType: workflowRun?.workflowType || 'RENDER_TEMPLATE_VIDEO',
      contentIdeaId: idea.id,
      state: 'succeeded',
      message: 'Video prete pour revue et upload.',
    })
    showSuccess('Video prete. Verifie le template avant de passer a l upload.')
  }).catch((error) => {
    showError(error, "L'initialisation publish n'a pas abouti.")
  })

  return {
    handleValidateScript,
    handleRetryInitPublish: handleValidateScript,
  }
}

export function useUploadStep({
  scriptedIdea,
  selectedGeneratedIdea,
  manualAction,
  triggerPublishTikTokWorkflow,
  uploadTikTokMedia,
  fetchContentIdeas,
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
}) {
  const handlePrepareUpload = async () => runAction('prepareUpload', async () => {
    const idea = scriptedIdea || selectedGeneratedIdea
    if (!idea?.id) {
      throw new Error('Aucune video disponible pour preparer l upload.')
    }

    const workflowRun = await triggerPublishTikTokWorkflow({
      source: 'backoffice-tiktok-step-upload-prepare',
      contentIdeaId: idea.id,
      topic: idea.topic,
    })
    markWorkflowStarted({
      runId: workflowRun?.runId,
      workflowType: workflowRun?.workflowType || 'INIT_PUBLISH_TIKTOK',
      contentIdeaId: idea.id,
      message: 'Preparation de l upload TikTok en cours.',
    })

    const nextManualAction = await raceWorkflowRunAndUploadPreparation(workflowRun?.runId, idea.id)

    setManualAction((currentAction) => ({
      ...currentAction,
      ...nextManualAction,
    }))
    await refreshPipelineData()
    markWorkflowFinished({
      runId: workflowRun?.runId,
      workflowType: workflowRun?.workflowType || 'INIT_PUBLISH_TIKTOK',
      contentIdeaId: idea.id,
      state: 'succeeded',
      message: 'Upload URL TikTok disponible.',
    })
    showSuccess('Upload URL disponible. Tu peux lancer l upload.')
  }).catch((error) => {
    showError(error, "La preparation de l'upload n'a pas abouti.")
  })

  const handleUploadVideo = async () => runAction('uploadVideo', async () => {
    const idea = scriptedIdea || selectedGeneratedIdea
    if (!idea?.id || !manualAction?.shotstackUrl || !manualAction?.uploadUrl) {
      throw new Error('Il manque la video ou l upload URL pour lancer l upload.')
    }

    markWorkflowStarted({
      workflowType: 'TIKTOK_UPLOAD',
      contentIdeaId: idea.id,
      message: 'Upload TikTok en cours.',
    })

    try {
      const result = await uploadTikTokMedia({
        id: idea.id,
        shotstackUrl: manualAction.shotstackUrl,
        uploadUrl: manualAction.uploadUrl,
      })
      setUploadResult(result || { ok: true })
      await refreshPipelineData()
      markWorkflowFinished({
        workflowType: 'TIKTOK_UPLOAD',
        contentIdeaId: idea.id,
        state: 'succeeded',
        message: 'Upload TikTok termine.',
      })
      showSuccess('Upload termine. Tu peux passer a la publication finale.')
    } catch (error) {
      const [ideas, manualActions] = await Promise.all([
        fetchContentIdeas(),
        fetchManualActions(),
      ])
      const refreshedIdea = ideas.find((item) => Number(item?.id) === Number(idea.id)) || null
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
          contentIdeaId: idea.id,
          state: 'succeeded',
          message: 'Upload termine cote serveur avant le callback.',
        })
        showSuccess('Upload termine cote serveur. La reponse HTTP a probablement expire, mais la video est bien passee en statut upload.')
        return
      }

      markWorkflowFinished({
        workflowType: 'TIKTOK_UPLOAD',
        contentIdeaId: idea.id,
        state: 'failed',
        message: error?.message || "L'upload TikTok n'a pas abouti.",
      })
      throw error
    }
  }).catch((error) => {
    showError(error, "L'upload TikTok n'a pas abouti.")
  })

  return {
    handlePrepareUpload,
    handleUploadVideo,
  }
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
}) {
  const handlePublishVideo = async () => runAction('publishVideo', async () => {
    const idea = scriptedIdea || selectedGeneratedIdea
    if (!idea?.id) {
      throw new Error('Aucune video disponible pour finaliser la publication.')
    }

    markWorkflowStarted({
      workflowType: 'FINALIZE_PUBLISH',
      contentIdeaId: idea.id,
      message: 'Finalisation de la publication en cours.',
    })
    await markPublishComplete(idea.id)
    await refreshPipelineData()
    markWorkflowFinished({
      workflowType: 'FINALIZE_PUBLISH',
      contentIdeaId: idea.id,
      state: 'succeeded',
      message: 'Publication finale enregistree.',
    })
    showSuccess('Video publiee avec succes.')
  }).catch((error) => {
    showError(error, "La publication finale n'a pas abouti.")
  })

  return { handlePublishVideo }
}
