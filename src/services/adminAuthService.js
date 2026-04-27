import { clearAdminSession, setAdminSession } from './adminSessionStore.js'
import { clearAdminQueryCache } from './adminQueryCache.js'

const ADMIN_REMEMBER_ME_KEY = 'tiktok_app_admin_remember_me'
const MOCK_ADMIN_EMAIL = 'admin@tiktokapp.local'
const MOCK_ADMIN_PASSWORD = 'admin123'

function applyAdminAuthResponse(responseData) {
  return setAdminSession({
    token: responseData?.token ?? 'local-admin-token',
    expiresInSeconds: responseData?.expiresInSeconds ?? 60 * 60 * 12,
    role: responseData?.role || 'ADMIN',
    user: responseData?.admin ?? null,
  })
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

export async function refreshAdminSession() {
  clearAdminQueryCache()
  clearAdminSession()
  throw new Error('Aucune session admin persistante')
}

export async function logoutAdminSession() {
  clearAdminQueryCache()
  clearAdminSession()
}
