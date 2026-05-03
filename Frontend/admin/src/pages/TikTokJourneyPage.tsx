// @ts-nocheck
import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import AdminShell from '../components/AdminShell'
import { useTikTokWorkflow } from '../hooks'
import {
  triggerCheckShotstackWorkflow,
  triggerMainContentPipeline,
  triggerPublishTikTokWorkflow,
  triggerRenderTemplateWorkflow,
  triggerScriptGenerationWorkflow,
} from '../services/n8nClient'
import {
  fetchContentIdeas,
  fetchContentIdeaStatus,
  fetchManualActions,
  fetchWorkflowRun,
  markPublishComplete,
  uploadTikTokMedia,
} from '../services/videoOpsSupabase'
import TikTokLibraryView from './tiktok-journey/TikTokLibraryView'
import TikTokStepScreen from './tiktok-journey/TikTokStepScreen'
import { useActionState } from './tiktok-journey/useActionState'
import { useTikTokJourneyFlowState } from './tiktok-journey/useTikTokJourneyFlowState'
import { useTikTokJourneyListState } from './tiktok-journey/useTikTokJourneyListState'
import {
  useCreationStep,
  usePublishStep,
  useRenderStep,
  useScriptStep,
  useUploadStep,
} from './tiktok-journey/useTikTokJourneySteps'
import { useWorkflowMonitor } from './tiktok-journey/useWorkflowMonitor'
import WorkflowObservabilityPanel from './tiktok-journey/WorkflowObservabilityPanel'
import WorkflowStatusPanel from './tiktok-journey/WorkflowStatusPanel'
import '../styles/features/catalog-shared.css'
import '../styles/features/products.css'
import '../styles/themes/products-dark.css'
import type { ContentIdea, TikTokAccount } from '../types'

const STEPS = [
  { id: 'creation', label: 'Creation' },
  { id: 'script', label: 'Script' },
  { id: 'init-publish', label: 'Video' },
  { id: 'upload', label: 'Upload' },
  { id: 'publish', label: 'Publish' },
]
const TIKTOK_BASE_ROUTE = '/tiktok'
const TIKTOK_STEP_ROUTES = STEPS.map((step) => `${TIKTOK_BASE_ROUTE}/${step.id}`)

const LIST_FILTER_OPTIONS = [
  { value: 'all', label: 'Toutes' },
  { value: 'published', label: 'Publiees' },
  { value: 'unpublished', label: 'Non publiees' },
  { value: 'ready', label: 'Rendues' },
]

const LIST_SORT_OPTIONS = [
  { value: 'recent', label: 'Plus recentes' },
  { value: 'oldest', label: 'Plus anciennes' },
  { value: 'topic_asc', label: 'Topic A-Z' },
  { value: 'topic_desc', label: 'Topic Z-A' },
  { value: 'published_first', label: 'Publiees d abord' },
]
const TIKTOK_CATEGORY_OPTIONS = ['Food', 'Love', 'Sport', 'Fitness', 'Beauty']
const MAX_IDEA_BATCH_SIZE = 5

function isRenderReady(idea: ContentIdea | null | undefined) {
  return Boolean(idea?.shotstackUrl)
    || idea?.finalVideoStatus === 'ready'
    || idea?.shotstackStatus === 'done'
}

function isPublished(idea: ContentIdea | null | undefined) {
  return String(idea?.tiktokStatus || '').toLowerCase() === 'published'
}

function normalizeText(value: string | null | undefined) {
  return String(value || '').trim().toLowerCase()
}

function formatShortOpenId(value: string | null | undefined) {
  const normalized = String(value || '').trim()
  if (!normalized) return '-'
  if (normalized.length <= 18) return normalized
  return `${normalized.slice(0, 8)}...${normalized.slice(-6)}`
}

function getIdeaStatusLabel(idea: ContentIdea | null | undefined) {
  if (isPublished(idea)) return 'publiee'
  if (String(idea?.tiktokStatus || '').toLowerCase() === 'uploaded') return 'uploadee'
  if (String(idea?.tiktokStatus || '').toLowerCase() === 'uploading') return 'publication en cours'
  if (idea?.uploadUrl) return 'prete upload'
  if (isRenderReady(idea)) return 'rendue'
  if (idea?.shotstackStatus === 'rendering') return 'rendering'
  return idea?.tiktokStatus || 'draft'
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </svg>
  )
}

function FilterIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6h16" />
      <path d="M7 12h10" />
      <path d="M10 18h4" />
    </svg>
  )
}

function SortIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 6h10" />
      <path d="M8 12h7" />
      <path d="M8 18h4" />
      <path d="m4 8 2-2 2 2" />
      <path d="M6 6v12" />
    </svg>
  )
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="6" height="6" rx="1.2" />
      <rect x="14" y="4" width="6" height="6" rx="1.2" />
      <rect x="4" y="14" width="6" height="6" rx="1.2" />
      <rect x="14" y="14" width="6" height="6" rx="1.2" />
    </svg>
  )
}

function TableIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="5" width="17" height="14" rx="1.5" />
      <path d="M3.5 10h17" />
      <path d="M9 5v14" />
    </svg>
  )
}

function AddIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  )
}

function BackChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m14.5 6.5-5.5 5.5 5.5 5.5" />
    </svg>
  )
}

function StepProgress({
  currentStepIndex,
  onBack,
  isWorking,
}: {
  currentStepIndex: number
  onBack: () => void
  isWorking: boolean
}) {
  const progressPercent = Math.round((currentStepIndex / (STEPS.length - 1)) * 100)

  return (
    <div className="tiktok-flow-progress" aria-label="Progression">
      <div className="tiktok-flow-progress-bar">
        <span style={{ width: `${progressPercent}%` }} />
      </div>
      <div className="tiktok-flow-progress-steps-row">
        <button
          type="button"
          className="tiktok-step-back-btn"
          onClick={onBack}
          disabled={isWorking}
          aria-label="Revenir en arriere"
          title="Revenir en arriere"
        >
          <BackChevronIcon />
        </button>
        <div className="tiktok-flow-progress-steps">
          {STEPS.map((step, index) => (
            <div
              key={step.id}
              className={`tiktok-flow-progress-step ${index < currentStepIndex ? 'is-done' : ''} ${index === currentStepIndex ? 'is-current' : ''}`}
            >
              <span>{index + 1}</span>
              <div className="tiktok-flow-progress-step-copy">
                <strong>{step.label}</strong>
                <p>Etape {index + 1}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function VideoPreview({ url }: { url: string | null | undefined }) {
  if (!url) return null
  return <video className="tiktok-flow-video" src={url} controls playsInline />
}

export default function TikTokJourneyPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    accountsReadiness,
    contentIdeas,
    contentIdeasQuery,
    observability,
    refreshPipelineData,
    tiktokAccounts,
  } = useTikTokWorkflow()
  const { busyActions, isBusy, runAction } = useActionState()
  const [generationCategory, setGenerationCategory] = useState(TIKTOK_CATEGORY_OPTIONS[0])

  const currentStepIndex = useMemo(
    () => TIKTOK_STEP_ROUTES.findIndex((route) => location.pathname === route),
    [location.pathname],
  )

  const connectedTikTokAccount = useMemo<TikTokAccount | null>(
    () => tiktokAccounts.find((account) => String(account?.openId || '').trim() || String(account?.scope || '').trim()) || null,
    [tiktokAccounts],
  )

  const hasConnectedTikTokAccount = Boolean(connectedTikTokAccount)
  const isLoading = contentIdeasQuery.isLoading

  const flowState = useTikTokJourneyFlowState({
    accountsReadiness,
    contentIdeas,
    currentStepIndex,
    generationCategory,
    hasConnectedTikTokAccount,
    locationState: location.state,
    maxIdeaBatchSize: MAX_IDEA_BATCH_SIZE,
    navigate,
    normalizeText,
    stepRoutes: TIKTOK_STEP_ROUTES,
    tiktokBaseRoute: TIKTOK_BASE_ROUTE,
  })

  const {
    displayedGeneratedIdeas,
    errorMessage,
    generationCount,
    goBackInFlow,
    goToStep,
    isFlowRoute,
    isJourneyReady,
    manualAction,
    resetGeneratedIdeasState,
    resetFlowState,
    scriptedIdea,
    selectedGeneratedIdea,
    setErrorMessage,
    setGeneratedIdeas,
    setGenerationCount,
    setLastGenerationBaselineId,
    setLastGenerationExpectedCount,
    setManualAction,
    setScriptedIdea,
    setSelectedGeneratedIdeaId,
    setUploadResult,
    showError,
    showSuccess,
    startAddFlow,
    successMessage,
    uploadResult,
  } = flowState

  const listState = useTikTokJourneyListState({
    contentIdeas,
    listFilterOptions: LIST_FILTER_OPTIONS,
    listSortOptions: LIST_SORT_OPTIONS,
    isPublished,
    isRenderReady,
    getIdeaStatusLabel,
  })

  const {
    catalogTags,
    filteredIdeas,
    hasClearableCatalogTags,
    listFilter,
    listSearch,
    listSort,
    listViewMode,
    openListMenu,
    resetAllCatalogTags,
    selectedListFilter,
    selectedListSort,
    setListFilter,
    setListSearch,
    setListSort,
    setListViewMode,
    setOpenListMenu,
  } = listState

  const isGeneratingIdeas = Boolean(busyActions.generateIdea)
  const isGeneratingScript = Boolean(busyActions.generateScript)
  const isPreparingVideo = Boolean(busyActions.renderVideo)
  const isPreparingUpload = Boolean(busyActions.prepareUpload)
  const isUploadingVideo = Boolean(busyActions.uploadVideo)
  const isPublishingVideo = Boolean(busyActions.publishVideo)

  const workflowMonitor = useWorkflowMonitor({
    fetchContentIdeas,
    fetchManualActions,
    fetchContentIdeaStatus,
    fetchWorkflowRun,
  })

  const { handleGenerateIdea } = useCreationStep({
    displayedGeneratedIdeas,
    generationCategory,
    generationCount,
    connectedTikTokAccount,
    fetchContentIdeas,
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
    waitForNewIdeas: workflowMonitor.waitForNewIdeas,
    showSuccess,
    showError,
    runAction,
    markWorkflowStarted: workflowMonitor.markWorkflowStarted,
    markWorkflowFinished: workflowMonitor.markWorkflowFinished,
  })

  const { handleValidateCreation, handleRegenerateScript } = useScriptStep({
    selectedGeneratedIdea,
    scriptedIdea,
    goToStep,
    triggerScriptGenerationWorkflow,
    fetchContentIdeas,
    waitForWorkflowRunCompletion: workflowMonitor.waitForWorkflowRunCompletion,
    waitForContentIdeaStatus: workflowMonitor.waitForContentIdeaStatus,
    waitForScriptGeneration: workflowMonitor.waitForScriptGeneration,
    refreshPipelineData,
    setScriptedIdea,
    setGeneratedIdeas,
    showSuccess,
    showError,
    runAction,
    markWorkflowStarted: workflowMonitor.markWorkflowStarted,
    markWorkflowFinished: workflowMonitor.markWorkflowFinished,
  })

  const { handleValidateScript, handleRetryInitPublish } = useRenderStep({
    scriptedIdea,
    selectedGeneratedIdea,
    goToStep,
    triggerCheckShotstackWorkflow,
    triggerRenderTemplateWorkflow,
    fetchContentIdeas,
    waitForWorkflowRunCompletion: workflowMonitor.waitForWorkflowRunCompletion,
    waitForContentIdeaStatus: workflowMonitor.waitForContentIdeaStatus,
    waitForRenderedVideo: workflowMonitor.waitForRenderedVideo,
    refreshPipelineData,
    setScriptedIdea,
    setGeneratedIdeas,
    setManualAction,
    showSuccess,
    showError,
    runAction,
    markWorkflowStarted: workflowMonitor.markWorkflowStarted,
    markWorkflowFinished: workflowMonitor.markWorkflowFinished,
  })

  const { handlePrepareUpload, handleUploadVideo } = useUploadStep({
    scriptedIdea,
    selectedGeneratedIdea,
    manualAction,
    triggerPublishTikTokWorkflow,
    uploadTikTokMedia,
    fetchContentIdeas,
    fetchManualActions,
    raceWorkflowRunAndUploadPreparation: workflowMonitor.raceWorkflowRunAndUploadPreparation,
    refreshPipelineData,
    setManualAction,
    setScriptedIdea,
    setGeneratedIdeas,
    setUploadResult,
    showSuccess,
    showError,
    runAction,
    markWorkflowStarted: workflowMonitor.markWorkflowStarted,
    markWorkflowFinished: workflowMonitor.markWorkflowFinished,
    isUploadCompleted: workflowMonitor.isUploadCompleted,
  })

  const { handlePublishVideo } = usePublishStep({
    scriptedIdea,
    selectedGeneratedIdea,
    markPublishComplete,
    refreshPipelineData,
    showSuccess,
    showError,
    runAction,
    markWorkflowStarted: workflowMonitor.markWorkflowStarted,
    markWorkflowFinished: workflowMonitor.markWorkflowFinished,
  })

  const activeIdea = scriptedIdea || selectedGeneratedIdea
  const currentStep = isFlowRoute ? STEPS[currentStepIndex] : STEPS[0]

  const handleValidateInitPublish = () => {
    const previewUrl = manualAction?.shotstackUrl || scriptedIdea?.shotstackUrl || selectedGeneratedIdea?.shotstackUrl
    if (!previewUrl) {
      setErrorMessage('Aucune video generee disponible pour cette etape.')
      return
    }

    goToStep('upload')
    showSuccess('Template video valide. Tu peux preparer l upload.')
  }

  const handleValidateUpload = () => {
    if (!uploadResult) {
      setErrorMessage('Lance l upload avant de valider cette etape.')
      return
    }

    goToStep('publish')
    showSuccess('Upload valide. Derniere etape: publication.')
  }

  const stepScreen = TikTokStepScreen({
    ChevronDownIcon,
    VideoPreview,
    activeIdea,
    connectedTikTokAccount,
    currentStep,
    displayedGeneratedIdeas,
    formatShortOpenId,
    generationCategory,
    generationCount,
    handleGenerateIdea,
    handlePrepareUpload,
    handlePublishVideo,
    handleRegenerateScript,
    handleRetryInitPublish,
    handleUploadVideo,
    handleValidateCreation,
    handleValidateInitPublish,
    handleValidateScript,
    handleValidateUpload,
    hasConnectedTikTokAccount,
    isBusy,
    isGeneratingIdeas,
    isGeneratingScript,
    isJourneyReady,
    isPreparingUpload,
    isPreparingVideo,
    isPublishingVideo,
    isUploadingVideo,
    manualAction,
    maxIdeaBatchSize: MAX_IDEA_BATCH_SIZE,
    navigate,
    openListMenu,
    scriptedIdea,
    selectedGeneratedIdea,
    setGenerationCategory,
    setGenerationCount,
    setOpenListMenu,
    setSelectedGeneratedIdeaId,
    successMessage,
    tiktokCategoryOptions: TIKTOK_CATEGORY_OPTIONS,
    uploadResult,
  })

  return (
    <div className="admin-page admin-page-products admin-page-tiktok video-ops-page">
      <AdminShell
        activeNavId="tiktok"
        feedbackItems={[
          { type: 'error', message: errorMessage },
          { type: 'success', message: successMessage },
        ]}
      >
        <div className="video-ops-shell">
          {!isFlowRoute ? (
            <TikTokLibraryView
              AddIcon={AddIcon}
              FilterIcon={FilterIcon}
              GridIcon={GridIcon}
              SearchIcon={SearchIcon}
              SortIcon={SortIcon}
              TableIcon={TableIcon}
              catalogTags={catalogTags}
              contentIdeas={contentIdeas}
              filteredIdeas={filteredIdeas}
              getIdeaStatusLabel={getIdeaStatusLabel}
              handleResetAllCatalogTags={resetAllCatalogTags}
              hasClearableCatalogTags={hasClearableCatalogTags}
              isJourneyReady={isJourneyReady}
              isLoading={isLoading}
              isPublished={isPublished}
              isRenderReady={isRenderReady}
              listFilter={listFilter}
              listFilterOptions={LIST_FILTER_OPTIONS}
              listSearch={listSearch}
              listSort={listSort}
              listSortOptions={LIST_SORT_OPTIONS}
              listViewMode={listViewMode}
              navigate={navigate}
              openListMenu={openListMenu}
              selectedListFilter={selectedListFilter}
              selectedListSort={selectedListSort}
              setListFilter={setListFilter}
              setListSearch={setListSearch}
              setListSort={setListSort}
              setListViewMode={setListViewMode}
              setOpenListMenu={setOpenListMenu}
              startAddFlow={startAddFlow}
            />
          ) : (
            <section className="tiktok-flow">
              <div className="tiktok-page-toolbar tiktok-flow-topbar">
                <StepProgress currentStepIndex={currentStepIndex} onBack={goBackInFlow} isWorking={isBusy} />
              </div>

              <WorkflowStatusPanel status={workflowMonitor.workflowStatus} />
              <WorkflowObservabilityPanel observability={observability} />

              <div className="tiktok-step-screen">
                <section className="tiktok-step-pane is-left">
                  <div className="video-panel-head">
                    <h2>Actions</h2>
                    <span>Etape {currentStepIndex + 1}</span>
                  </div>
                  {stepScreen.actions}
                </section>

                <section className="tiktok-step-pane is-right">
                  <div className="video-panel-head">
                    <h2>Resultat</h2>
                    <span>{currentStep.label}</span>
                  </div>
                  {stepScreen.result}
                </section>
              </div>
            </section>
          )}
        </div>
      </AdminShell>
    </div>
  )
}
