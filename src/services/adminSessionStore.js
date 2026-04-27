const listeners = new Set()

let sessionState = {
  token: null,
  expiresAt: null,
  role: null,
  user: null,
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
