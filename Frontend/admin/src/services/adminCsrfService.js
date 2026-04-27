const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || '/api'
const DEFAULT_CSRF_HEADER = 'X-XSRF-TOKEN'
const CSRF_COOKIE_NAME = 'XSRF-TOKEN'

let csrfTokenCache = null
let csrfHeaderNameCache = DEFAULT_CSRF_HEADER
let csrfRequestPromise = null

function buildUrl(endpoint) {
  return `${API_BASE_URL}${endpoint}`
}

function readCookieValue(name) {
  if (typeof document === 'undefined' || typeof document.cookie !== 'string') {
    return null
  }

  const cookieEntry = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))

  if (!cookieEntry) return null

  const [, ...valueParts] = cookieEntry.split('=')
  const rawValue = valueParts.join('=')

  try {
    return decodeURIComponent(rawValue)
  } catch {
    return rawValue
  }
}

async function parseCsrfResponse(response) {
  const responseText = await response.text()
  if (!responseText) return null

  try {
    return JSON.parse(responseText)
  } catch {
    return null
  }
}

function resolveTokenFromResponse(responseData) {
  const cookieToken = readCookieValue(CSRF_COOKIE_NAME)
  return cookieToken || responseData?.token || null
}

export function clearAdminCsrfTokenCache() {
  csrfTokenCache = null
  csrfHeaderNameCache = DEFAULT_CSRF_HEADER
  csrfRequestPromise = null
}

export async function fetchAdminCsrfToken({ force = false } = {}) {
  if (!force && csrfTokenCache) {
    return {
      headerName: csrfHeaderNameCache,
      token: csrfTokenCache,
    }
  }

  if (!force && csrfRequestPromise) {
    return csrfRequestPromise
  }

  csrfRequestPromise = (async () => {
    const response = await fetch(buildUrl('/admins/csrf-token'), {
      method: 'GET',
      credentials: 'include',
    })

    if (!response.ok) {
      throw new Error('Impossible de recuperer la protection CSRF admin.')
    }

    const responseData = await parseCsrfResponse(response)
    const token = resolveTokenFromResponse(responseData)
    const headerName = responseData?.headerName || DEFAULT_CSRF_HEADER

    if (!token) {
      throw new Error('Impossible de recuperer la protection CSRF admin.')
    }

    csrfTokenCache = token
    csrfHeaderNameCache = headerName

    return {
      headerName,
      token,
    }
  })()

  try {
    return await csrfRequestPromise
  } finally {
    csrfRequestPromise = null
  }
}

export async function attachAdminCsrfHeader(headers) {
  const resolvedHeaders = headers instanceof Headers ? headers : new Headers(headers || {})

  const { headerName, token } = await fetchAdminCsrfToken()
  resolvedHeaders.set(headerName || DEFAULT_CSRF_HEADER, token)

  return resolvedHeaders
}
