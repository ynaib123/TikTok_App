import { apiPost } from './adminApiClient.js'

const USE_MOCK = import.meta.env?.VITE_USE_MOCK_ADMIN_AUTH === 'true'

export async function createTikTokAuthorizationUrl(redirectPath = '/accounts') {
  if (USE_MOCK) {
    return {
      authUrl: 'https://www.tiktok.com/@tiktok',
    }
  }
  return apiPost('/video-ops/tiktok-oauth/authorize', { redirectPath })
}

export async function completeTikTokAuthorization({ code, state }) {
  if (USE_MOCK) {
    return {
      success: true,
      account: {
        id: 'mock-tiktok-id',
        nickname: 'mock_account',
        openId: 'mock-open-id',
        scope: 'user.info.basic,video.publish',
        status: 'active',
      },
    }
  }
  return apiPost('/video-ops/tiktok-oauth/callback', { code, state })
}
