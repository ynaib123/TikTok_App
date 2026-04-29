import { apiPost } from './adminApiClient.js'

export async function createTikTokAuthorizationUrl(redirectPath = '/accounts') {
  return apiPost('/video-ops/tiktok-oauth/authorize', { redirectPath })
}

export async function completeTikTokAuthorization({ code, state }) {
  return apiPost('/video-ops/tiktok-oauth/callback', { code, state })
}
