import { clearAdminSession, setAdminSession } from './adminSessionStore.js'
import { clearAdminQueryCache } from './adminQueryCache.js'
import { clearAdminCsrfTokenCache, fetchAdminCsrfToken } from './adminCsrfService.js'

const ADMIN_REMEMBER_ME_KEY = 'tiktok_app_admin_remember_me'
const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || '/api'
const USE_MOCK_ADMIN_AUTH = import.meta.env?.VITE_USE_MOCK_ADMIN_AUTH !== 'false'
const MOCK_ADMIN_EMAIL = 'admin@tiktokapp.local'
const MOCK_ADMIN_PASSWORD = 'admin123'

function buildUrl(endpoint) {
  return `${API_BASE_URL}${endpoint}`
}

function applyAdminAuthResponse(responseData) {
  return setAdminSession({
    token: responseData?.token ?? 'local-admin-token',
    expiresInSeconds: responseData?.expiresInSeconds ?? 60 * 60 * 12,
    role: responseData?.role || 'ADMIN',
    user: responseData?.admin ?? null,
  })
}

function parseJsonSafely(text) {
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return { message: text }
  }
}

async function requestWithOptionalCsrf(endpoint, { method = 'GET', body = null, includeCsrf = false } = {}) {
  const headers = new Headers()
  if (body !== null) {
    headers.set('Content-Type', 'application/json')
  }

  if (includeCsrf) {
    const { headerName, token } = await fetchAdminCsrfToken()
    headers.set(headerName, token)
  }

  const response = await fetch(buildUrl(endpoint), {
    method,
    headers,
    credentials: 'include',
    body: body === null ? undefined : JSON.stringify(body),
  })

  const responseText = await response.text()
  const responseData = parseJsonSafely(responseText)

  if (!response.ok) {
    const error = new Error(
      responseData?.message
      || responseData?.error
      || `Erreur HTTP ${response.status}`,
    )
    error.status = response.status
    error.data = responseData
    throw error
  }

  return responseData
}

async function loginAdminWithMock(email, motDePasse, rememberMe = true) {
  const normalizedEmail = String(email || '').trim().toLowerCase()
  const normalizedPassword = String(motDePasse || '')

  if (normalizedEmail !== MOCK_ADMIN_EMAIL || normalizedPassword !== MOCK_ADMIN_PASSWORD) {
    throw new Error('Identifiants invalides. Utilisez admin@tiktokapp.local / admin123')
  }

  const responseData = {
    token: 'local-admin-token',
    expiresInSeconds: 60 * 60 * 12,
    role: 'ADMIN',
    admin: {
      nom: 'Video Ops Admin',
      email: MOCK_ADMIN_EMAIL,
    },
  }

  setAdminRememberPreference(rememberMe)
  clearAdminQueryCache()
  return applyAdminAuthResponse(responseData)
}

export function getAdminRememberPreference() {
  if (typeof window === 'undefined') return true
  const storedValue = window.localStorage.getItem(ADMIN_REMEMBER_ME_KEY)
  if (storedValue === 'false') return false
  if (storedValue === 'true') return true
  return true
}

export function setAdminRememberPreference(rememberMe) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(ADMIN_REMEMBER_ME_KEY, rememberMe ? 'true' : 'false')
}

export async function loginAdmin(email, motDePasse, rememberMe = true) {
  if (USE_MOCK_ADMIN_AUTH) {
    return loginAdminWithMock(email, motDePasse, rememberMe)
  }

  setAdminRememberPreference(rememberMe)
  clearAdminQueryCache()
  clearAdminCsrfTokenCache()

  const responseData = await requestWithOptionalCsrf('/admins/login', {
    method: 'POST',
    body: { email, motDePasse, rememberMe },
    includeCsrf: true,
  })

  return applyAdminAuthResponse(responseData)
}

export async function refreshAdminSession() {
  if (USE_MOCK_ADMIN_AUTH) {
    clearAdminQueryCache()
    clearAdminSession()
    throw new Error('Aucune session admin persistante')
  }

  try {
    clearAdminCsrfTokenCache()
    const responseData = await requestWithOptionalCsrf('/admins/refresh', {
      method: 'POST',
      body: {},
      includeCsrf: true,
    })
    clearAdminQueryCache()
    return applyAdminAuthResponse(responseData)
  } catch (error) {
    clearAdminQueryCache()
    clearAdminSession()
    throw error
  }
}

export async function logoutAdminSession() {
  clearAdminQueryCache()

  if (USE_MOCK_ADMIN_AUTH) {
    clearAdminSession()
    return
  }

  try {
    clearAdminCsrfTokenCache()
    await requestWithOptionalCsrf('/admins/logout', {
      method: 'POST',
      body: {},
      includeCsrf: true,
    })
  } finally {
    clearAdminCsrfTokenCache()
    clearAdminSession()
  }
}
