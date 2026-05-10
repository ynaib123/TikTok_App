import { clearAdminSession, isAdminAccessTokenExpired } from './adminSessionStore'
import { refreshAdminSession } from './adminAuthService'
import { attachAdminCsrfHeader, clearAdminCsrfTokenCache } from './adminCsrfService'
import { beginAdminPerf, endAdminPerf } from './adminPerformance'

const API_BASE_URL = (import.meta.env?.VITE_API_BASE_URL as string | undefined) || '/api'
const ACCESS_TOKEN_EXPIRY_BUFFER_MS = 5000

export interface AdminApiError extends Error {
  status?: number
  data?: unknown
  traceId?: string | null
}

interface ParsedResponse {
  ok: boolean
  status: number
  traceId?: string | null
  data: unknown
}

export interface AdminRequestOptions {
  skipAuth?: boolean
  skipAuthRefresh?: boolean
  retryOnUnauthorized?: boolean
  retryOnForbiddenWithFreshCsrf?: boolean
  suppressConsoleError?: boolean
}

interface PerformFetchOptions {
  skipAuth?: boolean
  suppressConsoleError?: boolean
}

export function buildAdminApiUrl(endpoint: string): string {
  return `${API_BASE_URL}${endpoint}`
}

function shouldBypassRefresh(endpoint: string = ''): boolean {
  return (
    endpoint.endsWith('/admins/login') ||
    endpoint.endsWith('/admins/refresh') ||
    endpoint.endsWith('/admins/logout')
  )
}

function shouldAttachCsrfHeader(method: string = 'GET'): boolean {
  return !['GET', 'HEAD', 'OPTIONS'].includes(String(method || 'GET').toUpperCase())
}

// Sprint securite : l'access token est desormais transmis via cookie HttpOnly
// (envoi automatique via credentials: 'include'). Plus aucun storage cote JS,
// donc plus de surface XSS pour vol de token.

let _sessionTraceId: string | null = null

/** Retourne ou génère le trace ID de session (16 hex chars). */
export function getSessionTraceId(): string {
  if (!_sessionTraceId) {
    _sessionTraceId = Array.from(crypto.getRandomValues(new Uint8Array(8)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  }
  return _sessionTraceId
}

async function createHeaders(options: RequestInit = {}): Promise<Headers> {
  const headers = new Headers(options.headers || {})
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData

  if (!isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  // Propagation du trace ID de session vers le backend pour corrélation end-to-end
  if (!headers.has('X-Trace-Id')) {
    headers.set('X-Trace-Id', getSessionTraceId())
  }

  if (shouldAttachCsrfHeader(options.method)) {
    return attachAdminCsrfHeader(headers)
  }

  return headers
}

async function parseResponse(response: Response): Promise<ParsedResponse> {
  if (response.status === 204) {
    return { ok: true, status: response.status, data: null }
  }

  const responseText = await response.text()
  let responseData: unknown = null

  if (responseText) {
    try {
      responseData = JSON.parse(responseText)
    } catch {
      responseData = { message: responseText }
    }
  }

  return {
    ok: response.ok,
    status: response.status,
    traceId: response.headers.get('X-Trace-Id'),
    data: responseData,
  }
}

function createHttpError(parsed: ParsedResponse): AdminApiError {
  const data = parsed?.data as { message?: string; error?: string; details?: string } | null
  const message =
    data?.message || data?.error || data?.details || `Erreur HTTP ${parsed?.status ?? 'inconnue'}`

  const error = new Error(message) as AdminApiError
  error.status = parsed?.status ?? 500
  error.data = parsed?.data ?? null
  error.traceId = parsed?.traceId ?? null
  return error
}

async function performFetch(
  endpoint: string,
  options: RequestInit = {},
  requestOptions: PerformFetchOptions = {},
): Promise<ParsedResponse> {
  const { suppressConsoleError = false } = requestOptions

  const headers = await createHeaders(options)
  const perfToken = beginAdminPerf('admin-api-request', {
    endpoint,
    method: String(options.method || 'GET').toUpperCase(),
  })
  const response = await fetch(buildAdminApiUrl(endpoint), {
    ...options,
    credentials: 'include',
    headers,
  })

  const parsed = await parseResponse(response)
  endAdminPerf(perfToken, {
    endpoint,
    method: String(options.method || 'GET').toUpperCase(),
    status: parsed.status,
    traceId: parsed.traceId,
    serverTiming: response.headers.get('Server-Timing'),
  })

  if (!parsed.ok && !suppressConsoleError) {
    if (parsed.status === 503 || parsed.status === 502) {
      console.warn('Admin API transient unavailability:', parsed.status, endpoint)
    } else {
      console.error('Admin API Error:', createHttpError(parsed))
    }
  }

  return parsed
}

export async function apiRequest<T = unknown>(
  endpoint: string,
  options: RequestInit = {},
  requestOptions: AdminRequestOptions = {},
): Promise<T> {
  const {
    skipAuth = false,
    skipAuthRefresh = false,
    retryOnUnauthorized = true,
    retryOnForbiddenWithFreshCsrf = true,
    suppressConsoleError = false,
  } = requestOptions

  const shouldTryRefresh = !skipAuth && !skipAuthRefresh && !shouldBypassRefresh(endpoint)
  const shouldRetryCsrf = shouldAttachCsrfHeader(options.method)

  try {
    if (shouldTryRefresh && isAdminAccessTokenExpired(ACCESS_TOKEN_EXPIRY_BUFFER_MS)) {
      await refreshAdminSession()
    }

    const willRetryAuth = retryOnUnauthorized && shouldTryRefresh
    const willRetryCsrf = retryOnForbiddenWithFreshCsrf && shouldRetryCsrf
    let parsed = await performFetch(endpoint, options, {
      skipAuth,
      suppressConsoleError: suppressConsoleError || willRetryAuth || willRetryCsrf,
    })

    if (parsed.status === 401 && retryOnUnauthorized && shouldTryRefresh) {
      // Vider aussi le cache CSRF : un 401 peut être causé par une désynchronisation
      // du cookie XSRF-TOKEN (cookie effacé après fermeture navigateur). Le retry
      // avec CSRF frais résoudra ce cas sans déclencher de déconnexion.
      if (shouldRetryCsrf) {
        clearAdminCsrfTokenCache()
      }
      await refreshAdminSession()
      parsed = await performFetch(endpoint, options, {
        skipAuth,
        suppressConsoleError: suppressConsoleError || willRetryCsrf,
      })
    }

    if (parsed.status === 403 && retryOnForbiddenWithFreshCsrf && shouldRetryCsrf) {
      clearAdminCsrfTokenCache()
      parsed = await performFetch(endpoint, options, { skipAuth, suppressConsoleError })
    }

    if (!parsed.ok) {
      if (parsed.status === 401) {
        clearAdminSession()
      }
      throw createHttpError(parsed)
    }

    if (shouldRetryCsrf) {
      clearAdminCsrfTokenCache()
    }

    return parsed.data as T
  } catch (error) {
    if (
      error instanceof TypeError &&
      String(error.message || '')
        .toLowerCase()
        .includes('fetch')
    ) {
      throw new Error(
        `Impossible de contacter le serveur admin. Verifiez que le backend tourne et que VITE_API_BASE_URL pointe vers ${API_BASE_URL}.`,
      )
    }

    throw error
  }
}

export async function rawApiRequest<T = unknown>(
  endpoint: string,
  options: RequestInit = {},
  requestOptions: AdminRequestOptions = {},
): Promise<T> {
  return apiRequest<T>(endpoint, options, requestOptions)
}

export async function apiGet<T = unknown>(
  endpoint: string,
  requestOptions: AdminRequestOptions = {},
): Promise<T> {
  return apiRequest<T>(endpoint, { method: 'GET' }, requestOptions)
}

export async function apiPost<T = unknown>(
  endpoint: string,
  data: unknown,
  requestOptions: AdminRequestOptions = {},
): Promise<T> {
  return apiRequest<T>(
    endpoint,
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
    requestOptions,
  )
}

export async function apiPut<T = unknown>(
  endpoint: string,
  data: unknown,
  requestOptions: AdminRequestOptions = {},
): Promise<T> {
  return apiRequest<T>(
    endpoint,
    {
      method: 'PUT',
      body: JSON.stringify(data),
    },
    requestOptions,
  )
}

export async function apiPatch<T = unknown>(
  endpoint: string,
  data: unknown,
  requestOptions: AdminRequestOptions = {},
): Promise<T> {
  return apiRequest<T>(
    endpoint,
    {
      method: 'PATCH',
      body: JSON.stringify(data),
    },
    requestOptions,
  )
}

export async function apiDelete<T = unknown>(
  endpoint: string,
  requestOptions: AdminRequestOptions = {},
): Promise<T> {
  return apiRequest<T>(endpoint, { method: 'DELETE' }, requestOptions)
}

export interface AuthenticatedAdminRequest {
  url: string
  options: RequestInit
}

export async function createAuthenticatedAdminRequest(
  endpoint: string,
  options: RequestInit = {},
  requestOptions: AdminRequestOptions = {},
): Promise<AuthenticatedAdminRequest> {
  const { skipAuth = false, skipAuthRefresh = false } = requestOptions

  const shouldTryRefresh = !skipAuth && !skipAuthRefresh && !shouldBypassRefresh(endpoint)
  if (shouldTryRefresh && isAdminAccessTokenExpired(ACCESS_TOKEN_EXPIRY_BUFFER_MS)) {
    await refreshAdminSession()
  }

  const headers = await createHeaders(options)

  return {
    url: buildAdminApiUrl(endpoint),
    options: {
      ...options,
      credentials: 'include',
      headers,
    },
  }
}
