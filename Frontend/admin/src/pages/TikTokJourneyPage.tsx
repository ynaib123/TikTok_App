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

import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, type Location } from 'react-router-dom'

import AdminShell from '../components/AdminShell'
import { useAdminAuth } from '../contexts/AdminAuthContext'
import { useTikTokWorkflow } from '../hooks'
import {
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
  updateContentIdeaContent,
  uploadTikTokMedia,
  type ContentIdeaEditPatch,
} from '../services/videoOpsSupabase'
import { markAdminRouteReady } from '../services/adminPerformance'
import TikTokLibraryView from './tiktok-journey/TikTokLibraryView'
import TikTokStepScreen from './tiktok-journey/TikTokStepScreen'
import { useActionState } from './tiktok-journey/useActionState'
import { useTikTokJourneyFlowState } from './tiktok-journey/useTikTokJourneyFlowState'
import { useTikTokJourneyListState } from './tiktok-journey/useTikTokJourneyListState'
import {
  useCreationStep,
  useRenderStep,
  useUploadStep,
} from './tiktok-journey/useTikTokJourneySteps'
import {
  clearJourneyWorkspace,
  readJourneyWorkspace,
  saveJourneyWorkspace,
} from './tiktok-journey/journeyWorkspace'
import { mergeIdeasById } from './tiktok-journey/journeyHelpers'
import { journeyTelemetry } from './tiktok-journey/journeyTelemetry'
import { useWorkflowMonitor } from './tiktok-journey/useWorkflowMonitor'
import '../styles/features/catalog-shared.css'
import '../styles/features/products.css'
import '../styles/themes/products-dark.css'
import '../styles/features/journey.css'
import '../styles/features/tiktok-step.css'
import type { ContentIdea, TikTokAccount } from '../types'

type JourneyLocationState = {
  tiktokOAuthSuccess?: string
  accountsWarning?: string
  resumeWorkspaceIdeaId?: number
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}

type PendingExitTarget =
  | { kind: 'library' }
  | { kind: 'path'; path: string }
  | { kind: 'logout' }
  | { kind: 'browser-back' }

/* ── Step definitions (kept identical to original) ─────────────────────── */

const STEPS = [
  { id: 'creation', label: 'Creation', sub: 'Generer une idee + script' },
  { id: 'template', label: 'Template', sub: 'Style + medias par scene' },
  { id: 'init-publish', label: 'Video', sub: 'Rendre la video Remotion' },
  { id: 'upload', label: 'Publication', sub: 'Publier sur TikTok' },
]
const TIKTOK_BASE_ROUTE = '/tiktok'
const TIKTOK_STEP_ROUTES = STEPS.map((step) => `${TIKTOK_BASE_ROUTE}/${step.id}`)

const LIST_FILTER_OPTIONS = [
  { value: 'all',         label: 'Toutes' },
  { value: 'published',   label: 'Publiées' },
  { value: 'unpublished', label: 'Non publiées' },
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
const TIKTOK_TEMPLATE_OPTIONS: Array<{ value: string; label: string; description: string }> = [
  { value: 'tiktok-scene-sequence', label: 'Scene Sequence (multi-clips)', description: 'Multi-scenes Pexels, hook centre big, typo uppercase pro, crossfade.' },
  { value: 'tiktok-pro-vertical', label: 'Pro Vertical', description: 'Mono-fond, badge hook, segments script, CTA pill.' },
  { value: 'tiktok-bold-story',   label: 'Bold Story',   description: 'Mono-fond, chapitres numerotes (01/02), CTA degrade.' },
  { value: 'tiktok-clean-minimal', label: 'Clean Minimal', description: 'Mono-fond, hook pill blanche, typo reguliere, fleche CTA.' },
]
const TIKTOK_QUALITY_OPTIONS: Array<{ value: string; label: string; description: string }> = [
  { value: 'draft',    label: 'Draft',    description: 'Rapide, CRF 28, 96 kbps audio' },
  { value: 'standard', label: 'Standard', description: 'CRF 24, 128 kbps audio' },
  { value: 'high',     label: 'High',     description: 'CRF 21, 160 kbps audio' },
  { value: 'premium',  label: 'Premium',  description: 'Export final lent, CRF 19, 192 kbps audio' },
]
const TIKTOK_DURATION_TARGET_OPTIONS: Array<{ value: string; label: string; description: string }> = [
  { value: 'short',  label: 'Courte (~10s)',  description: '2-3 phrases punchy.' },
  { value: 'medium', label: 'Moyenne (~15s)', description: '3-4 phrases. Sweet spot TikTok.' },
  { value: 'long',   label: 'Longue (~25s)',  description: '5-6 phrases, plus d info.' },
]
const TIKTOK_LANGUAGE_OPTIONS: Array<{ value: string; label: string; description: string }> = [
  { value: 'fr', label: 'Francais',  description: 'Marche FR.' },
  { value: 'en', label: 'English',   description: 'Marche EN/global.' },
  { value: 'es', label: 'Espanol',   description: 'Marche ES/LATAM.' },
  { value: 'it', label: 'Italiano',  description: 'Marche IT.' },
  { value: 'de', label: 'Deutsch',   description: 'Marche DE.' },
  { value: 'ar', label: 'Arabe',     description: 'Arabe standard moderne.' },
  { value: 'ary', label: 'Darija marocaine', description: 'Dialecte marocain, style naturel.' },
]
const TIKTOK_SEQUENCE_TEMPLATE_ID = 'tiktok-scene-sequence'
const MIN_VIDEO_DURATION_SEC = 15
const MAX_VIDEO_DURATION_SEC = 60
const MIN_SCENE_DURATION_SEC = 3
const TIKTOK_SCENE_COUNT_OPTIONS: Array<{ value: number; label: string; description: string }> = [
  { value: 1,  label: '1 scene',   description: '~3s, format flash.' },
  { value: 2,  label: '2 scenes',  description: '~6s, format tres court.' },
  { value: 3,  label: '3 scenes',  description: '~9s, format ultra-court.' },
  { value: 4,  label: '4 scenes',  description: '~12s, sweet spot TikTok.' },
  { value: 5,  label: '5 scenes',  description: '~15s, retention optimale.' },
  { value: 6,  label: '6 scenes',  description: '~18s, format etoffe.' },
  { value: 7,  label: '7 scenes',  description: '~21s, contenu dense.' },
  { value: 8,  label: '8 scenes',  description: '~24s, storytelling complet.' },
  { value: 9,  label: '9 scenes',  description: '~27s.' },
  { value: 10, label: '10 scenes', description: '~30s, max recommande.' },
]
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
  if (String(idea?.tiktokStatus || '').toLowerCase() === 'uploaded') return 'publiee'
  if (String(idea?.tiktokStatus || '').toLowerCase() === 'uploading') return 'publication en cours'
  if (idea?.uploadUrl) return 'prete publication'
  if (isRenderReady(idea)) return 'rendue'
  if (idea?.shotstackStatus === 'rendering') return 'rendering'
  return idea?.tiktokStatus || 'draft'
}

/* ── Local presentational helpers (new, JSX-only) ──────────────────────── */

function VideoPreview({ url }: { url: string | null | undefined }) {
  if (!url) {
    return <div className="journey-video-preview-empty">Aucune vidéo pour le moment.</div>
  }
  return (
    <div className="journey-video-preview">
      <video src={url} controls playsInline>
        <track kind="captions" />
      </video>
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
  const resumeWorkspaceIdeaIdRef = useRef<number | null>(location.state?.resumeWorkspaceIdeaId ?? null)
  const pendingExitTargetRef = useRef<PendingExitTarget | null>(null)
  const { logout } = useAdminAuth()
  const {
    accountsReadiness,
    contentIdeas,
    contentIdeasQuery,
    refreshPipelineData,
    tiktokAccounts,
  } = useTikTokWorkflow()
  const { busyActions, isBusy, runAction } = useActionState()
  const [generationCategory, setGenerationCategory] = useState(TIKTOK_CATEGORY_OPTIONS[0])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(TIKTOK_SEQUENCE_TEMPLATE_ID)
  const [selectedQualityProfile, setSelectedQualityProfile] = useState<string>('high')
  const [videoDurationSec, setVideoDurationSec] = useState<number>(MIN_VIDEO_DURATION_SEC)
  // Paramètres de génération idée + script (étape 1).
  const [generationTopic, setGenerationTopic] = useState<string>('')
  const [generationDurationTarget, setGenerationDurationTarget] = useState<string>('medium')
  const [generationLanguage, setGenerationLanguage] = useState<string>('fr')
  const [generationInspirationRef, setGenerationInspirationRef] = useState<string>('')
  const [generationSceneCount, setGenerationSceneCount] = useState<number>(1)
  const minVideoDurationSec = Math.min(MAX_VIDEO_DURATION_SEC, Math.max(MIN_VIDEO_DURATION_SEC, generationSceneCount * MIN_SCENE_DURATION_SEC))
  useEffect(() => {
    setVideoDurationSec((current) => Math.min(MAX_VIDEO_DURATION_SEC, Math.max(minVideoDurationSec, current)))
  }, [minVideoDurationSec])
  // ID du workflow_run de rendu en cours, pour permettre au RenderStep de poller
  // l'avancement (/api/video-ops/render-video/progress/:id).
  const [currentRenderRunId, setCurrentRenderRunId] = useState<number | null>(null)
  // URLs Pexels choisies par l user dans l étape "Médias" — une URL par scène
  // dans l ordre. Reset à chaque nouvelle idée.
  const [selectedSceneMediaUrls, setSelectedSceneMediaUrls] = useState<string[]>([])
  // Edits en cours sur l idée générée (l utilisateur peut modifier avant de
  // passer à l étape vidéo). On les sauvegarde via PATCH au moment du Suivant.
  const [editedTopic, setEditedTopic] = useState<string>('')
  const [editedScript, setEditedScript] = useState<string>('')
  const [editedCaption, setEditedCaption] = useState<string>('')
  const [editedKeyword, setEditedKeyword] = useState<string>('')
  const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = useState(false)

  const currentStepIndex = useMemo(
    () => TIKTOK_STEP_ROUTES.findIndex((route) => location.pathname === route),
    [location.pathname],
  )

  useEffect(() => {
    if (location.pathname === `${TIKTOK_BASE_ROUTE}/publish`) {
      navigate(`${TIKTOK_BASE_ROUTE}/upload`, { replace: true })
    }
    // Backwards compat: the previous template-style step has been merged into
    // /tiktok/template. Bookmarks / saved workspaces from older sessions land
    // on the new merged step instead of 404'ing.
    if (location.pathname === `${TIKTOK_BASE_ROUTE}/template-style`) {
      navigate(`${TIKTOK_BASE_ROUTE}/template`, { replace: true })
    }
  }, [location.pathname, navigate])

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
    closeAddFlow,
    displayedGeneratedIdeas,
    errorMessage,
    generationCount,
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

  useEffect(() => {
    if (isLoading) return
    markAdminRouteReady('/tiktok', {
      hasError: Boolean(contentIdeasErrorMessage),
      ideas: contentIdeas.length,
      hasConnectedTikTokAccount,
      isFlowRoute,
    })
  }, [
    contentIdeas.length,
    contentIdeasErrorMessage,
    hasConnectedTikTokAccount,
    isFlowRoute,
    isLoading,
  ])

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
    waitForNewIdeas: workflowMonitor.waitForNewIdeas,
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

  // Étape 1 → étape 2 (Template). On sauvegarde d'abord les edits utilisateur
  // sur topic/script/caption/keyword. Le rendu se déclenchera plus tard depuis
  // l'étape 3 (Vidéo) une fois le template/qualité choisis.
  const handleGoToTemplateStep = async () => {
    const idea = scriptedIdea || selectedGeneratedIdea
    if (!idea?.id) {
      showError('Genere une idee avant de passer a l etape suivante.')
      return
    }
    const patch: ContentIdeaEditPatch = {}
    if (editedTopic !== (idea.topic || '')) patch.topic = editedTopic
    if (editedScript !== (idea.script || '')) {
      patch.script = editedScript
      patch.plannedScenes = null
    }
    if (editedCaption !== (idea.caption || '')) patch.caption = editedCaption
    if (editedKeyword !== (idea.keyword || '')) patch.keyword = editedKeyword

    if (Object.keys(patch).length > 0) {
      try {
        await updateContentIdeaContent(idea.id, patch)
        const merged: ContentIdea = {
          ...idea,
          topic: editedTopic,
          script: editedScript,
          caption: editedCaption,
          keyword: editedKeyword,
        }
        setScriptedIdea(merged)
        setGeneratedIdeas((current) => mergeIdeasById(current, [merged]))
      } catch (error) {
        showError(getErrorMessage(error, "Impossible d enregistrer les modifications."))
        return
      }
    }
    goToStep('template')
  }

  // Etape Template (fusion style + médias) → étape Vidéo. Pas de side-effect,
  // juste la navigation. Les paramètres style et selectedSceneMediaUrls sont
  // déjà persistés dans le flow state et envoyés au workflow de rendu.
  const handleValidateTemplate = () => {
    goToStep('init-publish')
  }

  const handleValidateMedia = () => {
    goToStep('init-publish')
  }

  const { handleRetryInitPublish } = useRenderStep({
    scriptedIdea,
    selectedGeneratedIdea,
    selectedTemplateId,
    selectedQualityProfile,
    videoDurationSec,
    generationSceneCount,
    selectedSceneMediaUrls,
    goToStep,
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
    setCurrentRenderRunId,
  })

  const { handlePrepareAndUploadVideo, handlePrepareUpload, handleUploadVideo } = useUploadStep({
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

  const activeIdea = scriptedIdea || selectedGeneratedIdea
  const currentStep = isFlowRoute ? STEPS[currentStepIndex] : STEPS[0]

  // Synchronise les inputs editables sur l idee active. Le pipeline cree d
  // abord la idee (topic seul), puis enrichit avec script/caption/hook/keyword
  // quelques secondes plus tard via un PATCH. On re-sync quand:
  //   - l ID change (nouvelle idee selectionnee)
  //   - le script passe de vide a rempli (etape script_ready terminee)
  // Sinon les valeurs editees par l utilisateur ne sont pas ecrasees.
  const lastSyncRef = useRef<{ id: number | null; hadScript: boolean }>({ id: null, hadScript: false })
  useEffect(() => {
    if (!activeIdea?.id) return
    const hasScript = Boolean(String(activeIdea.script || '').trim())
    const isNewIdea = activeIdea.id !== lastSyncRef.current.id
    const scriptJustArrived = hasScript && !lastSyncRef.current.hadScript && lastSyncRef.current.id === activeIdea.id
    if (isNewIdea || scriptJustArrived) {
      setEditedTopic(activeIdea.topic || '')
      setEditedScript(activeIdea.script || '')
      setEditedCaption(activeIdea.caption || '')
      setEditedKeyword(activeIdea.keyword || '')
      lastSyncRef.current = { id: activeIdea.id, hadScript: hasScript }
    } else if (lastSyncRef.current.id !== activeIdea.id) {
      lastSyncRef.current = { id: activeIdea.id, hadScript: hasScript }
    }
  }, [activeIdea?.id, activeIdea?.topic, activeIdea?.script, activeIdea?.caption, activeIdea?.keyword])

  const openLeaveConfirm = (target: PendingExitTarget = { kind: 'library' }) => {
    pendingExitTargetRef.current = target
    setIsLeaveConfirmOpen(true)
  }

  const closeLeaveConfirm = () => {
    pendingExitTargetRef.current = null
    setIsLeaveConfirmOpen(false)
  }

  const completeFlowExit = async (shouldSave: boolean) => {
    const pendingTarget = pendingExitTargetRef.current
    pendingExitTargetRef.current = null
    setIsLeaveConfirmOpen(false)

    if (shouldSave && activeIdea?.id && currentStep?.id) {
      saveJourneyWorkspace(activeIdea.id, currentStep.id, {
        pexelsQuery: flowState.pexelsCache?.query ?? null,
        selectedSceneMediaUrls,
        editedTopic,
        editedScript,
        editedCaption,
        editedKeyword,
      })
    }

    if (pendingTarget?.kind === 'path') {
      navigate(pendingTarget.path)
      return
    }

    if (pendingTarget?.kind === 'logout') {
      await logout()
      navigate('/login', { replace: true })
      return
    }

    closeAddFlow()
  }

  const leaveWithoutSaving = () => {
    void completeFlowExit(false)
  }

  const saveAndLeaveFlow = () => {
    void completeFlowExit(true)
  }

  useEffect(() => {
    if (!isFlowRoute) return

    const resumeIdeaId = Number(resumeWorkspaceIdeaIdRef.current || 0)
    if (!resumeIdeaId) return

    let cancelled = false

    const restoreWorkspace = async () => {
      try {
        const [idea, manualActions] = await Promise.all([
          fetchContentIdeaByIdFromPages(resumeIdeaId),
          fetchManualActions(),
        ])
        if (cancelled || !idea?.id) return

        const manualActionRecord = manualActions.find((item) => Number(item?.id) === Number(idea.id)) || null

        setGeneratedIdeas([idea])
        setSelectedGeneratedIdeaId(Number(idea.id))
        setScriptedIdea(idea)
        setManualAction(manualActionRecord ? { ...manualActionRecord } : {
          id: Number(idea.id),
          topic: idea.topic ?? null,
          shotstackUrl: idea.shotstackUrl || null,
          uploadUrl: idea.uploadUrl || null,
          tiktokStatus: idea.tiktokStatus || null,
          finalVideoStatus: idea.finalVideoStatus || null,
          shotstackStatus: idea.shotstackStatus || null,
          pipelineStatus: idea.pipelineStatus || null,
          lastError: idea.lastError || null,
        })

        journeyTelemetry.trackWorkspaceResumed({ contentIdeaId: Number(idea.id) || null })

        // Rehydrate the lighter-weight workspace state saved alongside the idea
        // (Pexels query, selected scene URLs, and any in-flight edits). Videos
        // themselves are not persisted to localStorage to keep storage small;
        // TemplateStep refetches them when it sees a non-matching cache.
        const snapshot = readJourneyWorkspace(resumeIdeaId)
        if (snapshot && !cancelled) {
          if (snapshot.pexelsQuery) {
            flowState.setPexelsCache({ query: snapshot.pexelsQuery, videos: [] })
          }
          if (Array.isArray(snapshot.selectedSceneMediaUrls)) {
            setSelectedSceneMediaUrls(snapshot.selectedSceneMediaUrls.map((u) => String(u || '')))
          }
          if (typeof snapshot.editedTopic === 'string') setEditedTopic(snapshot.editedTopic)
          if (typeof snapshot.editedScript === 'string') setEditedScript(snapshot.editedScript)
          if (typeof snapshot.editedCaption === 'string') setEditedCaption(snapshot.editedCaption)
          if (typeof snapshot.editedKeyword === 'string') setEditedKeyword(snapshot.editedKeyword)
        }
      } catch {
        // Resume is best-effort. If it fails, the route still opens normally.
      } finally {
        if (!cancelled) {
          resumeWorkspaceIdeaIdRef.current = null
          window.history.replaceState({}, document.title, location.pathname)
        }
      }
    }

    void restoreWorkspace()

    return () => {
      cancelled = true
    }
  }, [
    isFlowRoute,
    location.pathname,
    setGeneratedIdeas,
    setManualAction,
    setScriptedIdea,
    setSelectedGeneratedIdeaId,
  ])

  useEffect(() => {
    if (!isFlowRoute) return undefined

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isFlowRoute])

  useEffect(() => {
    if (!isFlowRoute) return undefined

    const historyState = { ...(window.history.state || {}), tiktokJourneyGuard: true, tiktokJourneyGuardAt: Date.now() }
    window.history.pushState(historyState, '', window.location.href)

    const handlePopState = () => {
      window.history.go(1)
      openLeaveConfirm({ kind: 'browser-back' })
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [isFlowRoute, location.pathname])

  const handleValidateInitPublish = () => {
    const previewUrl = manualAction?.shotstackUrl || scriptedIdea?.shotstackUrl || selectedGeneratedIdea?.shotstackUrl
    if (!previewUrl) {
      setErrorMessage('Aucune video generee disponible pour cette etape.')
      return
    }
    goToStep('upload')
    showSuccess('Template video valide. Tu peux lancer la publication.')
  }

  const handleValidateUpload = () => {}

  const handleSaveAndCloseFlow = () => {
    void completeFlowExit(true)
  }

  const handleShellBeforeNavigate = async (path: string) => {
    if (!isFlowRoute) return true
    openLeaveConfirm({ kind: 'path', path })
    return false
  }

  const handleShellBeforeLogout = async () => {
    if (!isFlowRoute) return true
    openLeaveConfirm({ kind: 'logout' })
    return false
  }

  const guardedStepNavigate = ((to: string | number, options?: { replace?: boolean; state?: unknown }) => {
    if (typeof to === 'number') {
      navigate(to)
      return
    }

    if (isFlowRoute && !TIKTOK_STEP_ROUTES.includes(to)) {
      openLeaveConfirm({ kind: 'path', path: to })
      return
    }

    navigate(to, options)
  }) as typeof navigate

  const handlePublishToTikTok = async () => {
    const uploadCompleted = await handlePrepareAndUploadVideo()
    if (!uploadCompleted || !activeIdea?.id) return

    try {
      await markPublishComplete(activeIdea.id)
      clearJourneyWorkspace(activeIdea.id)
      await refreshPipelineData()
      showSuccess('Vidéo publiée avec succès sur TikTok.')
      navigate(`/tiktok/idea/${activeIdea.id}`)
    } catch (error) {
      showError(getErrorMessage(error, "La finalisation de la publication n'a pas abouti."))
    }
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
        onBeforeNavigate={handleShellBeforeNavigate}
        onBeforeLogout={handleShellBeforeLogout}
      >
        <div className="video-ops-shell journey-shell">
          {!isFlowRoute ? (
            <>
              <header className="journey-page-head">
                <div className="journey-page-head-copy">
                  <h1>Bibliothèque TikTok</h1>
                  <p>Gère tes idées, scripts et vidéos. Lance un nouveau parcours pour générer une vidéo de A à Z.</p>
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

              <section className="journey-stats" aria-label="Statistiques bibliothèque">
                <div className="journey-stat">
                  <span className="journey-stat-label">Total</span>
                  <span className="journey-stat-value">{libraryStats.total}</span>
                  <span className="journey-stat-trend">Toutes idées confondues</span>
                </div>
                <div className="journey-stat">
                  <span className="journey-stat-label">Publiées</span>
                  <span className="journey-stat-value">{libraryStats.published}</span>
                  <span className="journey-stat-trend is-up">Live sur TikTok</span>
                </div>
                <div className="journey-stat">
                  <span className="journey-stat-label">Prêtes à publier</span>
                  <span className="journey-stat-value">{libraryStats.ready}</span>
                  <span className="journey-stat-trend">Rendues, non publiées</span>
                </div>
                <div className="journey-stat">
                  <span className="journey-stat-label">Brouillons</span>
                  <span className="journey-stat-value">{libraryStats.drafts}</span>
                  <span className="journey-stat-trend is-warn">Encore à générer</span>
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
              closeAddFlow={closeAddFlow}
              saveAndCloseFlow={handleSaveAndCloseFlow}
              isLeaveConfirmOpen={isLeaveConfirmOpen}
              openLeaveConfirm={() => openLeaveConfirm({ kind: 'library' })}
              closeLeaveConfirm={closeLeaveConfirm}
              leaveWithoutSaving={leaveWithoutSaving}
              saveAndLeaveFlow={saveAndLeaveFlow}
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
              handlePrepareAndUploadVideo={handlePublishToTikTok}
              handlePrepareUpload={handlePrepareUpload}
              handlePublishVideo={handlePublishToTikTok}
              handleRetryInitPublish={safeHandleRetryInitPublish}
              handleUploadVideo={handleUploadVideo}
              handleValidateCreation={handleValidateCreation}
              handleGoToTemplateStep={handleGoToTemplateStep}
              handleValidateTemplate={handleValidateTemplate}
              handleValidateMedia={handleValidateMedia}
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
              navigate={guardedStepNavigate}
              openListMenu={openListMenu}
              scriptedIdea={scriptedIdea}
              selectedGeneratedIdea={selectedGeneratedIdea}
              setGenerationCategory={setGenerationCategory}
              setGenerationCount={setGenerationCount}
              setOpenListMenu={setOpenListMenu}
              setSelectedGeneratedIdeaId={setSelectedGeneratedIdeaId}
              selectedTemplateId={selectedTemplateId}
              setSelectedTemplateId={setSelectedTemplateId}
              selectedQualityProfile={selectedQualityProfile}
              setSelectedQualityProfile={setSelectedQualityProfile}
              videoDurationSec={videoDurationSec}
              setVideoDurationSec={setVideoDurationSec}
              minVideoDurationSec={minVideoDurationSec}
              maxVideoDurationSec={MAX_VIDEO_DURATION_SEC}
              templateOptions={TIKTOK_TEMPLATE_OPTIONS}
              qualityOptions={TIKTOK_QUALITY_OPTIONS}
              successMessage={successMessage}
              tiktokCategoryOptions={TIKTOK_CATEGORY_OPTIONS}
              uploadResult={uploadResult}
              currentRenderRunId={currentRenderRunId}
              selectedSceneMediaUrls={selectedSceneMediaUrls}
              setSelectedSceneMediaUrls={setSelectedSceneMediaUrls}
              editedTopic={editedTopic}
              setEditedTopic={setEditedTopic}
              editedScript={editedScript}
              setEditedScript={setEditedScript}
              editedCaption={editedCaption}
              setEditedCaption={setEditedCaption}
              editedKeyword={editedKeyword}
              setEditedKeyword={setEditedKeyword}
              generationTopic={generationTopic}
              setGenerationTopic={setGenerationTopic}
              generationDurationTarget={generationDurationTarget}
              setGenerationDurationTarget={setGenerationDurationTarget}
              generationLanguage={generationLanguage}
              setGenerationLanguage={setGenerationLanguage}
              generationInspirationRef={generationInspirationRef}
              setGenerationInspirationRef={setGenerationInspirationRef}
              durationTargetOptions={TIKTOK_DURATION_TARGET_OPTIONS}
              languageOptions={TIKTOK_LANGUAGE_OPTIONS}
              sceneCountOptions={TIKTOK_SCENE_COUNT_OPTIONS}
              generationSceneCount={generationSceneCount}
              setGenerationSceneCount={setGenerationSceneCount}
              pexelsCache={flowState.pexelsCache}
              setPexelsCache={flowState.setPexelsCache}
            />
          )}
        </div>
      </AdminShell>
    </div>
  )
}
