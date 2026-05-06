const API_BASE_URL = (import.meta.env?.VITE_API_BASE_URL as string | undefined) || '/api'
const DEFAULT_CSRF_HEADER = 'X-XSRF-TOKEN'
const CSRF_COOKIE_NAME = 'XSRF-TOKEN'
const USE_ADMIN_CSRF = (import.meta.env?.VITE_USE_ADMIN_CSRF as string | undefined) !== 'false'

export interface AdminCsrfToken {
  headerName: string
  token: string
}

let csrfTokenCache: string | null = null
let csrfHeaderNameCache: string = DEFAULT_CSRF_HEADER
let csrfRequestPromise: Promise<AdminCsrfToken> | null = null

function buildUrl(endpoint: string): string {
  return `${API_BASE_URL}${endpoint}`
}

function readCookieValue(name: string): string | null {
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

async function parseCsrfResponse(response: Response): Promise<{ token?: string; headerName?: string } | null> {
  const responseText = await response.text()
  if (!responseText) return null

  try {
    return JSON.parse(responseText)
  } catch {
    return null
  }
}

function resolveTokenFromResponse(
  responseData: { token?: string } | null,
  existingCookieToken: string | null = null,
): string | null {
  const cookieToken = readCookieValue(CSRF_COOKIE_NAME)
  return responseData?.token || cookieToken || existingCookieToken || null
}

export function clearAdminCsrfTokenCache(): void {
  csrfTokenCache = null
  csrfHeaderNameCache = DEFAULT_CSRF_HEADER
  csrfRequestPromise = null
}

export async function fetchAdminCsrfToken({ force = false }: { force?: boolean } = {}): Promise<AdminCsrfToken> {
  if (!USE_ADMIN_CSRF) {
    return {
      headerName: DEFAULT_CSRF_HEADER,
      token: '',
    }
  }

  if (!force && csrfTokenCache) {
    return {
      headerName: csrfHeaderNameCache,
      token: csrfTokenCache,
    }
  }

  if (!force && csrfRequestPromise) {
    return csrfRequestPromise
  }

  csrfRequestPromise = (async (): Promise<AdminCsrfToken> => {
    try {
      const existingCookieToken = readCookieValue(CSRF_COOKIE_NAME)
      const response = await fetch(buildUrl('/admins/csrf-token'), {
        method: 'GET',
        credentials: 'include',
      })

      if (!response.ok) {
        return {
          headerName: DEFAULT_CSRF_HEADER,
          token: '',
        }
      }

      const responseData = await parseCsrfResponse(response)
      const token = resolveTokenFromResponse(responseData, existingCookieToken)
      const headerName = responseData?.headerName || DEFAULT_CSRF_HEADER

      if (!token) {
        return {
          headerName: DEFAULT_CSRF_HEADER,
          token: '',
        }
      }

      csrfTokenCache = token
      csrfHeaderNameCache = headerName

      return {
        headerName,
        token,
      }
    } catch {
      return {
        headerName: DEFAULT_CSRF_HEADER,
        token: '',
      }
    }
  })()

  try {
    return await csrfRequestPromise
  } finally {
    csrfRequestPromise = null
  }
}

export async function attachAdminCsrfHeader(headers?: HeadersInit | Headers): Promise<Headers> {
  const resolvedHeaders = headers instanceof Headers ? headers : new Headers(headers || {})

  const { headerName, token } = await fetchAdminCsrfToken()
  if (token) {
    resolvedHeaders.set(headerName || DEFAULT_CSRF_HEADER, token)
  }

  return resolvedHeaders
}
