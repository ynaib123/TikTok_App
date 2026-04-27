import { apiGet } from '../../services/adminApiClient.js'
import { normalizeSessionActivityEntry } from './utils.js'

const SESSION_ACTIVITY_UPDATED_EVENT = 'admin-session-activity-updated'

function notifySessionActivityRefresh() {
  if (typeof window === 'undefined') return

  window.dispatchEvent(new CustomEvent(SESSION_ACTIVITY_UPDATED_EVENT))
}

function normalizeActivityFeed(entries = []) {
  return (Array.isArray(entries) ? entries : [])
    .map(normalizeSessionActivityEntry)
    .filter(Boolean)
    .sort((left, right) => {
      const leftTime = Date.parse(left?.timestamp || '')
      const rightTime = Date.parse(right?.timestamp || '')
      return (Number.isFinite(rightTime) ? rightTime : 0) - (Number.isFinite(leftTime) ? leftTime : 0)
    })
}

export function getAdminSessionActivityId() {
  return null
}

export function readStoredSessionActivity() {
  return []
}

export function appendStoredSessionActivity() {
  notifySessionActivityRefresh()
  return []
}

export async function fetchStoredSessionActivity() {
  try {
    const response = await apiGet('/admins/activity', {
      suppressConsoleError: true,
    })

    return normalizeActivityFeed(response)
  } catch {
    return []
  }
}

export function subscribeToStoredSessionActivity(listener) {
  if (typeof window === 'undefined' || typeof listener !== 'function') {
    return () => {}
  }

  const handleUpdate = (event) => {
    listener(event?.detail?.entries || [])
  }

  window.addEventListener(SESSION_ACTIVITY_UPDATED_EVENT, handleUpdate)
  return () => window.removeEventListener(SESSION_ACTIVITY_UPDATED_EVENT, handleUpdate)
}
