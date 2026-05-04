/**
 * TikTokJourneyPage — full rebuild (Proposal C)
 *
 * Drop-in replacement for src/pages/TikTokJourneyPage.tsx.
 *
 * - Keeps every hook, handler and side effect from the original verbatim.
 *   No business logic was modified.
 * - Replaces only the JSX shell + step-screen rendering.
 * - Imports its own CSS (`features/journey.css`); no other file changes.
 *
 * The two replaced sub-files (`TikTokLibraryView`, `TikTokStepScreen`) are
 * also in this drop-in folder.
 */

import { useMemo, useState } from 'react'
import { useLocation, useNavigate, type Location } from 'react-router-dom'

import AdminShell from '../components/AdminShell'
import { useTikTokWorkflow } from '../hooks'
import {
  triggerCheckShotstackWorkflow,
  triggerMainContentPipeline,
  triggerPublishTikTokWorkflow,
  triggerRenderTemplateWorkflow,
} from '../services/n8nClient'
import {
  fetchContentIdeaByIdFromPages,
  fetchContentIdeaStatus,
  fetchRecentContentIdeas,
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
  useUploadStep,
} from './tiktok-journey/useTikTokJourneySteps'
import { useWorkflowMonitor } from './tiktok-journey/useWorkflowMonitor'
import '../styles/features/catalog-shared.css'
import '../styles/features/products.css'
import '../styles/themes/products-dark.css'
import '../styles/features/journey.css'
import type { ContentIdea, TikTokAccount } from '../types'

type JourneyLocationState = {
  tiktokOAuthSuccess?: string
  accountsWarning?: string
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}

/* ── Step definitions (kept identical to original) ─────────────────────── */

const STEPS = [
  { id: 'creation',     label: 'Creation', sub: 'Generer une idee + script' },
  { id: 'init-publish', label: 'Video',    sub: 'Rendre la video Shotstack' },
  { id: 'upload',       label: 'Upload',   sub: 'Pousser sur TikTok' },
  { id: 'publish',      label: 'Publish',  sub: 'Publier definitivement' },
]
const TIKTOK_BASE_ROUTE = '/tiktok'
const TIKTOK_STEP_ROUTES = STEPS.map((step) => `${TIKTOK_BASE_ROUTE}/${step.id}`)

const LIST_FILTER_OPTIONS = [
  { value: 'all',         label: 'Toutes' },
  { value: 'published',   label: 'Publiees' },
  { value: 'unpublished', label: 'Non publiees' },
  { value: 'ready',       label: 'Rendues' },
]

const LIST_SORT_OPTIONS = [
  { value: 'recent',           label: 'Plus recentes' },
  { value: 'oldest',           label: 'Plus anciennes' },
  { value: 'topic_asc',        label: 'Topic A-Z' },
  { value: 'topic_desc',       label: 'Topic Z-A' },
  { value: 'published_first',  label: 'Publiees d abord' },
]
const TIKTOK_CATEGORY_OPTIONS = ['Food', 'Love', 'Sport', 'Fitness', 'Beauty']
const MAX_IDEA_BATCH_SIZE = 5

/* ── Status helpers (unchanged) ────────────────────────────────────────── */

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

/* ── Local presentational helpers (new, JSX-only) ──────────────────────── */

function VideoPreview({ url }: { url: string | null | undefined }) {
  if (!url) {
    return <div className="journey-video-preview-empty">Aucune video pour le moment.</div>
  }
  return (
    <div className="journey-video-preview">
      <video src={url} controls playsInline />
    </div>
  )
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

function BackArrow() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m14.5 6.5-5.5 5.5 5.5 5.5" />
    </svg>
  )
}

/* Icons consumed by TikTokLibraryView ----------------------------------- */
function SearchIcon()  { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></svg>) }
function FilterIcon()  { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16" /><path d="M7 12h10" /><path d="M10 18h4" /></svg>) }
function SortIcon()    { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M8 6h10" /><path d="M8 12h7" /><path d="M8 18h4" /><path d="m4 8 2-2 2 2" /><path d="M6 6v12" /></svg>) }
function GridIcon()    { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="6" height="6" rx="1.2" /><rect x="14" y="4" width="6" height="6" rx="1.2" /><rect x="4" y="14" width="6" height="6" rx="1.2" /><rect x="14" y="14" width="6" height="6" rx="1.2" /></svg>) }
function TableIcon()   { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="3.5" y="5" width="17" height="14" rx="1.5" /><path d="M3.5 10h17" /><path d="M9 5v14" /></svg>) }
function AddIcon()     { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14" /><path d="M5 12h14" /></svg>) }

/* ── Page component ─────────────────────────────────────────────────────── */

export default function TikTokJourneyPage() {
  const navigate = useNavigate()
  const location = useLocation() as Location<JourneyLocationState>
  const {
    accountsReadiness,
    contentIdeas,
    contentIdeasQuery,
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
  const isLoading = contentIdeasQuery.isPending
  const isFetchingNextPage = contentIdeasQuery.isFetchingNextPage
  const hasNextPage = Boolean(contentIdeasQuery.hasNextPage)
  const contentIdeasErrorMessage = contentIdeasQuery.error?.message || null

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

  const isGeneratingIdeas  = Boolean(busyActions.generateIdea)
  const isGeneratingScript = Boolean(busyActions.generateScript)
  const isPreparingVideo   = Boolean(busyActions.renderVideo)
  const isPreparingUpload  = Boolean(busyActions.prepareUpload)
  const isUploadingVideo   = Boolean(busyActions.uploadVideo)
  const isPublishingVideo  = Boolean(busyActions.publishVideo)

  const workflowMonitor = useWorkflowMonitor({
    fetchContentIdeaById: fetchContentIdeaByIdFromPages,
    fetchManualActions,
    fetchContentIdeaStatus,
    fetchRecentContentIdeas,
    fetchWorkflowRun,
  })

  const { handleGenerateIdea } = useCreationStep({
    displayedGeneratedIdeas,
    generationCategory,
    connectedTikTokAccount,
    fetchContentIdeaById: fetchContentIdeaByIdFromPages,
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
    waitForNewIdeas: workflowMonitor.waitForNewIdeas,
    waitForContentIdeaStatus: workflowMonitor.waitForContentIdeaStatus,
    waitForScriptGeneration: workflowMonitor.waitForScriptGeneration,
    showSuccess,
    showError,
    runAction,
    markWorkflowStarted: workflowMonitor.markWorkflowStarted,
    markWorkflowFinished: workflowMonitor.markWorkflowFinished,
  })

  const handleValidateCreation = async () => {
    if (!selectedGeneratedIdea?.id) {
      showError('Genere une idee avant de valider cette etape.')
      return
    }
    goToStep('init-publish')
    try {
      await handleRetryInitPublish()
    } catch (error) {
      showError(getErrorMessage(error, "Le rendu video n'a pas abouti."))
    }
  }

  const { handleRetryInitPublish } = useRenderStep({
    scriptedIdea,
    selectedGeneratedIdea,
    goToStep,
    triggerCheckShotstackWorkflow,
    triggerRenderTemplateWorkflow,
    fetchContentIdeaById: fetchContentIdeaByIdFromPages,
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
    fetchContentIdeaById: fetchContentIdeaByIdFromPages,
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

  const safeHandleGenerateIdea = async () => {
    try {
      await handleGenerateIdea()
    } catch (error) {
      showError(getErrorMessage(error, "La generation de l'idee n'a pas abouti."))
    }
  }

  const safeHandleRetryInitPublish = async () => {
    try {
      await handleRetryInitPublish()
    } catch (error) {
      showError(getErrorMessage(error, "Le rendu video n'a pas abouti."))
    }
  }

  /* ── Aggregate stats for library page ───────────────────────────────── */
  const libraryStats = useMemo(() => {
    const total = contentIdeas.length
    let published = 0, ready = 0, drafts = 0
    for (const idea of contentIdeas) {
      if (isPublished(idea)) published++
      else if (isRenderReady(idea)) ready++
      else drafts++
    }
    return { total, published, ready, drafts }
  }, [contentIdeas])

  /* ── Render ──────────────────────────────────────────────────────────── */

  return (
    <div className="admin-page admin-page-tiktok video-ops-page">
      <AdminShell
        activeNavId="tiktok"
        feedbackItems={[
          { type: 'error',   message: errorMessage },
          { type: 'success', message: successMessage },
        ]}
      >
        <div className="video-ops-shell journey-shell">
          {!isFlowRoute ? (
            <>
              <header className="journey-page-head">
                <div className="journey-page-head-copy">
                  <h1>Bibliotheque TikTok</h1>
                  <p>Gere tes idees, scripts et videos. Lance un nouveau parcours pour generer une video de A a Z.</p>
                </div>
                <div className="journey-page-head-actions">
                  <button
                    type="button"
                    className="journey-btn is-primary"
                    onClick={startAddFlow}
                    disabled={!isJourneyReady}
                  >
                    <AddIcon /> Nouveau parcours
                  </button>
                </div>
              </header>

              <section className="journey-stats" aria-label="Statistiques bibliotheque">
                <div className="journey-stat">
                  <span className="journey-stat-label">Total</span>
                  <span className="journey-stat-value">{libraryStats.total}</span>
                  <span className="journey-stat-trend">Toutes idees confondues</span>
                </div>
                <div className="journey-stat">
                  <span className="journey-stat-label">Publiees</span>
                  <span className="journey-stat-value">{libraryStats.published}</span>
                  <span className="journey-stat-trend is-up">Live sur TikTok</span>
                </div>
                <div className="journey-stat">
                  <span className="journey-stat-label">Pretes a publier</span>
                  <span className="journey-stat-value">{libraryStats.ready}</span>
                  <span className="journey-stat-trend">Rendues, non publiees</span>
                </div>
                <div className="journey-stat">
                  <span className="journey-stat-label">Brouillons</span>
                  <span className="journey-stat-value">{libraryStats.drafts}</span>
                  <span className="journey-stat-trend is-warn">Encore a generer</span>
                </div>
              </section>

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
                hasNextPage={hasNextPage}
                contentIdeasErrorMessage={contentIdeasErrorMessage}
                isJourneyReady={isJourneyReady}
                isLoading={isLoading}
                isFetchingNextPage={isFetchingNextPage}
                isPublished={isPublished}
                isRenderReady={isRenderReady}
                listFilter={listFilter}
                listFilterOptions={LIST_FILTER_OPTIONS}
                listSearch={listSearch}
                listSort={listSort}
                listSortOptions={LIST_SORT_OPTIONS}
                listViewMode={listViewMode}
                openListMenu={openListMenu}
                selectedListFilter={selectedListFilter}
                selectedListSort={selectedListSort}
                setListFilter={setListFilter}
                setListSearch={setListSearch}
                setListSort={setListSort}
                setListViewMode={setListViewMode}
                setOpenListMenu={setOpenListMenu}
                handleLoadMore={() => contentIdeasQuery.fetchNextPage()}
                startAddFlow={startAddFlow}
              />
            </>
          ) : (
            <TikTokStepScreen
              steps={STEPS}
              currentStepIndex={currentStepIndex}
              currentStep={currentStep}
              goBackInFlow={goBackInFlow}
              goToStep={goToStep}
              ChevronDownIcon={ChevronDownIcon}
              BackArrow={BackArrow}
              VideoPreview={VideoPreview}
              activeIdea={activeIdea}
              connectedTikTokAccount={connectedTikTokAccount}
              displayedGeneratedIdeas={displayedGeneratedIdeas}
              formatShortOpenId={formatShortOpenId}
              generationCategory={generationCategory}
              generationCount={generationCount}
              handleGenerateIdea={safeHandleGenerateIdea}
              handlePrepareUpload={handlePrepareUpload}
              handlePublishVideo={handlePublishVideo}
              handleRetryInitPublish={safeHandleRetryInitPublish}
              handleUploadVideo={handleUploadVideo}
              handleValidateCreation={handleValidateCreation}
              handleValidateInitPublish={handleValidateInitPublish}
              handleValidateUpload={handleValidateUpload}
              hasConnectedTikTokAccount={hasConnectedTikTokAccount}
              isBusy={isBusy}
              isGeneratingIdeas={isGeneratingIdeas}
              isGeneratingScript={isGeneratingScript}
              isJourneyReady={isJourneyReady}
              isPreparingUpload={isPreparingUpload}
              isPreparingVideo={isPreparingVideo}
              isPublishingVideo={isPublishingVideo}
              isUploadingVideo={isUploadingVideo}
              manualAction={manualAction}
              maxIdeaBatchSize={MAX_IDEA_BATCH_SIZE}
              navigate={navigate}
              openListMenu={openListMenu}
              scriptedIdea={scriptedIdea}
              selectedGeneratedIdea={selectedGeneratedIdea}
              setGenerationCategory={setGenerationCategory}
              setGenerationCount={setGenerationCount}
              setOpenListMenu={setOpenListMenu}
              setSelectedGeneratedIdeaId={setSelectedGeneratedIdeaId}
              successMessage={successMessage}
              tiktokCategoryOptions={TIKTOK_CATEGORY_OPTIONS}
              uploadResult={uploadResult}
            />
          )}
        </div>
      </AdminShell>
    </div>
  )
}
