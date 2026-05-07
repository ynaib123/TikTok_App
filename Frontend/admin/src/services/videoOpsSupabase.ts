import { apiDelete, apiGet, apiPost, apiPut } from './adminApiClient'
import type {
  AccountsOverview,
  AccountsReadiness,
  ContentIdea,
  ContentIdeaStatus,
  FetchContentIdeasPageParams,
  ManualAction,
  ServiceConnection,
  SpringPageResponse,
  TikTokAccount,
  UploadTikTokMediaResponse,
  VideoOpsDashboard,
  VideoOpsHealth,
  VideoOpsObservability,
  WorkflowRun,
  WorkflowTriggerPayload,
  WorkflowTriggerResponse,
  VideoOpsBootstrapResponse,
} from '../types'

const USE_MOCK = import.meta.env?.VITE_USE_MOCK_ADMIN_AUTH === 'true'
const DEFAULT_CONTENT_IDEAS_SORT = 'id,DESC'
const DEFAULT_CONTENT_IDEAS_PAGE_SIZE = 20
const BULK_CONTENT_IDEAS_PAGE_SIZE = 100

type RawRecord = Record<string, unknown>

function asRecord(value: unknown): RawRecord {
  return value && typeof value === 'object' ? value as RawRecord : {}
}

function normalizeContentIdea(rawIdea: unknown = {}): ContentIdea {
  const raw = asRecord(rawIdea)
  return {
    id: Number(raw.id || 0),
    category: typeof raw.category === 'string' ? raw.category : null,
    topic: typeof raw.topic === 'string' ? raw.topic : null,
    script: typeof raw.script === 'string'
      ? raw.script
      : (typeof raw.scripts === 'string' ? raw.scripts : null),
    caption: typeof raw.caption === 'string' ? raw.caption : null,
    keyword: typeof raw.keyword === 'string'
      ? raw.keyword
      : (typeof raw.backgroundKeyword === 'string' ? raw.backgroundKeyword : null),
    shotstackStatus: typeof raw.shotstackStatus === 'string' ? raw.shotstackStatus : null,
    tiktokStatus: typeof raw.tiktokStatus === 'string' ? raw.tiktokStatus : null,
    finalVideoStatus: typeof raw.finalVideoStatus === 'string' ? raw.finalVideoStatus : null,
    shotstackUrl: typeof raw.shotstackUrl === 'string' ? raw.shotstackUrl : null,
    uploadUrl: typeof raw.uploadUrl === 'string' ? raw.uploadUrl : null,
    tiktokAccountOpenId: typeof raw.tiktokAccountOpenId === 'string' ? raw.tiktokAccountOpenId : null,
    pipelineStatus: typeof raw.pipelineStatus === 'string' ? raw.pipelineStatus : null,
    lastError: typeof raw.lastError === 'string' ? raw.lastError : null,
    templateId: typeof raw.templateId === 'string' ? raw.templateId : null,
    qualityProfile: typeof raw.qualityProfile === 'string' ? raw.qualityProfile : null,
    renderEngine: typeof raw.renderEngine === 'string' ? raw.renderEngine : null,
    thumbnailUrl: typeof raw.thumbnailUrl === 'string' ? raw.thumbnailUrl : null,
  }
}

function createEmptySpringPage(): SpringPageResponse<ContentIdea> {
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

function normalizeContentIdeasPage(rawPage: unknown): SpringPageResponse<ContentIdea> {
  const raw = asRecord(rawPage)
  const rawContent = Array.isArray(raw.content) ? raw.content : []
  const rawPageMeta = asRecord(raw.page)

  return {
    content: rawContent.map((idea) => normalizeContentIdea(idea)),
    page: {
      size: Number(rawPageMeta.size ?? DEFAULT_CONTENT_IDEAS_PAGE_SIZE),
      number: Number(rawPageMeta.number ?? 0),
      totalElements: Number(rawPageMeta.totalElements ?? rawContent.length),
      totalPages: Number(rawPageMeta.totalPages ?? (rawContent.length > 0 ? 1 : 0)),
    },
  }
}

function buildContentIdeasQueryString({
  page = 0,
  size = DEFAULT_CONTENT_IDEAS_PAGE_SIZE,
  sort = DEFAULT_CONTENT_IDEAS_SORT,
}: FetchContentIdeasPageParams = {}): string {
  const searchParams = new URLSearchParams()
  searchParams.set('page', String(page))
  searchParams.set('size', String(size))
  searchParams.set('sort', sort)
  return searchParams.toString()
}

export async function fetchContentIdeasPage(
  params: FetchContentIdeasPageParams = {},
): Promise<SpringPageResponse<ContentIdea>> {
  if (USE_MOCK) {
    return createEmptySpringPage()
  }

  const queryString = buildContentIdeasQueryString(params)
  const response = await apiGet(`/video-ops/content-ideas?${queryString}`)
  return normalizeContentIdeasPage(response)
}

export async function fetchRecentContentIdeas({
  size = BULK_CONTENT_IDEAS_PAGE_SIZE,
}: { size?: number } = {}): Promise<ContentIdea[]> {
  const firstPage = await fetchContentIdeasPage({
    page: 0,
    size,
    sort: DEFAULT_CONTENT_IDEAS_SORT,
  })

  return firstPage.content
}

export async function fetchContentIdeaByIdFromPages(
  contentIdeaId: number | string,
  { size = BULK_CONTENT_IDEAS_PAGE_SIZE }: { size?: number } = {},
): Promise<ContentIdea | null> {
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

export async function fetchContentIdeas(): Promise<ContentIdea[]> {
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

export async function fetchContentIdeaStatus(
  contentIdeaId: number | string,
): Promise<ContentIdeaStatus | null> {
  if (!contentIdeaId) {
    throw new Error('Le contentIdeaId est obligatoire.')
  }

  if (USE_MOCK) {
    return null
  }
  return apiGet(`/video-ops/content-ideas/${contentIdeaId}/status`)
}

function normalizeAccountsReadiness(raw: unknown): AccountsReadiness {
  const r = asRecord(raw)
  return {
    ready: Boolean(r.ready),
    connectedTikTokAccounts: Number(r.connectedTikTokAccounts ?? 0),
    missingItems: Array.isArray(r.missingItems) ? (r.missingItems as string[]) : [],
  }
}

function normalizeAccountsOverview(raw: unknown): AccountsOverview {
  const r = asRecord(raw)
  return {
    tiktokAccounts: Array.isArray(r.tiktokAccounts) ? (r.tiktokAccounts as TikTokAccount[]) : [],
    serviceConnections: Array.isArray(r.serviceConnections) ? (r.serviceConnections as ServiceConnection[]) : [],
    readiness: normalizeAccountsReadiness(r.readiness),
  }
}

export async function fetchTikTokAccounts(): Promise<TikTokAccount[]> {
  const response = await apiGet('/video-ops/tiktok-accounts')
  return Array.isArray(response) ? (response as TikTokAccount[]) : []
}

export async function fetchAccountsOverview(): Promise<AccountsOverview> {
  return normalizeAccountsOverview(await apiGet('/video-ops/accounts'))
}

export async function fetchAccountsReadiness(): Promise<AccountsReadiness> {
  return normalizeAccountsReadiness(await apiGet('/video-ops/accounts/readiness'))
}

export async function fetchVideoOpsBootstrap(): Promise<VideoOpsBootstrapResponse> {
  const raw = asRecord(await apiGet('/video-ops/bootstrap'))
  return {
    accountsOverview: normalizeAccountsOverview(raw.accountsOverview),
    accountsReadiness: normalizeAccountsReadiness(raw.accountsReadiness),
    contentIdeas: normalizeContentIdeasPage(raw.contentIdeas),
    manualActions: Array.isArray(raw.manualActions) ? (raw.manualActions as ManualAction[]) : [],
  }
}

export async function saveServiceConnection(
  providerKey: string,
  payload: Record<string, unknown> | object = {},
): Promise<ServiceConnection> {
  if (!providerKey) {
    throw new Error('Le providerKey est obligatoire.')
  }

  return apiPut(`/video-ops/accounts/services/${providerKey}`, payload)
}

export async function activateServiceConnection(
  providerKey: string,
  connectionId: number | string,
): Promise<ServiceConnection> {
  if (!providerKey || !connectionId) {
    throw new Error('Le providerKey et le connectionId sont obligatoires.')
  }

  return apiPost(`/video-ops/accounts/services/${providerKey}/${connectionId}/activate`, {})
}

export async function validateServiceConnection(
  providerKey: string,
  connectionId: number | string,
): Promise<ServiceConnection> {
  if (!providerKey || !connectionId) {
    throw new Error('Le providerKey et le connectionId sont obligatoires.')
  }

  return apiPost(`/video-ops/accounts/services/${providerKey}/${connectionId}/validate`, {})
}

export async function deleteServiceConnection(
  providerKey: string,
  connectionId: number | string,
): Promise<void> {
  if (!providerKey || !connectionId) {
    throw new Error('Le providerKey et le connectionId sont obligatoires.')
  }

  await apiDelete(`/video-ops/accounts/services/${providerKey}/${connectionId}`)
}

export async function disconnectServiceConnection(providerKey: string): Promise<void> {
  if (!providerKey) {
    throw new Error('Le providerKey est obligatoire.')
  }

  await apiDelete(`/video-ops/accounts/services/${providerKey}`)
}

export async function disconnectTikTokAccount(accountId: number | string): Promise<void> {
  if (!accountId) {
    throw new Error('Le compte TikTok est obligatoire.')
  }

  await apiDelete(`/video-ops/tiktok-accounts/${accountId}`)
}

export async function fetchDashboardData(): Promise<VideoOpsDashboard> {
  if (USE_MOCK) {
    return {}
  }
  return apiGet('/video-ops/dashboard')
}

export async function fetchManualActions(): Promise<ManualAction[]> {
  return apiGet('/video-ops/manual-actions')
}

export async function fetchWorkflowRun(runId: number | string): Promise<WorkflowRun> {
  if (!runId) {
    throw new Error('Le workflowRunId est obligatoire.')
  }

  return apiGet(`/video-ops/workflow-runs/${runId}`)
}

export async function fetchVideoOpsObservability(): Promise<VideoOpsObservability> {
  return apiGet('/video-ops/observability')
}

export async function fetchVideoOpsHealth(): Promise<VideoOpsHealth> {
  return apiGet('/video-ops/health')
}

export async function deleteContentIdea(contentIdeaId: number | string): Promise<void> {
  if (!contentIdeaId) {
    throw new Error('L identifiant de content_idea est obligatoire pour la suppression.')
  }
  await apiDelete(`/video-ops/content-ideas/${contentIdeaId}`)
}

export async function triggerMainContentPipeline(
  payload: WorkflowTriggerPayload = {},
): Promise<WorkflowTriggerResponse> {
  return apiPost('/video-ops/workflows/main-pipeline', payload)
}

export async function triggerRenderTemplateWorkflow(
  payload: WorkflowTriggerPayload = {},
): Promise<WorkflowTriggerResponse> {
  return apiPost('/video-ops/workflows/render-template', payload)
}

export async function triggerPublishTikTokWorkflow(
  payload: WorkflowTriggerPayload = {},
): Promise<WorkflowTriggerResponse> {
  return apiPost('/video-ops/workflows/init-publish', payload)
}

export interface UploadTikTokMediaInput {
  id: number | string
  shotstackUrl?: string | null
  uploadUrl?: string | null
  force?: boolean
}

export async function uploadTikTokMedia({
  id,
  shotstackUrl,
  uploadUrl,
  force = false,
}: UploadTikTokMediaInput): Promise<UploadTikTokMediaResponse> {
  if (!id) {
    throw new Error('L identifiant de content_idea est obligatoire pour l upload TikTok.')
  }

  return apiPost(`/video-ops/content-ideas/${id}/upload`, {
    shotstackUrl,
    uploadUrl,
    force,
  })
}

export async function markUploadDone(): Promise<null> {
  return null
}

export async function markPublishComplete(
  contentIdeaId: number | string,
): Promise<Record<string, unknown>> {
  if (!contentIdeaId) {
    throw new Error('L identifiant de content_idea est obligatoire pour finaliser la publication.')
  }

  return apiPost(`/video-ops/content-ideas/${contentIdeaId}/publish`, {})
}
