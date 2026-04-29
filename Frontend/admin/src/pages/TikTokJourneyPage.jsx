import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import AdminShell from '../components/AdminShell'
import AdminToolbarMenuButton from './admin-dashboard/AdminToolbarMenuButton'
import {
  triggerCheckShotstackWorkflow as triggerScriptGenerationWorkflow,
  triggerMainContentPipeline,
  triggerRenderTemplateWorkflow,
  triggerPublishTikTokWorkflow,
} from '../services/n8nClient'
import {
  fetchContentIdeas,
  fetchManualActions,
  fetchTikTokAccounts,
  fetchWorkflowRun,
  markPublishComplete,
  uploadTikTokMedia,
} from '../services/videoOpsSupabase'
import { createTikTokAuthorizationUrl } from '../services/tiktokOAuthApi'
import '../styles/features/catalog-shared.css'
import '../styles/features/products.css'
import '../styles/themes/products-dark.css'

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

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function isWorkflowRunTerminal(run) {
  const status = String(run?.status || '').toUpperCase()
  return status === 'SUCCEEDED' || status === 'FAILED'
}

function isRenderReady(idea) {
  return Boolean(idea?.shotstackUrl)
    || idea?.finalVideoStatus === 'ready'
    || idea?.shotstackStatus === 'done'
}

function hasScriptGenerationResult(idea) {
  return Boolean(
    String(idea?.script || '').trim()
    || String(idea?.caption || '').trim()
    || String(idea?.keyword || '').trim()
  )
}

function isPublished(idea) {
  return String(idea?.tiktokStatus || '').toLowerCase() === 'published'
}

function isUploadCompleted(idea) {
  return ['uploaded', 'uploading', 'published'].includes(String(idea?.tiktokStatus || '').toLowerCase())
}

function normalizeUrl(value) {
  const url = String(value || '').trim()
  return url || null
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase()
}

function formatShortOpenId(value) {
  const normalized = String(value || '').trim()
  if (!normalized) return '-'
  if (normalized.length <= 18) return normalized
  return `${normalized.slice(0, 8)}...${normalized.slice(-6)}`
}

function mergeIdeasById(existingIdeas, incomingIdeas) {
  const byId = new Map()
  existingIdeas.forEach((idea) => {
    byId.set(Number(idea?.id), idea)
  })
  incomingIdeas.forEach((idea) => {
    byId.set(Number(idea?.id), idea)
  })
  return [...byId.values()].sort((left, right) => Number(right?.id || 0) - Number(left?.id || 0))
}

function getIdeaStatusLabel(idea) {
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

function StepProgress({ currentStepIndex, onBack, isWorking }) {
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

function VideoPreview({ url }) {
  const resolvedUrl = normalizeUrl(url)
  if (!resolvedUrl) {
    return null
  }

  return (
    <video className="tiktok-flow-video" src={resolvedUrl} controls playsInline />
  )
}

export default function TikTokJourneyPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const { data: contentIdeas = [], isLoading } = useQuery({
    queryKey: ['content-ideas'],
    queryFn: fetchContentIdeas,
  })
  const { data: tiktokAccounts = [] } = useQuery({
    queryKey: ['tiktok-accounts'],
    queryFn: fetchTikTokAccounts,
  })
  const [isWorking, setIsWorking] = useState(false)
  const [isConnectingTikTok, setIsConnectingTikTok] = useState(false)
  const [generatedIdeas, setGeneratedIdeas] = useState([])
  const [selectedGeneratedIdeaId, setSelectedGeneratedIdeaId] = useState(null)
  const [generationCount, setGenerationCount] = useState(1)
  const [generationCategory, setGenerationCategory] = useState(TIKTOK_CATEGORY_OPTIONS[0])
  const [lastGenerationBaselineId, setLastGenerationBaselineId] = useState(null)
  const [lastGenerationExpectedCount, setLastGenerationExpectedCount] = useState(0)
  const [isGeneratingIdeas, setIsGeneratingIdeas] = useState(false)
  const [isGeneratingScript, setIsGeneratingScript] = useState(false)
  const [isPreparingVideo, setIsPreparingVideo] = useState(false)
  const [scriptedIdea, setScriptedIdea] = useState(null)
  const [manualAction, setManualAction] = useState(null)
  const [uploadResult, setUploadResult] = useState(null)
  const [errorMessage, setErrorMessage] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)
  const [listSearch, setListSearch] = useState('')
  const [listFilter, setListFilter] = useState('all')
  const [listSort, setListSort] = useState('recent')
  const [listViewMode, setListViewMode] = useState('grid')
  const [openListMenu, setOpenListMenu] = useState(null)
  const currentStepIndex = useMemo(
    () => TIKTOK_STEP_ROUTES.findIndex((route) => location.pathname === route),
    [location.pathname],
  )
  const isFlowRoute = currentStepIndex >= 0
  const connectedTikTokAccount = useMemo(
    () => tiktokAccounts.find((account) => String(account?.openId || '').trim() || String(account?.scope || '').trim()) || null,
    [tiktokAccounts],
  )
  const hasConnectedTikTokAccount = Boolean(connectedTikTokAccount)

  const filteredIdeas = useMemo(() => {
    const normalizedSearch = String(listSearch || '').trim().toLowerCase()
    const nextIdeas = contentIdeas.filter((idea) => {
      if (listFilter === 'published' && !isPublished(idea)) return false
      if (listFilter === 'unpublished' && isPublished(idea)) return false
      if (listFilter === 'ready' && !isRenderReady(idea)) return false

      if (!normalizedSearch) return true

      return [
        idea.id,
        idea.topic,
        idea.script,
        idea.caption,
        getIdeaStatusLabel(idea),
      ].some((value) => String(value || '').toLowerCase().includes(normalizedSearch))
    })

    const sortedIdeas = [...nextIdeas]
    if (listSort === 'oldest') {
      sortedIdeas.sort((left, right) => Number(left?.id || 0) - Number(right?.id || 0))
    } else if (listSort === 'topic_asc') {
      sortedIdeas.sort((left, right) => String(left?.topic || '').localeCompare(String(right?.topic || ''), 'fr', { sensitivity: 'base' }))
    } else if (listSort === 'topic_desc') {
      sortedIdeas.sort((left, right) => String(right?.topic || '').localeCompare(String(left?.topic || ''), 'fr', { sensitivity: 'base' }))
    } else if (listSort === 'published_first') {
      sortedIdeas.sort((left, right) => {
        const publishedDelta = Number(isPublished(right)) - Number(isPublished(left))
        if (publishedDelta !== 0) return publishedDelta
        return Number(right?.id || 0) - Number(left?.id || 0)
      })
    } else {
      sortedIdeas.sort((left, right) => Number(right?.id || 0) - Number(left?.id || 0))
    }

    return sortedIdeas
  }, [contentIdeas, listFilter, listSearch, listSort])
  const currentStep = isFlowRoute ? STEPS[currentStepIndex] : STEPS[0]
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
      .slice(0, lastGenerationExpectedCount || MAX_IDEA_BATCH_SIZE)
  }, [contentIdeas, generatedIdeas, generationCategory, lastGenerationBaselineId, lastGenerationExpectedCount])
  const selectedGeneratedIdea = useMemo(
    () => displayedGeneratedIdeas.find((idea) => Number(idea.id) === Number(selectedGeneratedIdeaId)) || displayedGeneratedIdeas[0] || null,
    [displayedGeneratedIdeas, selectedGeneratedIdeaId],
  )
  const activeIdea = scriptedIdea || selectedGeneratedIdea
  const selectedListFilter = LIST_FILTER_OPTIONS.find((option) => option.value === listFilter) || LIST_FILTER_OPTIONS[0]
  const selectedListSort = LIST_SORT_OPTIONS.find((option) => option.value === listSort) || LIST_SORT_OPTIONS[0]
  const catalogTags = [
    listSearch
      ? {
          id: 'search',
          label: `Recherche: ${listSearch}`,
          isClearable: true,
          onClear: () => setListSearch(''),
        }
      : null,
    {
      id: 'filter',
      label: `Filtre: ${selectedListFilter.label}`,
      isClearable: listFilter !== 'all',
      onClear: () => setListFilter('all'),
    },
    {
      id: 'sort',
      label: `Tri: ${selectedListSort.label}`,
      isClearable: listSort !== 'recent',
      onClear: () => setListSort('recent'),
    },
  ].filter(Boolean)
  const hasClearableCatalogTags = catalogTags.some((tag) => tag.isClearable)
  const handleResetAllCatalogTags = () => {
    setListSearch('')
    setListFilter('all')
    setListSort('recent')
  }

  const showSuccess = (message) => {
    setErrorMessage(null)
    setSuccessMessage(message)
  }

  const showError = (error, fallback) => {
    setSuccessMessage(null)
    setErrorMessage(error?.message || fallback)
  }

  const waitForNewIdeas = async (baselineMaxId, expectedCount, requestedCategory) => {
    const timeoutAt = Date.now() + 3 * 60 * 1000
    let bestMatch = []

    while (Date.now() < timeoutAt) {
      const ideas = await fetchContentIdeas()
      const ideasAfterBaseline = ideas
        .filter((idea) => Number(idea.id) > baselineMaxId)
        .sort((left, right) => Number(right?.id || 0) - Number(left?.id || 0))
      const expectedCategory = normalizeText(requestedCategory)
      const categoryMatchedIdeas = ideasAfterBaseline.filter((idea) => {
        const currentCategory = normalizeText(idea?.category)
        return !expectedCategory || !currentCategory || currentCategory === expectedCategory
      })
      const nextIdeas = categoryMatchedIdeas.length ? categoryMatchedIdeas : ideasAfterBaseline

      if (nextIdeas.length) {
        bestMatch = nextIdeas.slice(0, Math.max(expectedCount, nextIdeas.length))
        setGeneratedIdeas((currentIdeas) => mergeIdeasById(currentIdeas, bestMatch))
        setSelectedGeneratedIdeaId((currentSelectedId) => currentSelectedId || bestMatch[0]?.id || null)
      }

      if (nextIdeas.length >= expectedCount) return nextIdeas.slice(0, expectedCount)
      await sleep(4000)
    }

    const ideas = await fetchContentIdeas()
    const ideasAfterBaseline = ideas
      .filter((idea) => Number(idea.id) > baselineMaxId)
      .sort((left, right) => Number(right?.id || 0) - Number(left?.id || 0))
    const expectedCategory = normalizeText(requestedCategory)
    const categoryMatchedIdeas = ideasAfterBaseline.filter((idea) => {
      const currentCategory = normalizeText(idea?.category)
      return !expectedCategory || !currentCategory || currentCategory === expectedCategory
    })
    const partialIdeas = (categoryMatchedIdeas.length ? categoryMatchedIdeas : ideasAfterBaseline)
      .slice(0, expectedCount)

    if (partialIdeas.length) return partialIdeas

    throw new Error("Les nouvelles idees n'ont pas ete trouvees dans content_ideas.")
  }

  const waitForScriptGeneration = async (ideaId, baselineIdea = null) => {
    const timeoutAt = Date.now() + 15 * 60 * 1000
    const baselineScript = String(baselineIdea?.script || '').trim()
    const baselineCaption = String(baselineIdea?.caption || '').trim()
    const baselineKeyword = String(baselineIdea?.keyword || '').trim()

    while (Date.now() < timeoutAt) {
      const ideas = await fetchContentIdeas()
      const nextIdea = ideas.find((idea) => Number(idea.id) === Number(ideaId))
      if (!nextIdea) {
        await sleep(5000)
        continue
      }

      const nextScript = String(nextIdea?.script || '').trim()
      const nextCaption = String(nextIdea?.caption || '').trim()
      const nextKeyword = String(nextIdea?.keyword || '').trim()
      const hasChanged = nextScript !== baselineScript || nextCaption !== baselineCaption || nextKeyword !== baselineKeyword

      if (hasScriptGenerationResult(nextIdea) && (hasChanged || !baselineIdea)) {
        return nextIdea
      }

      await sleep(5000)
    }

    throw new Error("La generation du script n'a pas fini dans le temps attendu.")
  }

  const waitForRenderedVideo = async (ideaId) => {
    const timeoutAt = Date.now() + 15 * 60 * 1000

    while (Date.now() < timeoutAt) {
      const ideas = await fetchContentIdeas()
      const nextIdea = ideas.find((idea) => Number(idea.id) === Number(ideaId))
      if (!nextIdea) {
        await sleep(5000)
        continue
      }

      if (isRenderReady(nextIdea)) {
        return nextIdea
      }

      await sleep(5000)
    }

    throw new Error("La generation de la video n'a pas fini dans le temps attendu.")
  }

  const waitForUploadPreparation = async (ideaId) => {
    const timeoutAt = Date.now() + 5 * 60 * 1000

    while (Date.now() < timeoutAt) {
      const manualActions = await fetchManualActions()
      const action = manualActions.find((item) => Number(item.id) === Number(ideaId))
      if (action?.uploadUrl) return action
      await sleep(4000)
    }

    throw new Error("L'upload URL TikTok n'a pas ete generee.")
  }

  const waitForWorkflowRunCompletion = async (runId, timeoutMs = 2 * 60 * 1000) => {
    if (!runId) return null

    const timeoutAt = Date.now() + timeoutMs
    let lastRun = null

    while (Date.now() < timeoutAt) {
      const run = await fetchWorkflowRun(runId)
      lastRun = run

      if (String(run?.status || '').toUpperCase() === 'FAILED') {
        throw new Error(run?.errorMessage || `Le workflow ${run?.workflowType || runId} a echoue.`)
      }

      if (isWorkflowRunTerminal(run)) {
        return run
      }

      await sleep(3000)
    }

    return lastRun
  }

  const refreshPipelineData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['content-ideas'] }),
      queryClient.invalidateQueries({ queryKey: ['manual-actions'] }),
      queryClient.invalidateQueries({ queryKey: ['video-dashboard'] }),
    ])
  }

  const resetGeneratedIdeasState = () => {
    setGeneratedIdeas([])
    setSelectedGeneratedIdeaId(null)
    setIsGeneratingScript(false)
    setIsPreparingVideo(false)
    setScriptedIdea(null)
    setManualAction(null)
    setUploadResult(null)
  }

  const resetFlowState = () => {
    resetGeneratedIdeasState()
    setLastGenerationBaselineId(null)
    setLastGenerationExpectedCount(0)
    setIsGeneratingIdeas(false)
    setErrorMessage(null)
    setSuccessMessage(null)
  }

  useEffect(() => {
    if (isFlowRoute) return
    resetFlowState()
  }, [isFlowRoute])

  useEffect(() => {
    if (!location.state?.tiktokOAuthSuccess) return
    setSuccessMessage(location.state.tiktokOAuthSuccess)
    window.history.replaceState({}, document.title)
  }, [location.state])

  const goToStep = (stepId) => {
    navigate(`${TIKTOK_BASE_ROUTE}/${stepId}`)
  }

  const startAddFlow = () => {
    if (!hasConnectedTikTokAccount) {
      setErrorMessage('Connecte d abord un compte TikTok avant de lancer la generation.')
      return
    }
    resetFlowState()
    goToStep('creation')
  }

  const closeAddFlow = () => {
    resetFlowState()
    navigate(TIKTOK_BASE_ROUTE)
  }

  const goBackInFlow = () => {
    if (!isFlowRoute) {
      navigate(TIKTOK_BASE_ROUTE)
      return
    }

    if (currentStepIndex <= 0) {
      closeAddFlow()
      return
    }

    navigate(TIKTOK_STEP_ROUTES[currentStepIndex - 1])
  }

  const handleConnectTikTok = async (redirectPath = '/tiktok/creation') => {
    setIsConnectingTikTok(true)
    setErrorMessage(null)
    setSuccessMessage(null)
    try {
      const response = await createTikTokAuthorizationUrl(redirectPath)
      window.location.assign(response.authUrl)
    } catch (error) {
      showError(error, 'Impossible de lancer la connexion TikTok.')
      setIsConnectingTikTok(false)
    }
  }

  const handleGenerateIdea = async () => {
    const requestedCount = Math.max(1, Math.min(MAX_IDEA_BATCH_SIZE, Number(generationCount) || 1))
    const requestedCategory = String(generationCategory || '').trim()
    const shouldForceGeneration = displayedGeneratedIdeas.length > 0 || requestedCount > 1

    if (!requestedCategory) {
      setErrorMessage('Renseigne une categorie avant de lancer la generation.')
      return
    }

    setIsWorking(true)
    setIsGeneratingIdeas(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
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
          force: shouldForceGeneration,
        })
      ))
      await Promise.all(generationRequests)
      const nextIdeas = await waitForNewIdeas(baselineMaxId, requestedCount, requestedCategory)
      setGeneratedIdeas(nextIdeas)
      setSelectedGeneratedIdeaId(nextIdeas[0]?.id || null)
      setScriptedIdea(null)
      setManualAction(null)
      setUploadResult(null)
      await refreshPipelineData()
      showSuccess(`${nextIdeas.length} idee(s) generee(s). Choisis-en une puis valide pour lancer l etape script.`)
    } catch (error) {
      showError(error, "La generation n'a pas abouti.")
    } finally {
      setIsGeneratingIdeas(false)
      setIsWorking(false)
    }
  }

  const handleValidateCreation = async () => {
    if (!selectedGeneratedIdea?.id) {
      setErrorMessage('Genere puis selectionne une idee avant de valider cette etape.')
      return
    }

    setIsWorking(true)
    setIsGeneratingScript(true)
    setErrorMessage(null)

    try {
      const workflowRun = await triggerScriptGenerationWorkflow({
        source: 'backoffice-tiktok-step-script',
        contentIdeaId: selectedGeneratedIdea.id,
        topic: selectedGeneratedIdea.topic,
      })
      goToStep('script')
      showSuccess('Workflow script lance. Les resultats apparaitront ici des qu ils seront prets.')
      const completedRun = await waitForWorkflowRunCompletion(workflowRun?.runId, 60 * 1000)
      let nextScriptedIdea = null

      if (completedRun && String(completedRun.status || '').toUpperCase() === 'SUCCEEDED') {
        const ideas = await fetchContentIdeas()
        nextScriptedIdea = ideas.find((idea) => Number(idea.id) === Number(selectedGeneratedIdea.id)) || null
      }

      if (!nextScriptedIdea || !hasScriptGenerationResult(nextScriptedIdea)) {
        nextScriptedIdea = await waitForScriptGeneration(selectedGeneratedIdea.id, selectedGeneratedIdea)
      }

      setScriptedIdea(nextScriptedIdea)
      setGeneratedIdeas((currentIdeas) => currentIdeas.map((idea) => (
        Number(idea.id) === Number(nextScriptedIdea.id) ? nextScriptedIdea : idea
      )))
      await refreshPipelineData()
      showSuccess('Script, caption et keyword generes. Verifie le resultat avant de valider.')
    } catch (error) {
      showError(error, "La generation script n'a pas abouti.")
    } finally {
      setIsGeneratingScript(false)
      setIsWorking(false)
    }
  }

  const handleRegenerateScript = async () => {
    const idea = scriptedIdea || selectedGeneratedIdea
    if (!idea?.id) {
      setErrorMessage('Aucune idee disponible pour relancer le script.')
      return
    }

    setIsWorking(true)
    setIsGeneratingScript(true)
    setErrorMessage(null)

    try {
      const workflowRun = await triggerScriptGenerationWorkflow({
        source: 'backoffice-tiktok-step-script-regenerate',
        contentIdeaId: idea.id,
        topic: idea.topic,
        force: true,
      })
      const completedRun = await waitForWorkflowRunCompletion(workflowRun?.runId, 60 * 1000)
      let nextScriptedIdea = null

      if (completedRun && String(completedRun.status || '').toUpperCase() === 'SUCCEEDED') {
        const ideas = await fetchContentIdeas()
        nextScriptedIdea = ideas.find((item) => Number(item.id) === Number(idea.id)) || null
      }

      if (!nextScriptedIdea || !hasScriptGenerationResult(nextScriptedIdea)) {
        nextScriptedIdea = await waitForScriptGeneration(idea.id, idea)
      }

      setScriptedIdea(nextScriptedIdea)
      setGeneratedIdeas((currentIdeas) => currentIdeas.map((currentIdea) => (
        Number(currentIdea.id) === Number(nextScriptedIdea.id) ? nextScriptedIdea : currentIdea
      )))
      await refreshPipelineData()
      showSuccess('Script regenere. Tu peux valider si le contenu te convient.')
    } catch (error) {
      showError(error, "La regeneration du script n'a pas abouti.")
    } finally {
      setIsGeneratingScript(false)
      setIsWorking(false)
    }
  }

  const handleValidateScript = async () => {
    const idea = scriptedIdea || selectedGeneratedIdea
    if (!idea?.id) {
      setErrorMessage('Aucun resultat script a valider.')
      return
    }

    setIsWorking(true)
    setIsPreparingVideo(true)
    setErrorMessage(null)

    try {
      goToStep('init-publish')
      const workflowRun = await triggerRenderTemplateWorkflow({
        source: 'backoffice-tiktok-step-video-render',
        contentIdeaId: idea.id,
        topic: idea.topic,
        script: idea.script,
        caption: idea.caption,
        keyword: idea.keyword,
      })
      showSuccess('Generation video lancee. La video apparaitra ici des qu elle sera prete.')

      const completedRun = await waitForWorkflowRunCompletion(workflowRun?.runId, 90 * 1000)
      let renderedIdea = null

      if (completedRun && String(completedRun.status || '').toUpperCase() === 'SUCCEEDED') {
        const ideas = await fetchContentIdeas()
        renderedIdea = ideas.find((item) => Number(item.id) === Number(idea.id)) || null
      }

      if (!renderedIdea || !isRenderReady(renderedIdea)) {
        renderedIdea = await waitForRenderedVideo(idea.id)
      }

      setScriptedIdea(renderedIdea)
      setGeneratedIdeas((currentIdeas) => currentIdeas.map((currentIdea) => (
        Number(currentIdea.id) === Number(renderedIdea.id) ? renderedIdea : currentIdea
      )))
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
      showSuccess('Video prete. Verifie le template avant de passer a l upload.')
    } catch (error) {
      showError(error, "L'initialisation publish n'a pas abouti.")
    } finally {
      setIsPreparingVideo(false)
      setIsWorking(false)
    }
  }

  const handleRetryInitPublish = async () => {
    await handleValidateScript()
  }

  const handleValidateInitPublish = () => {
    const previewUrl = normalizeUrl(manualAction?.shotstackUrl || scriptedIdea?.shotstackUrl || selectedGeneratedIdea?.shotstackUrl)
    if (!previewUrl) {
      setErrorMessage('Aucune video generee disponible pour cette etape.')
      return
    }

    goToStep('upload')
    showSuccess('Template video valide. Tu peux preparer l upload.')
  }

  const handlePrepareUpload = async () => {
    const idea = scriptedIdea || selectedGeneratedIdea
    if (!idea?.id) {
      setErrorMessage('Aucune video disponible pour preparer l upload.')
      return
    }

    setIsWorking(true)
    setErrorMessage(null)

    try {
      const workflowRun = await triggerPublishTikTokWorkflow({
        source: 'backoffice-tiktok-step-upload-prepare',
        contentIdeaId: idea.id,
        topic: idea.topic,
      })
      const completedRun = await waitForWorkflowRunCompletion(workflowRun?.runId, 60 * 1000)
      let nextManualAction = null

      if (completedRun && String(completedRun.status || '').toUpperCase() === 'SUCCEEDED') {
        const manualActions = await fetchManualActions()
        nextManualAction = manualActions.find((item) => Number(item.id) === Number(idea.id)) || null
      }

      if (!nextManualAction?.uploadUrl) {
        nextManualAction = await waitForUploadPreparation(idea.id)
      }

      setManualAction((currentAction) => ({
        ...currentAction,
        ...nextManualAction,
      }))
      await refreshPipelineData()
      showSuccess('Upload URL disponible. Tu peux lancer l upload.')
    } catch (error) {
      showError(error, "La preparation de l'upload n'a pas abouti.")
    } finally {
      setIsWorking(false)
    }
  }

  const handleUploadVideo = async () => {
    const idea = scriptedIdea || selectedGeneratedIdea
    if (!idea?.id || !manualAction?.shotstackUrl || !manualAction?.uploadUrl) {
      setErrorMessage('Il manque la video ou l upload URL pour lancer l upload.')
      return
    }

    setIsWorking(true)
    setErrorMessage(null)

    try {
      const result = await uploadTikTokMedia({
        id: idea.id,
        shotstackUrl: manualAction.shotstackUrl,
        uploadUrl: manualAction.uploadUrl,
      })
      setUploadResult(result || { ok: true })
      await refreshPipelineData()
      showSuccess('Upload termine. Tu peux passer a la publication finale.')
    } catch (error) {
      try {
        const [ideas, manualActions] = await Promise.all([
          fetchContentIdeas(),
          fetchManualActions(),
        ])
        const refreshedIdea = ideas.find((item) => Number(item?.id) === Number(idea.id)) || null
        const refreshedAction = manualActions.find((item) => Number(item?.id) === Number(idea.id)) || null

        if (refreshedIdea && isUploadCompleted(refreshedIdea)) {
          setScriptedIdea((currentIdea) => (Number(currentIdea?.id) === Number(refreshedIdea.id) ? refreshedIdea : currentIdea))
          setGeneratedIdeas((currentIdeas) => currentIdeas.map((currentIdea) => (
            Number(currentIdea.id) === Number(refreshedIdea.id) ? refreshedIdea : currentIdea
          )))
          setManualAction((currentAction) => ({
            ...currentAction,
            ...(refreshedAction || {}),
          }))
          setUploadResult({
            ok: true,
            recovered: true,
          })
          await refreshPipelineData()
          showSuccess('Upload termine cote serveur. La reponse HTTP a probablement expire, mais la video est bien passee en statut upload.')
          return
        }
      } catch {
      }

      showError(error, "L'upload TikTok n'a pas abouti.")
    } finally {
      setIsWorking(false)
    }
  }

  const handleValidateUpload = () => {
    if (!uploadResult) {
      setErrorMessage('Lance l upload avant de valider cette etape.')
      return
    }

    goToStep('publish')
    showSuccess('Upload valide. Derniere etape: publication.')
  }

  const handlePublishVideo = async () => {
    const idea = scriptedIdea || selectedGeneratedIdea
    if (!idea?.id) {
      setErrorMessage('Aucune video disponible pour finaliser la publication.')
      return
    }

    setIsWorking(true)
    setErrorMessage(null)

    try {
      await markPublishComplete(idea.id)
      await refreshPipelineData()
      showSuccess('Video publiee avec succes.')
    } catch (error) {
      showError(error, "La publication finale n'a pas abouti.")
    } finally {
      setIsWorking(false)
    }
  }

  const renderListView = () => (
    <>
      {catalogTags.length > 0 ? (
        <div className="admin-product-active-filters" aria-label="Filtres et tri actifs">
          <div className="admin-product-active-filters-list">
            {catalogTags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                className={`admin-product-active-filter-tag ${tag.isClearable ? 'is-clearable' : 'is-default'}`}
                onClick={tag.isClearable ? tag.onClear : undefined}
                title={tag.isClearable ? `Retirer ${tag.label}` : tag.label}
                disabled={!tag.isClearable}
              >
                <span>{tag.label}</span>
                {tag.isClearable ? <strong aria-hidden="true">×</strong> : null}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="admin-product-active-filters-reset"
            onClick={handleResetAllCatalogTags}
            disabled={!hasClearableCatalogTags}
          >
            Reinitialiser tout
          </button>
        </div>
      ) : null}

      <section className="tiktok-page-toolbar">
        <div className="admin-product-toolbar">
          <div className="admin-product-toolbar-controls">
            <div className="admin-product-toolbar-actions">
              {!hasConnectedTikTokAccount ? (
                <button
                  type="button"
                  className="video-action-btn"
                  onClick={() => void handleConnectTikTok('/tiktok/creation')}
                  disabled={isConnectingTikTok}
                  title="Connecter un compte TikTok avant de demarrer"
                >
                  {isConnectingTikTok ? 'Connexion...' : 'Connecter TikTok'}
                </button>
              ) : null}
              <button
                type="button"
                className="admin-console-btn admin-console-btn-muted admin-product-toolbar-action admin-product-toolbar-icon-btn"
                onClick={startAddFlow}
                aria-label="Ajouter une video"
                title="Ajouter"
                disabled={!hasConnectedTikTokAccount}
              >
                <span className="admin-toolbar-icon" aria-hidden="true"><AddIcon /></span>
              </button>
            </div>
          </div>

          <div className="admin-product-toolbar-search tiktok-library-toolbar-search">
            <span className="admin-toolbar-icon" aria-hidden="true"><SearchIcon /></span>
            <input
              type="search"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              value={listSearch}
              onChange={(event) => setListSearch(event.target.value)}
              placeholder="Rechercher ..."
              aria-label="Rechercher une video TikTok"
            />
          </div>

          <div className="admin-product-toolbar-filters">
            <button
              type="button"
              className="admin-console-btn admin-console-btn-muted admin-product-toolbar-action admin-product-toolbar-icon-btn"
              onClick={() => setListViewMode(listViewMode === 'grid' ? 'table' : 'grid')}
              aria-label={`Basculer vers l affichage ${listViewMode === 'grid' ? 'tableau' : 'grille'}`}
              title={`Affichage actuel: ${listViewMode === 'grid' ? 'Grille' : 'Tableau'}`}
            >
              <span className="admin-toolbar-icon" aria-hidden="true">
                {listViewMode === 'grid' ? <TableIcon /> : <GridIcon />}
              </span>
            </button>

            <AdminToolbarMenuButton
              ariaLabel={`Filtrer les videos, filtre actuel ${selectedListFilter.label}`}
              icon={<FilterIcon />}
              menuAriaLabel="Filtres des videos TikTok"
              menuId="tiktok-filter"
              openCatalogMenu={openListMenu}
              setOpenCatalogMenu={setOpenListMenu}
              title={`Filtre: ${selectedListFilter.label}`}
            >
              {({ closeMenu }) => (
                <div className="admin-product-toolbar-menu-options-scroll admin-product-toolbar-menu-options-scroll-five">
                  {LIST_FILTER_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`admin-product-toolbar-option ${listFilter === option.value ? 'is-selected' : ''}`}
                      onClick={() => {
                        setListFilter(option.value)
                        closeMenu()
                      }}
                    >
                      <span>{option.label}</span>
                      {listFilter === option.value ? <strong>•</strong> : null}
                    </button>
                  ))}
                </div>
              )}
            </AdminToolbarMenuButton>

            <AdminToolbarMenuButton
              ariaLabel={`Trier les videos, tri actuel ${selectedListSort.label}`}
              icon={<SortIcon />}
              menuAriaLabel="Tri des videos TikTok"
              menuClassName="admin-product-toolbar-menu-sort"
              menuId="tiktok-sort"
              openCatalogMenu={openListMenu}
              setOpenCatalogMenu={setOpenListMenu}
              title={`Tri: ${selectedListSort.label}`}
            >
              {({ closeMenu }) => (
                <div className="admin-product-toolbar-menu-options-scroll admin-product-toolbar-menu-options-scroll-five">
                  {LIST_SORT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`admin-product-toolbar-option ${listSort === option.value ? 'is-selected' : ''}`}
                      onClick={() => {
                        setListSort(option.value)
                        closeMenu()
                      }}
                    >
                      <span>{option.label}</span>
                      {listSort === option.value ? <strong>•</strong> : null}
                    </button>
                  ))}
                </div>
              )}
            </AdminToolbarMenuButton>
          </div>
        </div>
      </section>

      <section className="tiktok-library-meta">
        <p className="video-inline-state">
          {filteredIdeas.length} video(s) affichee(s) sur {contentIdeas.length}
        </p>
        <div className="tiktok-library-legend" aria-label="Legende des statuts">
          <span><i className="is-online" aria-hidden="true" /> Publiee</span>
          <span><i className="is-offline" aria-hidden="true" /> Non publiee</span>
        </div>
      </section>

      {!hasConnectedTikTokAccount ? (
        <section className="tiktok-step-empty-state" aria-live="polite">
          <strong>Connexion TikTok requise</strong>
          <p>Relie un compte TikTok avant de generer une nouvelle video et de lancer `init-publish-tiktok`.</p>
        </section>
      ) : null}

      {isLoading ? <p className="video-inline-state">Chargement...</p> : null}
      {!isLoading && !filteredIdeas.length ? <p className="video-inline-state">Aucune video ne correspond a cette recherche.</p> : null}

      {!isLoading && filteredIdeas.length ? (
        listViewMode === 'grid' ? (
          <section className="tiktok-card-grid">
            {filteredIdeas.map((idea) => (
              <article key={idea.id} className={`tiktok-video-card ${isPublished(idea) ? 'is-published' : 'is-unpublished'}`}>
                <div className="tiktok-video-card-media">
                  {normalizeUrl(idea.shotstackUrl) ? (
                    <video src={idea.shotstackUrl} muted playsInline preload="metadata" />
                  ) : (
                    <div className="tiktok-video-card-placeholder">
                      <span>Video #{idea.id}</span>
                    </div>
                  )}
                  <span
                    className={`tiktok-status-light ${isPublished(idea) ? 'is-online' : 'is-offline'}`}
                    title={isPublished(idea) ? 'Publiee' : 'Non publiee'}
                    aria-label={isPublished(idea) ? 'Video publiee' : 'Video non publiee'}
                  />
                </div>
                <div className="tiktok-video-card-body">
                  <strong>{idea.topic || `Video #${idea.id}`}</strong>
                  <p>{idea.caption || idea.script || 'Aucune description disponible.'}</p>
                  <span>{getIdeaStatusLabel(idea)}</span>
                </div>
              </article>
            ))}
          </section>
        ) : (
          <div className="video-table-wrap">
            <table className="video-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Topic</th>
                  <th>Statut</th>
                  <th>Render</th>
                  <th>Caption</th>
                </tr>
              </thead>
              <tbody>
                {filteredIdeas.map((idea) => (
                  <tr key={idea.id}>
                    <td>#{idea.id}</td>
                    <td>{idea.topic || `Video #${idea.id}`}</td>
                    <td>
                      <span className="tiktok-table-status">
                        <i className={`tiktok-status-light ${isPublished(idea) ? 'is-online' : 'is-offline'}`} aria-hidden="true" />
                        {getIdeaStatusLabel(idea)}
                      </span>
                    </td>
                    <td>{isRenderReady(idea) ? 'Pret' : idea.shotstackStatus || 'En attente'}</td>
                    <td>{idea.caption || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : null}
    </>
  )

  const renderStepScreen = () => {
    if (currentStep.id === 'creation') {
      return {
        actions: (
          <div className="tiktok-step-actions">
            {!hasConnectedTikTokAccount ? (
              <div className="tiktok-step-intro">
                <strong>Compte TikTok requis</strong>
                <p>La generation est verrouillee tant qu aucun compte TikTok n est connecte au backoffice.</p>
              </div>
            ) : null}
            <div className="tiktok-step-form">
              <label className="tiktok-step-field">
                <span>Categorie</span>
                <div className="tiktok-step-toolbar-select">
                  <button
                    type="button"
                    className={`admin-product-toolbar-trigger tiktok-step-toolbar-trigger ${openListMenu === 'tiktok-category' ? 'is-open' : ''}`}
                    onClick={() => setOpenListMenu((currentMenu) => (currentMenu === 'tiktok-category' ? null : 'tiktok-category'))}
                    aria-haspopup="listbox"
                    aria-expanded={openListMenu === 'tiktok-category'}
                    aria-controls={openListMenu === 'tiktok-category' ? 'tiktok-category-menu' : undefined}
                    disabled={isWorking || !hasConnectedTikTokAccount}
                  >
                    <strong>{generationCategory}</strong>
                    <span className="admin-toolbar-icon" aria-hidden="true"><ChevronDownIcon /></span>
                  </button>

                  {openListMenu === 'tiktok-category' ? (
                    <div
                      id="tiktok-category-menu"
                      className="admin-product-toolbar-menu tiktok-step-toolbar-menu"
                      role="listbox"
                      aria-label="Choix de categorie TikTok"
                    >
                      <div className="admin-product-toolbar-menu-options-scroll admin-product-toolbar-menu-options-scroll-five">
                        {TIKTOK_CATEGORY_OPTIONS.map((category) => (
                          <button
                            key={category}
                            type="button"
                            className={`admin-product-toolbar-option ${generationCategory === category ? 'is-selected' : ''}`}
                            onClick={() => {
                              setGenerationCategory(category)
                              setOpenListMenu(null)
                            }}
                          >
                            <span>{category}</span>
                            {generationCategory === category ? <strong>•</strong> : null}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </label>
              <label className="tiktok-step-field">
                <span>Count</span>
                <input
                  type="number"
                  min="1"
                  max={MAX_IDEA_BATCH_SIZE}
                  step="1"
                  value={generationCount}
                  onChange={(event) => {
                    const rawValue = String(event.target.value || '').replace(/\D/g, '').slice(0, 1)
                    if (!rawValue) {
                      setGenerationCount('')
                      return
                    }

                    const nextValue = Math.max(1, Math.min(MAX_IDEA_BATCH_SIZE, Number(rawValue)))
                    setGenerationCount(String(nextValue))
                  }}
                  disabled={isWorking || !hasConnectedTikTokAccount}
                />
              </label>
            </div>
            {isGeneratingIdeas ? (
              <div
                className="tiktok-generate-loading"
                role="progressbar"
                aria-label="Generation des idees en cours"
                aria-valuetext="Generation des idees en cours"
              >
                <span className="tiktok-generate-loading-bar" aria-hidden="true" />
                <strong>Generation en cours...</strong>
              </div>
            ) : (
              <button type="button" className="video-action-btn" onClick={() => void handleGenerateIdea()} disabled={isWorking || !hasConnectedTikTokAccount}>
                {displayedGeneratedIdeas.length ? 'Regenerer des idees' : 'Generer'}
              </button>
            )}
            {!hasConnectedTikTokAccount ? (
              <button type="button" className="video-action-btn ghost" onClick={() => void handleConnectTikTok('/tiktok/creation')} disabled={isConnectingTikTok}>
                {isConnectingTikTok ? 'Connexion...' : 'Connecter TikTok'}
              </button>
            ) : null}
            <button type="button" className="video-action-btn ghost" onClick={() => void handleValidateCreation()} disabled={isWorking || !selectedGeneratedIdea || !hasConnectedTikTokAccount}>
              Valider
            </button>
          </div>
        ),
        result: (
          <div className="tiktok-step-result">
            {isGeneratingIdeas ? (
              <div className="tiktok-loading-state" aria-live="polite" aria-label="Generation des idees en cours">
                <div className="tiktok-loading-state-spinner" aria-hidden="true" />
                <div className="tiktok-loading-state-copy">
                  <strong>Generation en cours</strong>
                  <span>Preparation des nouvelles idees...</span>
                </div>
              </div>
            ) : null}
            {displayedGeneratedIdeas.length ? (
              <div className="tiktok-ideas-list">
                {displayedGeneratedIdeas.map((idea, index) => {
                  const isSelected = Number(idea.id) === Number(selectedGeneratedIdea?.id)
                  const previewText = idea.caption || idea.script

                  return (
                    <button
                      key={idea.id}
                      type="button"
                      className={`tiktok-idea-preview ${isSelected ? 'is-selected' : ''}`}
                      onClick={() => setSelectedGeneratedIdeaId(idea.id)}
                    >
                      <div className="tiktok-idea-preview-head">
                        <span className="tiktok-idea-preview-kicker">{isSelected ? 'Selectionnee' : `Idee ${index + 1}`}</span>
                        <span className={`tiktok-idea-preview-indicator ${isSelected ? 'is-selected' : ''}`} aria-hidden="true" />
                      </div>
                      <strong>{idea.topic || `Video #${idea.id}`}</strong>
                      {previewText ? <p>{previewText}</p> : null}
                    </button>
                  )
                })}
              </div>
            ) : null}
          </div>
        ),
      }
    }

    if (currentStep.id === 'script') {
      return {
        actions: (
          <div className="tiktok-step-actions">
            <button type="button" className="video-action-btn" onClick={() => void handleRegenerateScript()} disabled={isWorking}>
              Regenerer script
            </button>
            <button type="button" className="video-action-btn ghost" onClick={() => void handleValidateScript()} disabled={isWorking || !scriptedIdea}>
              Valider
            </button>
          </div>
        ),
        result: (
          <div className="tiktok-step-result">
            {isGeneratingScript && !scriptedIdea ? (
              <div className="tiktok-loading-state" aria-live="polite" aria-label="Generation du script en cours">
                <div className="tiktok-loading-state-spinner" aria-hidden="true" />
                <div className="tiktok-loading-state-copy">
                  <strong>Generation script en cours</strong>
                  <span>Le resultat de l idee selectionnee apparaitra ici des qu il sera pret.</span>
                </div>
              </div>
            ) : (
              <div className="video-preview-stack">
                <div className="video-preview-block">
                  <span>Topic</span>
                  <p>{scriptedIdea?.topic || '-'}</p>
                </div>
                <div className="video-preview-block">
                  <span>Script</span>
                  <p>{scriptedIdea?.script || 'En attente'}</p>
                </div>
                <div className="video-preview-block">
                  <span>Caption</span>
                  <p>{scriptedIdea?.caption || 'En attente'}</p>
                </div>
                <div className="video-preview-block">
                  <span>Keyword</span>
                  <p>{scriptedIdea?.keyword || 'En attente'}</p>
                </div>
              </div>
            )}
          </div>
        ),
      }
    }

    if (currentStep.id === 'init-publish') {
      const previewUrl = normalizeUrl(manualAction?.shotstackUrl || scriptedIdea?.shotstackUrl || selectedGeneratedIdea?.shotstackUrl)

      return {
        actions: (
          <div className="tiktok-step-actions">
            <button type="button" className="video-action-btn" onClick={() => void handleRetryInitPublish()} disabled={isWorking}>
              Relancer la generation video
            </button>
            <button type="button" className="video-action-btn ghost" onClick={handleValidateInitPublish} disabled={isWorking || !previewUrl}>
              Valider
            </button>
          </div>
        ),
        result: (
          <div className="tiktok-step-result">
            {isPreparingVideo && !previewUrl ? (
              <div className="tiktok-loading-state" aria-live="polite" aria-label="Generation de la video en cours">
                <div className="tiktok-loading-state-spinner" aria-hidden="true" />
                <div className="tiktok-loading-state-copy">
                  <strong>Generation video en cours</strong>
                  <span>La preparation video est en cours.</span>
                </div>
              </div>
            ) : null}
            {previewUrl ? (
              <div className="video-preview-stack">
                <div className="video-preview-block">
                  <span>Apercu video</span>
                  <VideoPreview url={previewUrl} />
                </div>
              </div>
            ) : null}
          </div>
        ),
      }
    }

    if (currentStep.id === 'upload') {
      return {
        actions: (
          <div className="tiktok-step-actions">
            <div className="tiktok-step-intro">
              <strong>{hasConnectedTikTokAccount ? 'Compte TikTok connecte' : 'Connexion TikTok requise'}</strong>
              <p>
                {hasConnectedTikTokAccount
                  ? 'Tu peux reconnecter ou changer le compte TikTok avant l upload.'
                  : 'Connecte un compte TikTok ici avant d autoriser l upload.'}
              </p>
            </div>
            {hasConnectedTikTokAccount ? (
              <div className="video-preview-block">
                <span>Compte connecte</span>
                <p>{connectedTikTokAccount?.nickname || '-'}</p>
                <p>Open ID: {formatShortOpenId(connectedTikTokAccount?.openId)}</p>
                <p>Scope: {connectedTikTokAccount?.scope || '-'}</p>
                <p>Status: {connectedTikTokAccount?.status || '-'}</p>
              </div>
            ) : null}
            {hasConnectedTikTokAccount ? (
              <button type="button" className="video-action-btn ghost" onClick={() => void handleConnectTikTok('/tiktok/upload')} disabled={isConnectingTikTok}>
                {isConnectingTikTok ? 'Connexion...' : 'Changer de compte'}
              </button>
            ) : (
              <button type="button" className="video-action-btn" onClick={() => void handleConnectTikTok('/tiktok/upload')} disabled={isConnectingTikTok}>
                {isConnectingTikTok ? 'Connexion...' : 'Connecter TikTok'}
              </button>
            )}
            <button type="button" className="video-action-btn" onClick={() => void handlePrepareUpload()} disabled={isWorking || Boolean(manualAction?.uploadUrl)}>
              Preparer upload
            </button>
            <button type="button" className="video-action-btn ghost" onClick={() => void handleUploadVideo()} disabled={isWorking || !manualAction?.uploadUrl || !hasConnectedTikTokAccount}>
              Uploader
            </button>
            <button type="button" className="video-action-btn ghost" onClick={handleValidateUpload} disabled={isWorking || !uploadResult}>
              Valider
            </button>
          </div>
        ),
        result: (
          <div className="tiktok-step-result">
            <div className="video-preview-stack">
              <div className="video-preview-block">
                <span>Upload URL</span>
                <p>{manualAction?.uploadUrl || 'En attente'}</p>
              </div>
              <div className="video-preview-block">
                <span>Resultat upload</span>
                <p>{uploadResult ? 'Upload termine.' : 'Aucun upload lance.'}</p>
              </div>
            </div>
          </div>
        ),
      }
    }

    return {
      actions: (
        <div className="tiktok-step-actions">
          <button type="button" className="video-action-btn" onClick={() => void handlePublishVideo()} disabled={isWorking}>
            Publier
          </button>
          <button type="button" className="video-action-btn ghost" onClick={closeAddFlow} disabled={isWorking}>
            Terminer
          </button>
        </div>
      ),
      result: (
        <div className="tiktok-step-result">
          <div className="video-preview-stack">
            <div className="video-preview-block">
              <span>Video</span>
              <p>{activeIdea?.topic || 'Publication en attente.'}</p>
            </div>
            <div className="video-preview-block">
              <span>Status</span>
              <p>{successMessage || 'Pret pour publication finale.'}</p>
            </div>
          </div>
        </div>
      ),
    }
  }

  const stepScreen = renderStepScreen()

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
          {!isFlowRoute ? renderListView() : (
            <section className="tiktok-flow">
              <div className="tiktok-page-toolbar tiktok-flow-topbar">
                <StepProgress currentStepIndex={currentStepIndex} onBack={goBackInFlow} isWorking={isWorking} />
              </div>

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
