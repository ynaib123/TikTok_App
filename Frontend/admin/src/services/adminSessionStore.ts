export interface AdminSessionUser {
  email?: string
  nom?: string
  [key: string]: unknown
}

export interface AdminSessionState {
  token: string | null
  expiresAt: number | null
  role: string | null
  user: AdminSessionUser | null
}

export interface SetAdminSessionInput {
  expiresAt?: number | string | null
  expiresInSeconds?: number | string | null
  role?: string | null
  token?: string | null
  user?: AdminSessionUser | null
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
type StorageListener = (session: AdminSessionState) => void

const listeners = new Set<StorageListener>()

const ADMIN_SESSION_STORAGE_KEY = 'tiktok_app_admin_session'
const ADMIN_REMEMBER_ME_KEY = 'tiktok_app_admin_remember_me'

function emptySession(): AdminSessionState {
  return { token: null, expiresAt: null, role: null, user: null }
}

let sessionState: AdminSessionState = readStoredSession()

function getStorageArea(name: 'localStorage' | 'sessionStorage'): StorageLike | null {
  if (typeof window === 'undefined') return null
  const candidate = (window as unknown as Record<string, StorageLike | undefined>)[name]
  if (!candidate) return null
  const hasStorageApi = typeof candidate.getItem === 'function'
    && typeof candidate.setItem === 'function'
    && typeof candidate.removeItem === 'function'
  return hasStorageApi ? candidate : null
}

function resolveStorage(): StorageLike | null {
  const localStorageArea = getStorageArea('localStorage')
  const sessionStorageArea = getStorageArea('sessionStorage')
  if (!localStorageArea && !sessionStorageArea) return null

  const rememberMe = localStorageArea?.getItem(ADMIN_REMEMBER_ME_KEY)
  if (rememberMe === 'false') {
    return sessionStorageArea || localStorageArea
  }
  return localStorageArea || sessionStorageArea
}

function readStoredSession(): AdminSessionState {
  const localStorageArea = getStorageArea('localStorage')
  const sessionStorageArea = getStorageArea('sessionStorage')
  if (!localStorageArea && !sessionStorageArea) {
    return emptySession()
  }

  const fromLocal = localStorageArea?.getItem(ADMIN_SESSION_STORAGE_KEY)
  const fromSession = sessionStorageArea?.getItem(ADMIN_SESSION_STORAGE_KEY)
  const raw = fromLocal || fromSession

  if (!raw) {
    return emptySession()
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AdminSessionState>
    return {
      token: parsed?.token || null,
      expiresAt: parsed?.expiresAt ?? null,
      role: parsed?.role || null,
      user: parsed?.user || null,
    }
  } catch {
    return emptySession()
  }
}

function persistSession(): void {
  const localStorageArea = getStorageArea('localStorage')
  const sessionStorageArea = getStorageArea('sessionStorage')
  if (!localStorageArea && !sessionStorageArea) return

  localStorageArea?.removeItem(ADMIN_SESSION_STORAGE_KEY)
  sessionStorageArea?.removeItem(ADMIN_SESSION_STORAGE_KEY)

  if (!sessionState.token) return

  const storage = resolveStorage()
  if (!storage) return

  storage.setItem(ADMIN_SESSION_STORAGE_KEY, JSON.stringify(sessionState))
}

function emitChange(): void {
  listeners.forEach((listener) => {
    try {
      listener(getAdminSession())
    } catch {
      // Listener failures must never break auth state propagation.
    }
  })
}

export function getAdminSession(): AdminSessionState {
  return { ...sessionState }
}

export function getAdminAccessToken(): string | null {
  return sessionState.token
}

export function setAdminSession({
  expiresAt = null,
  expiresInSeconds = null,
  role = null,
  token = null,
  user = null,
}: SetAdminSessionInput = {}): AdminSessionState {
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

export function clearAdminSession(): void {
  sessionState = emptySession()
  persistSession()
  emitChange()
}

export function isAdminAccessTokenExpired(bufferMs: number = 0): boolean {
  if (!sessionState.token || !sessionState.expiresAt) {
    return true
  }

  return Number(sessionState.expiresAt) <= (Date.now() + Number(bufferMs || 0))
}

export function subscribeAdminSession(listener: StorageListener): () => void {
  if (typeof listener !== 'function') {
    return () => {}
  }

  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
