import { apiGet, apiPost } from './adminApiClient.js'

export async function fetchContentIdeas() {
  return apiGet('/video-ops/content-ideas')
}

export async function fetchTikTokAccounts() {
  return apiGet('/video-ops/tiktok-accounts')
}

export async function fetchDashboardData() {
  return apiGet('/video-ops/dashboard')
}

export async function fetchManualActions() {
  return apiGet('/video-ops/manual-actions')
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
