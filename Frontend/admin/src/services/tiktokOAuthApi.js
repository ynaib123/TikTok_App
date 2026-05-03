import { apiPost } from './adminApiClient.js'

const USE_MOCK = import.meta.env?.VITE_USE_MOCK_ADMIN_AUTH === 'true'

// Mock TikTok accounts storage
const mockTikTokAccounts = []

function addMockTikTokAccount(account) {
  mockTikTokAccounts.push({
    id: account.id || 'tiktok-' + Date.now(),
    nickname: account.nickname || 'mock_account',
    openId: account.openId || 'mock-open-id',
    scope: account.scope || 'user.info.basic,video.publish',
    status: account.status || 'active',
    createdAt: new Date().toISOString(),
  })
}

export function getMockTikTokAccounts() {
  return mockTikTokAccounts
}

export function removeMockTikTokAccount(accountId) {
  const idx = mockTikTokAccounts.findIndex(a => a.id === accountId)
  if (idx >= 0) mockTikTokAccounts.splice(idx, 1)
}

export async function createTikTokAuthorizationUrl(redirectPath = '/accounts') {
  if (USE_MOCK) {
    // Simulate OAuth callback with success parameter
    const callbackUrl = `${window.location.origin}/oauth/tiktok/callback?tiktokSuccess=1`
    return {
      authUrl: callbackUrl,
    }
  }
  return apiPost('/video-ops/tiktok-oauth/authorize', { redirectPath })
}

export async function completeTikTokAuthorization({ code, state }) {
  if (USE_MOCK) {
    const account = {
      id: 'mock-tiktok-id-' + Date.now(),
      nickname: 'mock_account_' + Math.floor(Math.random() * 1000),
      openId: 'mock-open-id',
      scope: 'user.info.basic,video.publish',
      status: 'active',
    }
    addMockTikTokAccount(account)
    return {
      success: true,
      account,
      displayName: account.nickname,
    }
  }
  return apiPost('/video-ops/tiktok-oauth/callback', { code, state })
}
