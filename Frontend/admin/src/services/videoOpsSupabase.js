import { apiDelete, apiGet, apiPost, apiPut } from './adminApiClient.js'

const USE_MOCK = import.meta.env?.VITE_USE_MOCK_ADMIN_AUTH === 'true'

export async function fetchContentIdeas() {
  if (USE_MOCK) {
    return []
  }
  return apiGet('/video-ops/content-ideas')
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

export async function triggerMainContentPipeline(payload = {}) {
  return apiPost('/video-ops/workflows/main-pipeline', payload)
}

export async function triggerScriptGenerationWorkflow(payload = {}) {
  return apiPost('/video-ops/workflows/script-generation', payload)
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
