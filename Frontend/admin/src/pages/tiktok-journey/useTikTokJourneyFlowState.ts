import { useCallback, useEffect, useMemo, useReducer } from 'react'
import type { Dispatch, SetStateAction } from 'react'
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

interface JourneyFlowState {
  generatedIdeas: ContentIdea[]
  selectedGeneratedIdeaId: number | null
  generationCount: number | string
  lastGenerationBaselineId: number | null
  lastGenerationExpectedCount: number
  scriptedIdea: ContentIdea | null
  manualAction: ManualActionState | null
  uploadResult: unknown
  errorMessage: string | null
  successMessage: string | null
  currentStepIndex: number
  activeWorkflowType: string | null
  isGenerationInProgress: boolean
  isWorkflowInProgress: boolean
}

type JourneyFlowAction =
  | { type: 'PIPELINE_RESET'; stepIndex: number }
  | { type: 'WORKSPACE_RESET' }
  | { type: 'IDEAS_GENERATED'; ideas: ContentIdea[] }
  | { type: 'IDEA_SELECTED'; ideaId: number | null }
  | { type: 'STEP_CHANGED'; stepIndex: number }
  | { type: 'GENERATION_STARTED'; baselineId?: number | null; expectedCount?: number }
  | { type: 'GENERATION_FAILED'; errorMessage: string }
  | { type: 'WORKFLOW_STARTED'; workflowType?: string | null }
  | { type: 'WORKFLOW_COMPLETED'; message?: string | null; workflowType?: string | null }
  | { type: 'WORKFLOW_FAILED'; errorMessage: string; workflowType?: string | null }
  | { type: 'GENERATION_COUNT_SET'; value: number | string }
  | { type: 'GENERATION_BASELINE_SET'; value: number | null }
  | { type: 'GENERATION_EXPECTED_COUNT_SET'; value: number }
  | { type: 'SCRIPTED_IDEA_SET'; value: ContentIdea | null }
  | { type: 'MANUAL_ACTION_SET'; value: ManualActionState | null }
  | { type: 'UPLOAD_RESULT_SET'; value: unknown }
  | { type: 'ERROR_MESSAGE_SET'; value: string | null }
  | { type: 'SUCCESS_MESSAGE_SET'; value: string | null }

const INITIAL_JOURNEY_FLOW_STATE: JourneyFlowState = {
  generatedIdeas: [],
  selectedGeneratedIdeaId: null,
  generationCount: 1,
  lastGenerationBaselineId: null,
  lastGenerationExpectedCount: 0,
  scriptedIdea: null,
  manualAction: null,
  uploadResult: null,
  errorMessage: null,
  successMessage: null,
  currentStepIndex: -1,
  activeWorkflowType: null,
  isGenerationInProgress: false,
  isWorkflowInProgress: false,
}

function journeyFlowReducer(state: JourneyFlowState, action: JourneyFlowAction): JourneyFlowState {
  switch (action.type) {
    case 'PIPELINE_RESET':
      return {
        ...INITIAL_JOURNEY_FLOW_STATE,
        currentStepIndex: action.stepIndex,
      }
    case 'WORKSPACE_RESET':
      return {
        ...state,
        generatedIdeas: [],
        selectedGeneratedIdeaId: null,
        scriptedIdea: null,
        manualAction: null,
        uploadResult: null,
        activeWorkflowType: null,
        isGenerationInProgress: false,
        isWorkflowInProgress: false,
      }
    case 'IDEAS_GENERATED':
      return {
        ...state,
        generatedIdeas: action.ideas,
        selectedGeneratedIdeaId: action.ideas[0]?.id ?? state.selectedGeneratedIdeaId,
        isGenerationInProgress: false,
        errorMessage: null,
      }
    case 'IDEA_SELECTED':
      return {
        ...state,
        selectedGeneratedIdeaId: action.ideaId,
      }
    case 'STEP_CHANGED':
      return {
        ...state,
        currentStepIndex: action.stepIndex,
      }
    case 'GENERATION_STARTED':
      return {
        ...state,
        generatedIdeas: [],
        selectedGeneratedIdeaId: null,
        scriptedIdea: null,
        manualAction: null,
        uploadResult: null,
        errorMessage: null,
        successMessage: null,
        isGenerationInProgress: true,
        lastGenerationBaselineId: action.baselineId ?? state.lastGenerationBaselineId,
        lastGenerationExpectedCount: action.expectedCount ?? state.lastGenerationExpectedCount,
      }
    case 'GENERATION_FAILED':
      return {
        ...state,
        isGenerationInProgress: false,
        successMessage: null,
        errorMessage: action.errorMessage,
      }
    case 'WORKFLOW_STARTED':
      return {
        ...state,
        activeWorkflowType: action.workflowType ?? state.activeWorkflowType,
        isWorkflowInProgress: true,
        errorMessage: null,
      }
    case 'WORKFLOW_COMPLETED':
      return {
        ...state,
        activeWorkflowType: action.workflowType ?? state.activeWorkflowType,
        isWorkflowInProgress: false,
        errorMessage: null,
        successMessage: action.message ?? state.successMessage,
      }
    case 'WORKFLOW_FAILED':
      return {
        ...state,
        activeWorkflowType: action.workflowType ?? state.activeWorkflowType,
        isWorkflowInProgress: false,
        successMessage: null,
        errorMessage: action.errorMessage,
      }
    case 'GENERATION_COUNT_SET':
      return {
        ...state,
        generationCount: action.value,
      }
    case 'GENERATION_BASELINE_SET':
      return {
        ...state,
        lastGenerationBaselineId: action.value,
      }
    case 'GENERATION_EXPECTED_COUNT_SET':
      return {
        ...state,
        lastGenerationExpectedCount: action.value,
      }
    case 'SCRIPTED_IDEA_SET':
      return {
        ...state,
        scriptedIdea: action.value,
      }
    case 'MANUAL_ACTION_SET':
      return {
        ...state,
        manualAction: action.value,
      }
    case 'UPLOAD_RESULT_SET':
      return {
        ...state,
        uploadResult: action.value,
      }
    case 'ERROR_MESSAGE_SET':
      return {
        ...state,
        errorMessage: action.value,
      }
    case 'SUCCESS_MESSAGE_SET':
      return {
        ...state,
        successMessage: action.value,
      }
    default:
      return state
  }
}

function resolveSetStateAction<T>(value: SetStateAction<T>, currentValue: T): T {
  return typeof value === 'function'
    ? (value as (previousState: T) => T)(currentValue)
    : value
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
  const [state, dispatch] = useReducer(journeyFlowReducer, {
    ...INITIAL_JOURNEY_FLOW_STATE,
    currentStepIndex,
  })

  const isFlowRoute = state.currentStepIndex >= 0
  const isJourneyReady = Boolean(accountsReadiness?.ready && hasConnectedTikTokAccount)

  const displayedGeneratedIdeas = useMemo(() => {
    if (state.generatedIdeas.length) return state.generatedIdeas
    if (state.lastGenerationBaselineId == null) return []

    return contentIdeas
      .filter((idea) => Number(idea?.id || 0) > Number(state.lastGenerationBaselineId))
      .filter((idea) => {
        const expectedCategory = normalizeText(generationCategory)
        const currentCategory = normalizeText(idea?.category)
        return !expectedCategory || !currentCategory || currentCategory === expectedCategory
      })
      .sort((left, right) => Number(right?.id || 0) - Number(left?.id || 0))
      .slice(0, state.lastGenerationExpectedCount || maxIdeaBatchSize)
  }, [
    contentIdeas,
    generationCategory,
    maxIdeaBatchSize,
    normalizeText,
    state.generatedIdeas,
    state.lastGenerationBaselineId,
    state.lastGenerationExpectedCount,
  ])

  const selectedGeneratedIdea = useMemo(
    () => displayedGeneratedIdeas.find((idea) => Number(idea.id) === Number(state.selectedGeneratedIdeaId)) || displayedGeneratedIdeas[0] || null,
    [displayedGeneratedIdeas, state.selectedGeneratedIdeaId],
  )

  useEffect(() => {
    dispatch({ type: 'STEP_CHANGED', stepIndex: currentStepIndex })
  }, [currentStepIndex])

  useEffect(() => {
    if (currentStepIndex >= 0) return
    dispatch({ type: 'PIPELINE_RESET', stepIndex: currentStepIndex })
  }, [currentStepIndex])

  useEffect(() => {
    if (!locationState?.tiktokOAuthSuccess && !locationState?.accountsWarning) return
    if (locationState?.tiktokOAuthSuccess) {
      dispatch({ type: 'WORKFLOW_COMPLETED', message: locationState.tiktokOAuthSuccess })
    }
    if (locationState?.accountsWarning) {
      dispatch({ type: 'WORKFLOW_FAILED', errorMessage: locationState.accountsWarning })
    }
    window.history.replaceState({}, document.title)
  }, [locationState])

  const setGeneratedIdeas = useCallback((value: SetStateAction<ContentIdea[]>) => {
    const nextIdeas = resolveSetStateAction(value, state.generatedIdeas)
    dispatch({ type: 'IDEAS_GENERATED', ideas: nextIdeas })
  }, [state.generatedIdeas])

  const setSelectedGeneratedIdeaId = useCallback((value: SetStateAction<number | null>) => {
    dispatch({
      type: 'IDEA_SELECTED',
      ideaId: resolveSetStateAction(value, state.selectedGeneratedIdeaId),
    })
  }, [state.selectedGeneratedIdeaId])

  const setGenerationCount = useCallback((value: SetStateAction<number | string>) => {
    dispatch({
      type: 'GENERATION_COUNT_SET',
      value: resolveSetStateAction(value, state.generationCount),
    })
  }, [state.generationCount])

  const setLastGenerationBaselineId = useCallback((value: SetStateAction<number | null>) => {
    const nextValue = resolveSetStateAction(value, state.lastGenerationBaselineId)
    dispatch({ type: 'GENERATION_STARTED', baselineId: nextValue })
  }, [state.lastGenerationBaselineId])

  const setLastGenerationExpectedCount = useCallback((value: SetStateAction<number>) => {
    const nextValue = resolveSetStateAction(value, state.lastGenerationExpectedCount)
    dispatch({ type: 'GENERATION_STARTED', expectedCount: nextValue })
  }, [state.lastGenerationExpectedCount])

  const setScriptedIdea = useCallback((value: SetStateAction<ContentIdea | null>) => {
    dispatch({
      type: 'SCRIPTED_IDEA_SET',
      value: resolveSetStateAction(value, state.scriptedIdea),
    })
  }, [state.scriptedIdea])

  const setManualAction = useCallback((value: SetStateAction<ManualActionState | null>) => {
    dispatch({
      type: 'MANUAL_ACTION_SET',
      value: resolveSetStateAction(value, state.manualAction),
    })
  }, [state.manualAction])

  const setUploadResult = useCallback((value: SetStateAction<unknown>) => {
    dispatch({
      type: 'UPLOAD_RESULT_SET',
      value: resolveSetStateAction(value, state.uploadResult),
    })
  }, [state.uploadResult])

  const setErrorMessage = useCallback((value: SetStateAction<string | null>) => {
    dispatch({
      type: 'ERROR_MESSAGE_SET',
      value: resolveSetStateAction(value, state.errorMessage),
    })
  }, [state.errorMessage])

  const setSuccessMessage = useCallback((value: SetStateAction<string | null>) => {
    dispatch({
      type: 'SUCCESS_MESSAGE_SET',
      value: resolveSetStateAction(value, state.successMessage),
    })
  }, [state.successMessage])

  const showSuccess = useCallback((message: string) => {
    dispatch({ type: 'WORKFLOW_COMPLETED', message })
  }, [])

  const showError = useCallback((errorOrMessage: unknown, fallback?: string) => {
    const errorMessage =
      typeof errorOrMessage === 'string'
        ? errorOrMessage
        : errorOrMessage instanceof Error
        ? errorOrMessage.message
        : fallback ?? 'Une erreur est survenue.'

    dispatch({
      type: 'GENERATION_FAILED',
      errorMessage,
    })
  }, [])

  const resetGeneratedIdeasState = useCallback(() => {
    dispatch({ type: 'WORKSPACE_RESET' })
  }, [])

  const resetFlowState = useCallback(() => {
    dispatch({ type: 'PIPELINE_RESET', stepIndex: state.currentStepIndex })
  }, [state.currentStepIndex])

  const goToStep = useCallback((stepId: string) => {
    dispatch({ type: 'WORKFLOW_STARTED', workflowType: stepId })
    navigate(`${tiktokBaseRoute}/${stepId}`)
  }, [navigate, tiktokBaseRoute])

  const startAddFlow = useCallback(() => {
    if (!isJourneyReady) {
      const missingItems = accountsReadiness?.missingItems?.length
        ? accountsReadiness.missingItems.join(', ')
        : 'des comptes requis'
      const message = `Connecte d abord ${missingItems} dans Accounts avant de lancer la generation.`
      dispatch({ type: 'WORKFLOW_FAILED', errorMessage: message, workflowType: 'creation' })
      navigate('/accounts', {
        state: {
          accountsWarning: message,
        },
      })
      return
    }

    dispatch({ type: 'PIPELINE_RESET', stepIndex: state.currentStepIndex })
    navigate(`${tiktokBaseRoute}/creation`)
  }, [accountsReadiness, isJourneyReady, navigate, state.currentStepIndex, tiktokBaseRoute])

  const closeAddFlow = useCallback(() => {
    dispatch({ type: 'PIPELINE_RESET', stepIndex: -1 })
    navigate(tiktokBaseRoute)
  }, [navigate, tiktokBaseRoute])

  const goBackInFlow = useCallback(() => {
    if (!isFlowRoute) {
      navigate(tiktokBaseRoute)
      return
    }

    if (state.currentStepIndex <= 0) {
      closeAddFlow()
      return
    }

    navigate(stepRoutes[state.currentStepIndex - 1])
  }, [closeAddFlow, isFlowRoute, navigate, state.currentStepIndex, stepRoutes, tiktokBaseRoute])

  return {
    displayedGeneratedIdeas,
    errorMessage: state.errorMessage,
    generatedIdeas: state.generatedIdeas,
    generationCount: state.generationCount,
    goBackInFlow,
    goToStep,
    isFlowRoute,
    isJourneyReady,
    lastGenerationBaselineId: state.lastGenerationBaselineId,
    lastGenerationExpectedCount: state.lastGenerationExpectedCount,
    manualAction: state.manualAction,
    resetFlowState,
    resetGeneratedIdeasState,
    scriptedIdea: state.scriptedIdea,
    selectedGeneratedIdea,
    selectedGeneratedIdeaId: state.selectedGeneratedIdeaId,
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
    successMessage: state.successMessage,
    uploadResult: state.uploadResult,
  }
}

export type {
  JourneyFlowAction,
  JourneyFlowState,
}
