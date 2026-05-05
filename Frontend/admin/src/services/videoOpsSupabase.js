import { apiDelete, apiGet, apiPost, apiPut } from './adminApiClient.js'

const USE_MOCK = import.meta.env?.VITE_USE_MOCK_ADMIN_AUTH === 'true'
const DEFAULT_CONTENT_IDEAS_SORT = 'id,DESC'
const DEFAULT_CONTENT_IDEAS_PAGE_SIZE = 20
const BULK_CONTENT_IDEAS_PAGE_SIZE = 100

function normalizeContentIdea(rawIdea = {}) {
  return {
    id: Number(rawIdea?.id || 0),
    category: rawIdea?.category ?? null,
    topic: rawIdea?.topic ?? null,
    script: rawIdea?.script ?? rawIdea?.scripts ?? null,
    caption: rawIdea?.caption ?? null,
    keyword: rawIdea?.keyword ?? rawIdea?.backgroundKeyword ?? null,
    shotstackStatus: rawIdea?.shotstackStatus ?? null,
    tiktokStatus: rawIdea?.tiktokStatus ?? null,
    finalVideoStatus: rawIdea?.finalVideoStatus ?? null,
    shotstackUrl: rawIdea?.shotstackUrl ?? null,
    uploadUrl: rawIdea?.uploadUrl ?? null,
    tiktokAccountOpenId: rawIdea?.tiktokAccountOpenId ?? null,
    pipelineStatus: rawIdea?.pipelineStatus ?? null,
    lastError: rawIdea?.lastError ?? null,
  }
}

function createEmptySpringPage() {
  return {
    content: [],
    page: {
      size: DEFAULT_CONTENT_IDEAS_PAGE_SIZE,
      number: 0,
      totalElements: 0,
      totalPages: 0,
    },
  }
}

function normalizeContentIdeasPage(rawPage) {
  const rawContent = Array.isArray(rawPage?.content) ? rawPage.content : []
  const rawPageMeta = rawPage?.page ?? {}

  return {
    content: rawContent.map((idea) => normalizeContentIdea(idea)),
    page: {
      size: Number(rawPageMeta?.size ?? DEFAULT_CONTENT_IDEAS_PAGE_SIZE),
      number: Number(rawPageMeta?.number ?? 0),
      totalElements: Number(rawPageMeta?.totalElements ?? rawContent.length),
      totalPages: Number(rawPageMeta?.totalPages ?? (rawContent.length > 0 ? 1 : 0)),
    },
  }
}

function buildContentIdeasQueryString({ page = 0, size = DEFAULT_CONTENT_IDEAS_PAGE_SIZE, sort = DEFAULT_CONTENT_IDEAS_SORT } = {}) {
  const searchParams = new URLSearchParams()
  searchParams.set('page', String(page))
  searchParams.set('size', String(size))
  searchParams.set('sort', sort)
  return searchParams.toString()
}

export async function fetchContentIdeasPage(params = {}) {
  if (USE_MOCK) {
    return createEmptySpringPage()
  }

  const queryString = buildContentIdeasQueryString(params)
  const response = await apiGet(`/video-ops/content-ideas?${queryString}`)
  return normalizeContentIdeasPage(response)
}

export async function fetchRecentContentIdeas({ size = BULK_CONTENT_IDEAS_PAGE_SIZE } = {}) {
  const firstPage = await fetchContentIdeasPage({
    page: 0,
    size,
    sort: DEFAULT_CONTENT_IDEAS_SORT,
  })

  return firstPage.content
}

export async function fetchContentIdeaByIdFromPages(contentIdeaId, { size = BULK_CONTENT_IDEAS_PAGE_SIZE } = {}) {
  if (!contentIdeaId) {
    throw new Error('Le contentIdeaId est obligatoire.')
  }

  const firstPage = await fetchContentIdeasPage({
    page: 0,
    size,
    sort: DEFAULT_CONTENT_IDEAS_SORT,
  })
  const firstMatch = firstPage.content.find((idea) => Number(idea?.id) === Number(contentIdeaId))
  if (firstMatch) {
    return firstMatch
  }

  const totalPages = Number(firstPage?.page?.totalPages ?? 0)
  for (let nextPage = 1; nextPage < totalPages; nextPage += 1) {
    const responsePage = await fetchContentIdeasPage({
      page: nextPage,
      size,
      sort: DEFAULT_CONTENT_IDEAS_SORT,
    })
    const pageMatch = responsePage.content.find((idea) => Number(idea?.id) === Number(contentIdeaId))
    if (pageMatch) {
      return pageMatch
    }
  }

  return null
}

export async function fetchContentIdeas() {
  const firstPage = await fetchContentIdeasPage({
    page: 0,
    size: BULK_CONTENT_IDEAS_PAGE_SIZE,
    sort: DEFAULT_CONTENT_IDEAS_SORT,
  })

  const mergedIdeas = [...firstPage.content]
  const totalPages = Number(firstPage?.page?.totalPages ?? 0)

  for (let nextPage = 1; nextPage < totalPages; nextPage += 1) {
    const responsePage = await fetchContentIdeasPage({
      page: nextPage,
      size: BULK_CONTENT_IDEAS_PAGE_SIZE,
      sort: DEFAULT_CONTENT_IDEAS_SORT,
    })
    mergedIdeas.push(...responsePage.content)
  }

  return mergedIdeas
}

export async function fetchContentIdeaStatus(contentIdeaId) {
  if (!contentIdeaId) {
    throw new Error('Le contentIdeaId est obligatoire.')
  }

  if (USE_MOCK) {
    return null
  }
  return apiGet(`/video-ops/content-ideas/${contentIdeaId}/status`)
}

export async function fetchTikTokAccounts() {
  return apiGet('/video-ops/tiktok-accounts')
}

export async function fetchAccountsOverview() {
  return apiGet('/video-ops/accounts')
}

export async function fetchAccountsReadiness() {
  return apiGet('/video-ops/accounts/readiness')
}

export async function saveServiceConnection(providerKey, payload = {}) {
  if (!providerKey) {
    throw new Error('Le providerKey est obligatoire.')
  }

  return apiPut(`/video-ops/accounts/services/${providerKey}`, payload)
}

export async function activateServiceConnection(providerKey, connectionId) {
  if (!providerKey || !connectionId) {
    throw new Error('Le providerKey et le connectionId sont obligatoires.')
  }

  return apiPost(`/video-ops/accounts/services/${providerKey}/${connectionId}/activate`, {})
}

export async function validateServiceConnection(providerKey, connectionId) {
  if (!providerKey || !connectionId) {
    throw new Error('Le providerKey et le connectionId sont obligatoires.')
  }

  return apiPost(`/video-ops/accounts/services/${providerKey}/${connectionId}/validate`, {})
}

export async function deleteServiceConnection(providerKey, connectionId) {
  if (!providerKey || !connectionId) {
    throw new Error('Le providerKey et le connectionId sont obligatoires.')
  }

  return apiDelete(`/video-ops/accounts/services/${providerKey}/${connectionId}`)
}

export async function disconnectServiceConnection(providerKey) {
  if (!providerKey) {
    throw new Error('Le providerKey est obligatoire.')
  }

  return apiDelete(`/video-ops/accounts/services/${providerKey}`)
}

export async function disconnectTikTokAccount(accountId) {
  if (!accountId) {
    throw new Error('Le compte TikTok est obligatoire.')
  }

  return apiDelete(`/video-ops/tiktok-accounts/${accountId}`)
}

export async function fetchDashboardData() {
  if (USE_MOCK) {
    return {}
  }
  return apiGet('/video-ops/dashboard')
}

export async function fetchManualActions() {
  return apiGet('/video-ops/manual-actions')
}

export async function fetchWorkflowRun(runId) {
  if (!runId) {
    throw new Error('Le workflowRunId est obligatoire.')
  }

  return apiGet(`/video-ops/workflow-runs/${runId}`)
}

export async function fetchVideoOpsObservability() {
  return apiGet('/video-ops/observability')
}

export async function fetchVideoOpsHealth() {
  return apiGet('/video-ops/health')
}

export async function triggerMainContentPipeline(payload = {}) {
  return apiPost('/video-ops/workflows/main-pipeline', payload)
}

export async function triggerCheckShotstackWorkflow(payload = {}) {
  return apiPost('/video-ops/workflows/check-shotstack', payload)
}

export async function triggerRenderTemplateWorkflow(payload = {}) {
  return apiPost('/video-ops/workflows/render-template', payload)
}

export async function triggerPublishTikTokWorkflow(payload = {}) {
  return apiPost('/video-ops/workflows/init-publish', payload)
}

export async function uploadTikTokMedia({ id, shotstackUrl, uploadUrl, force = false }) {
  if (!id) {
    throw new Error('L identifiant de content_idea est obligatoire pour l upload TikTok.')
  }

  return apiPost(`/video-ops/content-ideas/${id}/upload`, {
    shotstackUrl,
    uploadUrl,
    force,
  })
}

export async function markUploadDone() {
  return null
}

export async function markPublishComplete(contentIdeaId) {
  if (!contentIdeaId) {
    throw new Error('L identifiant de content_idea est obligatoire pour finaliser la publication.')
  }

  return apiPost(`/video-ops/content-ideas/${contentIdeaId}/publish`, {})
}
