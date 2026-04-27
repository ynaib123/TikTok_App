const listeners = new Set()

const ADMIN_SESSION_STORAGE_KEY = 'tiktok_app_admin_session'
const ADMIN_REMEMBER_ME_KEY = 'tiktok_app_admin_remember_me'

let sessionState = readStoredSession()

function resolveStorage() {
  if (typeof window === 'undefined') return null
  const rememberMe = window.localStorage.getItem(ADMIN_REMEMBER_ME_KEY)
  if (rememberMe === 'false') {
    return window.sessionStorage
  }
  return window.localStorage
}

function readStoredSession() {
  if (typeof window === 'undefined') {
    return {
      token: null,
      expiresAt: null,
      role: null,
      user: null,
    }
  }

  const fromLocal = window.localStorage.getItem(ADMIN_SESSION_STORAGE_KEY)
  const fromSession = window.sessionStorage.getItem(ADMIN_SESSION_STORAGE_KEY)
  const raw = fromLocal || fromSession

  if (!raw) {
    return {
      token: null,
      expiresAt: null,
      role: null,
      user: null,
    }
  }

  try {
    const parsed = JSON.parse(raw)
    return {
      token: parsed?.token || null,
      expiresAt: parsed?.expiresAt || null,
      role: parsed?.role || null,
      user: parsed?.user || null,
    }
  } catch {
    return {
      token: null,
      expiresAt: null,
      role: null,
      user: null,
    }
  }
}

function persistSession() {
  if (typeof window === 'undefined') return

  window.localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY)
  window.sessionStorage.removeItem(ADMIN_SESSION_STORAGE_KEY)

  if (!sessionState.token) return

  const storage = resolveStorage()
  if (!storage) return

  storage.setItem(ADMIN_SESSION_STORAGE_KEY, JSON.stringify(sessionState))
}

function emitChange() {
  listeners.forEach((listener) => {
    try {
      listener(getAdminSession())
    } catch {
      // Listener failures must never break auth state propagation.
    }
  })
}

export function getAdminSession() {
  return { ...sessionState }
}

export function getAdminAccessToken() {
  return sessionState.token
}

export function setAdminSession({
  expiresAt = null,
  expiresInSeconds = null,
  role = null,
  token = null,
  user = null,
} = {}) {
  const hasAbsoluteExpiry = expiresAt !== null && expiresAt !== undefined && expiresAt !== ''
  const hasRelativeExpiry = expiresInSeconds !== null && expiresInSeconds !== undefined && expiresInSeconds !== ''
  const numericExpiresAt = hasAbsoluteExpiry ? Number(expiresAt) : Number.NaN
  const numericTtl = hasRelativeExpiry ? Number(expiresInSeconds) : Number.NaN

  sessionState = {
    token: token || null,
    expiresAt: Number.isFinite(numericExpiresAt)
      ? numericExpiresAt
      : (Number.isFinite(numericTtl) ? Date.now() + (numericTtl * 1000) : null),
    role: role || null,
    user: user || null,
  }

  persistSession()
  emitChange()
  return getAdminSession()
}

export function clearAdminSession() {
  sessionState = {
    token: null,
    expiresAt: null,
    role: null,
    user: null,
  }
  persistSession()
  emitChange()
}

export function isAdminAccessTokenExpired(bufferMs = 0) {
  if (!sessionState.token || !sessionState.expiresAt) {
    return true
  }

  return Number(sessionState.expiresAt) <= (Date.now() + Number(bufferMs || 0))
}

export function subscribeAdminSession(listener) {
  if (typeof listener !== 'function') {
    return () => {}
  }

  listeners.add(listener)
  return () => listeners.delete(listener)
}
