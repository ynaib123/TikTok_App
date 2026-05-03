import { useEffect, useMemo, useState } from 'react'
import type { NavigateFunction } from 'react-router-dom'
import type { AccountsReadiness, ContentIdea } from '../../types'

interface JourneyFlowStateArgs {
  accountsReadiness: AccountsReadiness
  contentIdeas: ContentIdea[]
  currentStepIndex: number
  generationCategory: string
  hasConnectedTikTokAccount: boolean
  locationState: { tiktokOAuthSuccess?: string; accountsWarning?: string } | null | undefined
  maxIdeaBatchSize: number
  navigate: NavigateFunction
  normalizeText: (value: string | null | undefined) => string
  stepRoutes: string[]
  tiktokBaseRoute: string
}

interface ManualActionState {
  shotstackUrl?: string | null
  uploadUrl?: string | null
  [key: string]: unknown
}

export function useTikTokJourneyFlowState({
  accountsReadiness,
  contentIdeas,
  currentStepIndex,
  generationCategory,
  hasConnectedTikTokAccount,
  locationState,
  maxIdeaBatchSize,
  navigate,
  normalizeText,
  stepRoutes,
  tiktokBaseRoute,
}: JourneyFlowStateArgs) {
  const [generatedIdeas, setGeneratedIdeas] = useState<ContentIdea[]>([])
  const [selectedGeneratedIdeaId, setSelectedGeneratedIdeaId] = useState<number | null>(null)
  const [generationCount, setGenerationCount] = useState<number | string>(1)
  const [lastGenerationBaselineId, setLastGenerationBaselineId] = useState<number | null>(null)
  const [lastGenerationExpectedCount, setLastGenerationExpectedCount] = useState(0)
  const [scriptedIdea, setScriptedIdea] = useState<ContentIdea | null>(null)
  const [manualAction, setManualAction] = useState<ManualActionState | null>(null)
  const [uploadResult, setUploadResult] = useState<unknown>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const isFlowRoute = currentStepIndex >= 0
  const isJourneyReady = Boolean(accountsReadiness?.ready && hasConnectedTikTokAccount)

  const displayedGeneratedIdeas = useMemo(() => {
    if (generatedIdeas.length) return generatedIdeas
    if (lastGenerationBaselineId == null) return []

    return contentIdeas
      .filter((idea) => Number(idea?.id || 0) > Number(lastGenerationBaselineId))
      .filter((idea) => {
        const expectedCategory = normalizeText(generationCategory)
        const currentCategory = normalizeText(idea?.category)
        return !expectedCategory || !currentCategory || currentCategory === expectedCategory
      })
      .sort((left, right) => Number(right?.id || 0) - Number(left?.id || 0))
      .slice(0, lastGenerationExpectedCount || maxIdeaBatchSize)
  }, [contentIdeas, generatedIdeas, generationCategory, lastGenerationBaselineId, lastGenerationExpectedCount, maxIdeaBatchSize, normalizeText])

  const selectedGeneratedIdea = useMemo(
    () => displayedGeneratedIdeas.find((idea) => Number(idea.id) === Number(selectedGeneratedIdeaId)) || displayedGeneratedIdeas[0] || null,
    [displayedGeneratedIdeas, selectedGeneratedIdeaId],
  )

  const showSuccess = (message: string) => {
    setErrorMessage(null)
    setSuccessMessage(message)
  }

  const showError = (error: unknown, fallback: string) => {
    setSuccessMessage(null)
    setErrorMessage(error instanceof Error ? error.message : fallback)
  }

  const resetGeneratedIdeasState = () => {
    setGeneratedIdeas([])
    setSelectedGeneratedIdeaId(null)
    setScriptedIdea(null)
    setManualAction(null)
    setUploadResult(null)
  }

  const resetFlowState = () => {
    resetGeneratedIdeasState()
    setLastGenerationBaselineId(null)
    setLastGenerationExpectedCount(0)
    setErrorMessage(null)
    setSuccessMessage(null)
  }

  useEffect(() => {
    if (isFlowRoute) return
    resetFlowState()
  }, [isFlowRoute])

  useEffect(() => {
    if (!locationState?.tiktokOAuthSuccess && !locationState?.accountsWarning) return
    if (locationState?.tiktokOAuthSuccess) {
      setSuccessMessage(locationState.tiktokOAuthSuccess)
    }
    if (locationState?.accountsWarning) {
      setErrorMessage(locationState.accountsWarning)
    }
    window.history.replaceState({}, document.title)
  }, [locationState])

  const goToStep = (stepId: string) => {
    navigate(`${tiktokBaseRoute}/${stepId}`)
  }

  const startAddFlow = () => {
    if (!isJourneyReady) {
      const missingItems = accountsReadiness?.missingItems?.length
        ? accountsReadiness.missingItems.join(', ')
        : 'des comptes requis'
      const message = `Connecte d abord ${missingItems} dans Accounts avant de lancer la generation.`
      setErrorMessage(message)
      navigate('/accounts', {
        state: {
          accountsWarning: message,
        },
      })
      return
    }
    resetFlowState()
    goToStep('creation')
  }

  const closeAddFlow = () => {
    resetFlowState()
    navigate(tiktokBaseRoute)
  }

  const goBackInFlow = () => {
    if (!isFlowRoute) {
      navigate(tiktokBaseRoute)
      return
    }

    if (currentStepIndex <= 0) {
      closeAddFlow()
      return
    }

    navigate(stepRoutes[currentStepIndex - 1])
  }

  return {
    displayedGeneratedIdeas,
    errorMessage,
    generatedIdeas,
    generationCount,
    goBackInFlow,
    goToStep,
    isFlowRoute,
    isJourneyReady,
    lastGenerationBaselineId,
    lastGenerationExpectedCount,
    manualAction,
    resetFlowState,
    resetGeneratedIdeasState,
    scriptedIdea,
    selectedGeneratedIdea,
    selectedGeneratedIdeaId,
    setErrorMessage,
    setGeneratedIdeas,
    setGenerationCount,
    setLastGenerationBaselineId,
    setLastGenerationExpectedCount,
    setManualAction,
    setScriptedIdea,
    setSelectedGeneratedIdeaId,
    setSuccessMessage,
    setUploadResult,
    showError,
    showSuccess,
    startAddFlow,
    successMessage,
    uploadResult,
  }
}
