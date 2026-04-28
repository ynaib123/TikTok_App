import {
  clearAdminSession,
  getAdminAccessToken,
  isAdminAccessTokenExpired,
} from './adminSessionStore.js'
import { refreshAdminSession } from './adminAuthService.js'
import { attachAdminCsrfHeader, clearAdminCsrfTokenCache } from './adminCsrfService.js'

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || '/api'
const ACCESS_TOKEN_EXPIRY_BUFFER_MS = 5000

export function buildAdminApiUrl(endpoint) {
  return `${API_BASE_URL}${endpoint}`
}

function shouldBypassRefresh(endpoint = '') {
  return endpoint.endsWith('/admins/login')
    || endpoint.endsWith('/admins/refresh')
    || endpoint.endsWith('/admins/logout')
}

function shouldAttachCsrfHeader(method = 'GET') {
  return !['GET', 'HEAD', 'OPTIONS'].includes(String(method || 'GET').toUpperCase())
}

async function createHeaders(options = {}, accessToken = null) {
  const headers = new Headers(options.headers || {})
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData

  if (!isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  if (accessToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${accessToken}`)
  }

  if (shouldAttachCsrfHeader(options.method)) {
    return attachAdminCsrfHeader(headers)
  }

  return headers
}

async function parseResponse(response) {
  if (response.status === 204) {
    return { ok: true, status: response.status, data: null }
  }

  const responseText = await response.text()
  let responseData = null

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

function createHttpError(parsed) {
  const message =
    parsed?.data?.message
    || parsed?.data?.error
    || parsed?.data?.details
    || `Erreur HTTP ${parsed?.status ?? 'inconnue'}`

  const error = new Error(message)
  error.status = parsed?.status ?? 500
  error.data = parsed?.data ?? null
  error.traceId = parsed?.traceId ?? null
  return error
}

async function performFetch(endpoint, options = {}, requestOptions = {}) {
  const {
    skipAuth = false,
    suppressConsoleError = false,
  } = requestOptions

  const accessToken = skipAuth ? null : getAdminAccessToken()
  const headers = await createHeaders(options, accessToken)
  const response = await fetch(buildAdminApiUrl(endpoint), {
    ...options,
    credentials: 'include',
    headers,
  })

  const parsed = await parseResponse(response)

  if (!parsed.ok && !suppressConsoleError) {
    console.error('Admin API Error:', createHttpError(parsed))
  }

  return parsed
}

export async function apiRequest(endpoint, options = {}, requestOptions = {}) {
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

    let parsed = await performFetch(endpoint, options, { skipAuth, suppressConsoleError })

    if (
      parsed.status === 401
      && retryOnUnauthorized
      && shouldTryRefresh
    ) {
      await refreshAdminSession()
      parsed = await performFetch(endpoint, options, { skipAuth, suppressConsoleError })
    }

    if (
      parsed.status === 403
      && retryOnForbiddenWithFreshCsrf
      && shouldRetryCsrf
    ) {
      clearAdminCsrfTokenCache()
      parsed = await performFetch(endpoint, options, { skipAuth, suppressConsoleError })
    }

    if (!parsed.ok) {
      if (parsed.status === 401) {
        clearAdminSession()
      }
      throw createHttpError(parsed)
    }

    return parsed.data
  } catch (error) {
    if (error instanceof TypeError && String(error.message || '').toLowerCase().includes('fetch')) {
      throw new Error(
        `Impossible de contacter le serveur admin. Verifiez que le backend tourne et que VITE_API_BASE_URL pointe vers ${API_BASE_URL}.`
      )
    }

    throw error
  }
}

export async function rawApiRequest(endpoint, options = {}, requestOptions = {}) {
  return apiRequest(endpoint, options, requestOptions)
}

export async function apiGet(endpoint, requestOptions = {}) {
  return apiRequest(endpoint, { method: 'GET' }, requestOptions)
}

export async function apiPost(endpoint, data, requestOptions = {}) {
  return apiRequest(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
  }, requestOptions)
}

export async function apiPut(endpoint, data, requestOptions = {}) {
  return apiRequest(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data),
  }, requestOptions)
}

export async function apiDelete(endpoint, requestOptions = {}) {
  return apiRequest(endpoint, { method: 'DELETE' }, requestOptions)
}

export async function createAuthenticatedAdminRequest(endpoint, options = {}, requestOptions = {}) {
  const {
    skipAuth = false,
    skipAuthRefresh = false,
  } = requestOptions

  const shouldTryRefresh = !skipAuth && !skipAuthRefresh && !shouldBypassRefresh(endpoint)
  if (shouldTryRefresh && isAdminAccessTokenExpired(ACCESS_TOKEN_EXPIRY_BUFFER_MS)) {
    await refreshAdminSession()
  }

  const accessToken = skipAuth ? null : getAdminAccessToken()
  const headers = await createHeaders(options, accessToken)

  return {
    url: buildAdminApiUrl(endpoint),
    options: {
      ...options,
      credentials: 'include',
      headers,
    },
  }
}
