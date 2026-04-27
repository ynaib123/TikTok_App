import {
  contentIdeas as mockContentIdeas,
  dashboardStats as mockDashboardStats,
  manualActions as mockManualActions,
  statusGroups as mockStatusGroups,
  tiktokAccounts as mockTikTokAccounts,
} from './videoOpsData'
import { isSupabaseConfigured, supabase } from './supabaseClient'

function mapContentIdea(row) {
  return {
    id: row.id,
    topic: row.topic || '',
    script: row.scripts || '',
    caption: row.caption || '',
    keyword: row.background_keyword || '',
    shotstackStatus: row.shotstack_status || 'unknown',
    tiktokStatus: row.publish_status || 'draft',
    finalVideoStatus: row.final_video_status || 'unknown',
    shotstackUrl: row.shotstack_url || '',
    uploadUrl: row.tiktok_upload_url || '',
  }
}

export async function fetchContentIdeas() {
  if (!isSupabaseConfigured || !supabase) {
    return mockContentIdeas
  }

  const { data, error } = await supabase
    .from('content_ideas')
    .select('id, topic, scripts, caption, background_keyword, shotstack_status, publish_status, final_video_status, shotstack_url, tiktok_upload_url')
    .order('id', { ascending: false })
    .limit(50)

  if (error) throw error

  return (data || []).map(mapContentIdea)
}

export async function fetchTikTokAccounts() {
  if (!isSupabaseConfigured || !supabase) {
    return mockTikTokAccounts
  }

  const { data, error } = await supabase
    .from('tiktok_accounts')
    .select('id, open_id, scope')
    .order('id', { ascending: true })

  if (error) throw error

  return (data || []).map((row) => ({
    id: row.id,
    nickname: row.open_id ? `account-${row.id}` : `account-${row.id}`,
    openId: row.open_id || '',
    scope: row.scope || '',
    environment: 'sandbox',
    status: 'connected',
  }))
}

export async function fetchDashboardData() {
  const ideas = await fetchContentIdeas()

  if (!ideas.length) {
    return {
      stats: mockDashboardStats,
      groups: mockStatusGroups,
    }
  }

  const renderingCount = ideas.filter((item) => ['queued', 'rendering', 'preprocessing'].includes(item.shotstackStatus)).length
  const readyCount = ideas.filter((item) => item.finalVideoStatus === 'ready').length
  const uploadQueueCount = ideas.filter((item) => item.tiktokStatus === 'uploading' || item.uploadUrl).length
  const publishedCount = ideas.filter((item) => item.tiktokStatus === 'published').length

  return {
    stats: [
      { label: 'Content Ideas', value: String(ideas.length), tone: 'neutral' },
      { label: 'Renders In Progress', value: String(renderingCount), tone: 'accent' },
      { label: 'Ready To Publish', value: String(readyCount), tone: 'success' },
      { label: 'Manual Upload Queue', value: String(uploadQueueCount), tone: 'warning' },
    ],
    groups: [
      { label: 'Queued', value: ideas.filter((item) => item.shotstackStatus === 'queued').length },
      { label: 'Rendering', value: ideas.filter((item) => ['rendering', 'preprocessing'].includes(item.shotstackStatus)).length },
      { label: 'Ready', value: readyCount },
      { label: 'Published', value: publishedCount },
    ],
  }
}

export async function fetchManualActions() {
  if (!isSupabaseConfigured || !supabase) {
    return mockManualActions
  }

  const { data, error } = await supabase
    .from('content_ideas')
    .select('id, topic, shotstack_url, tiktok_upload_url, tiktok_upload_status, publish_status')
    .in('publish_status', ['draft', 'uploading', 'published'])
    .order('id', { ascending: false })
    .limit(25)

  if (error) throw error

  return (data || []).map((row) => ({
    id: row.id,
    topic: row.topic || '',
    shotstackUrl: row.shotstack_url || '',
    uploadUrl: row.tiktok_upload_url || '',
    uploadStatus: row.tiktok_upload_status || 'pending',
    publishStatus: row.publish_status || 'draft',
  }))
}

function ensureSupabaseAvailable() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase n est pas configure dans le backoffice.')
  }
}

export async function markUploadDone(contentIdeaId) {
  ensureSupabaseAvailable()

  const { error } = await supabase
    .from('content_ideas')
    .update({
      tiktok_upload_status: 'uploaded',
      publish_status: 'uploading',
    })
    .eq('id', contentIdeaId)

  if (error) throw error
}

export async function markPublishComplete(contentIdeaId) {
  ensureSupabaseAvailable()

  const { error } = await supabase
    .from('content_ideas')
    .update({
      publish_status: 'published',
      tiktok_check_status: 'PUBLISH_COMPLETE',
      published_at: new Date().toISOString(),
    })
    .eq('id', contentIdeaId)

  if (error) throw error
}
