import {
  clearAdminSession,
  setAdminSession,
  type AdminSessionState,
  type AdminSessionUser,
} from './adminSessionStore'
import { clearAdminQueryCache } from './adminQueryCache'
import { clearAdminCsrfTokenCache, fetchAdminCsrfToken } from './adminCsrfService'

const ADMIN_REMEMBER_ME_KEY = 'tiktok_app_admin_remember_me'
const API_BASE_URL = (import.meta.env?.VITE_API_BASE_URL as string | undefined) || '/api'
const USE_MOCK_ADMIN_AUTH =
  (import.meta.env?.VITE_USE_MOCK_ADMIN_AUTH as string | undefined) === 'true'
const MOCK_ADMIN_EMAIL = (import.meta.env?.VITE_MOCK_ADMIN_EMAIL as string | undefined) || ''
const MOCK_ADMIN_PASSWORD = (import.meta.env?.VITE_MOCK_ADMIN_PASSWORD as string | undefined) || ''

interface AdminAuthResponse {
  token?: string
  expiresInSeconds?: number
  role?: string
  admin?: AdminSessionUser | null
}

interface AdminHttpError extends Error {
  status?: number
  data?: unknown
}

let refreshAdminSessionPromise: Promise<AdminSessionState> | null = null

function buildUrl(endpoint: string): string {
  return `${API_BASE_URL}${endpoint}`
}

function applyAdminAuthResponse(
  responseData: AdminAuthResponse | null | undefined,
): AdminSessionState {
  return setAdminSession({
    token: responseData?.token ?? 'local-admin-token',
    expiresInSeconds: responseData?.expiresInSeconds ?? 60 * 60 * 12,
    role: responseData?.role || 'ADMIN',
    user: responseData?.admin ?? null,
  })
}

function parseJsonSafely(text: string | null | undefined): unknown {
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return { message: text }
  }
}

interface RequestOptions {
  method?: string
  body?: unknown
  includeCsrf?: boolean
  retryOnForbiddenWithFreshCsrf?: boolean
}

async function requestWithOptionalCsrf(
  endpoint: string,
  {
    method = 'GET',
    body = null,
    includeCsrf = false,
    retryOnForbiddenWithFreshCsrf = false,
  }: RequestOptions = {},
): Promise<unknown> {
  const sendRequest = async ({
    forceCsrfRefresh = false,
  }: { forceCsrfRefresh?: boolean } = {}): Promise<unknown> => {
    const headers = new Headers()
    if (body !== null) {
      headers.set('Content-Type', 'application/json')
    }

    if (includeCsrf) {
      const { headerName, token } = await fetchAdminCsrfToken({ force: forceCsrfRefresh })
      headers.set(headerName, token)
    }

    const response = await fetch(buildUrl(endpoint), {
      method,
      headers,
      credentials: 'include',
      body: body === null ? undefined : JSON.stringify(body),
    })

    const responseText = await response.text()
    const responseData = parseJsonSafely(responseText) as {
      message?: string
      error?: string
    } | null

    if (!response.ok) {
      const error = new Error(
        responseData?.message || responseData?.error || `Erreur HTTP ${response.status}`,
      ) as AdminHttpError
      error.status = response.status
      error.data = responseData
      throw error
    }

    return responseData
  }

  try {
    return await sendRequest()
  } catch (error) {
    const httpError = error as AdminHttpError
    if (retryOnForbiddenWithFreshCsrf && includeCsrf && httpError?.status === 403) {
      clearAdminCsrfTokenCache()
      return sendRequest({ forceCsrfRefresh: true })
    }

    throw error
  }
}

async function loginAdminWithMock(
  email: string,
  motDePasse: string,
  rememberMe: boolean = true,
): Promise<AdminSessionState> {
  if (!MOCK_ADMIN_EMAIL || !MOCK_ADMIN_PASSWORD) {
    throw new Error(
      'Mock admin auth active, mais VITE_MOCK_ADMIN_EMAIL / VITE_MOCK_ADMIN_PASSWORD ne sont pas configures.',
    )
  }

  const normalizedEmail = String(email || '')
    .trim()
    .toLowerCase()
  const normalizedPassword = String(motDePasse || '')

  if (normalizedEmail !== MOCK_ADMIN_EMAIL || normalizedPassword !== MOCK_ADMIN_PASSWORD) {
    throw new Error('Identifiants invalides pour le mode demo local.')
  }

  const responseData: AdminAuthResponse = {
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

export function getAdminRememberPreference(): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return true
  const storedValue = window.localStorage.getItem(ADMIN_REMEMBER_ME_KEY)
  if (storedValue === 'false') return false
  if (storedValue === 'true') return true
  return true
}

export function setAdminRememberPreference(rememberMe: boolean): void {
  if (typeof window === 'undefined' || !window.localStorage) return
  window.localStorage.setItem(ADMIN_REMEMBER_ME_KEY, rememberMe ? 'true' : 'false')
}

export async function loginAdmin(
  email: string,
  motDePasse: string,
  rememberMe: boolean = true,
): Promise<AdminSessionState> {
  if (USE_MOCK_ADMIN_AUTH) {
    return loginAdminWithMock(email, motDePasse, rememberMe)
  }

  setAdminRememberPreference(rememberMe)
  clearAdminQueryCache()
  clearAdminCsrfTokenCache()

  const responseData = (await requestWithOptionalCsrf('/admins/login', {
    method: 'POST',
    body: { email, motDePasse, rememberMe },
    includeCsrf: true,
    retryOnForbiddenWithFreshCsrf: true,
  })) as AdminAuthResponse | null

  return applyAdminAuthResponse(responseData)
}

export async function refreshAdminSession(): Promise<AdminSessionState> {
  if (USE_MOCK_ADMIN_AUTH) {
    clearAdminQueryCache()
    clearAdminSession()
    throw new Error('Aucune session admin persistante')
  }

  if (!refreshAdminSessionPromise) {
    refreshAdminSessionPromise = (async (): Promise<AdminSessionState> => {
      try {
        clearAdminCsrfTokenCache()
        const responseData = (await requestWithOptionalCsrf('/admins/refresh', {
          method: 'POST',
          body: {},
          includeCsrf: true,
        })) as AdminAuthResponse | null
        clearAdminQueryCache()
        return applyAdminAuthResponse(responseData)
      } catch (error) {
        clearAdminQueryCache()
        const httpError = error as AdminHttpError
        const status = Number(httpError?.status)
        if (status === 401 || status === 403) {
          // Session définitivement invalide (token expiré côté serveur) → déconnexion propre
          clearAdminSession()
          throw new Error('Aucune session admin persistante')
        }
        // Erreur réseau ou serveur transitoire (5xx, ECONNREFUSED…) : la session
        // est potentiellement encore valide. On ne déconnecte pas l'utilisateur.
        // Le prochain appel retentera le refresh.
        throw error
      } finally {
        refreshAdminSessionPromise = null
      }
    })()
  }

  return refreshAdminSessionPromise
}

export async function logoutAdminSession(): Promise<void> {
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
      retryOnForbiddenWithFreshCsrf: true,
    })
  } finally {
    clearAdminCsrfTokenCache()
    clearAdminSession()
  }
}
