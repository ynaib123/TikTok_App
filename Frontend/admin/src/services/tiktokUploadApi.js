import { apiPost } from './adminApiClient.js'

export async function uploadTikTokMedia({ shotstackUrl, uploadUrl }) {
  return apiPost('/tiktok/upload', {
    shotstackUrl,
    uploadUrl,
  })
}
