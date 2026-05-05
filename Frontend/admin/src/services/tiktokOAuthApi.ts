import { apiPost } from './adminApiClient.js'
import type {
  TikTokOAuthAuthorizeResponse,
  TikTokOAuthCallbackResponse,
} from '../types'

const USE_MOCK = import.meta.env?.VITE_USE_MOCK_ADMIN_AUTH === 'true'

export async function createTikTokAuthorizationUrl(
  redirectPath = '/accounts',
): Promise<TikTokOAuthAuthorizeResponse> {
  if (USE_MOCK) {
    return {
      authUrl: 'https://www.tiktok.com/@tiktok',
    }
  }
  return apiPost('/video-ops/tiktok-oauth/authorize', { redirectPath })
}

export async function completeTikTokAuthorization({
  code,
  state,
}: {
  code: string
  state: string
}): Promise<TikTokOAuthCallbackResponse> {
  if (USE_MOCK) {
    return {
      success: true,
      account: {
        id: 0,
        nickname: 'mock_account',
        openId: 'mock-open-id',
        scope: 'user.info.basic,video.publish',
        environment: 'mock',
        status: 'active',
      },
    }
  }
  return apiPost('/video-ops/tiktok-oauth/callback', { code, state })
}
