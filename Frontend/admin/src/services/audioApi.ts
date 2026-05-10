import { apiGet, apiPost, buildAdminApiUrl } from './adminApiClient'

export interface VoiceCard {
  voiceId: string
  name: string
  language: string
  gender: string
  accent: string
  previewUrl: string
  description: string
}

export interface AudioAsset {
  id: number
  contentIdeaId: number | null
  assetKind: 'voice' | 'music' | 'mix'
  voiceId: string | null
  voiceName: string | null
  voiceLanguage: string | null
  storageUrl: string
  durationMs: number | null
  voiceVolume: number
  musicVolume: number
  selected: boolean
  createdAt: string | null
}

export interface GenerateVoicePayload {
  contentIdeaId: number
  voiceId: string
  text: string
  modelId?: string
  voiceVolume?: number
  musicVolume?: number
}

export async function fetchVoices(): Promise<VoiceCard[]> {
  return apiGet<VoiceCard[]>('/audio/voices')
}

/**
 * The preview endpoint returns raw audio/mpeg bytes — we bypass apiPost
 * (which assumes JSON) and stream the response straight into a Blob the
 * <audio> element can play via URL.createObjectURL.
 */
export async function previewVoiceBlob(voiceId: string, text: string): Promise<Blob> {
  const params = new URLSearchParams({ voiceId, text })
  const response = await fetch(buildAdminApiUrl(`/audio/preview?${params.toString()}`), {
    method: 'POST',
    credentials: 'include',
  })
  if (!response.ok) {
    throw new Error(`ElevenLabs preview failed (${response.status})`)
  }
  return response.blob()
}

export async function generateVoice(payload: GenerateVoicePayload): Promise<AudioAsset> {
  return apiPost<AudioAsset>('/audio/generate', payload)
}

export async function listAudioAssets(contentIdeaId: number): Promise<AudioAsset[]> {
  return apiGet<AudioAsset[]>(`/audio/assets/${contentIdeaId}`)
}

export async function selectAudioAsset(assetId: number): Promise<AudioAsset> {
  return apiPost<AudioAsset>(`/audio/assets/${assetId}/select`, {})
}

/* ── Sons natifs TikTok ─────────────────────────────────────────────────── */

export interface TikTokSound {
  soundId: string
  title: string
  authorName: string
  durationMs: number | null
  coverUrl: string | null
  playUrl: string | null
  videoCount: number | null
  trending: boolean
  category: string | null
}

export interface ImportSoundResponse {
  sound: TikTokSound
  alreadyExisted: boolean
}

export async function fetchTikTokSounds(params?: {
  category?: string
  q?: string
  limit?: number
}): Promise<TikTokSound[]> {
  const qs = new URLSearchParams()
  if (params?.category) qs.set('category', params.category)
  if (params?.q) qs.set('q', params.q)
  if (params?.limit) qs.set('limit', String(params.limit))
  const query = qs.toString()
  return apiGet<TikTokSound[]>(`/audio/tiktok-sounds${query ? `?${query}` : ''}`)
}

export async function importTikTokSoundByUrl(videoUrl: string): Promise<ImportSoundResponse> {
  return apiPost<ImportSoundResponse>('/audio/tiktok-sounds/import', { videoUrl })
}
