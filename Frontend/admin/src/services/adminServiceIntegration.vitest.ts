import { afterEach, expect, test } from 'vitest'
import {
  apiGet,
} from './adminApiClient'
import {
  getAdminRememberPreference,
  loginAdmin,
  logoutAdminSession,
  refreshAdminSession,
} from './adminAuthService'
import {
  clearAdminSession,
  getAdminAccessToken,
  getAdminSession,
  setAdminSession,
} from './adminSessionStore'
import { clearAdminQueryCache, setAdminQueryData, getAdminQueryData } from './adminQueryCache'
import { clearAdminCsrfTokenCache } from './adminCsrfService'

const originalFetch = globalThis.fetch
const originalWindow = (globalThis as unknown as { window?: unknown }).window

interface MockResponseInput {
  ok?: boolean
  status?: number
  data?: unknown
  headers?: Record<string, string>
}

function createMockResponse({ ok = true, status = 200, data = null, headers = {} }: MockResponseInput = {}): unknown {
  return {
    ok,
    status,
    headers: {
      get(name: string): string | null {
        return headers[name] ?? headers[String(name).toLowerCase()] ?? null
      },
    },
    async text(): Promise<string> {
      if (data === null || data === undefined) return ''
      return typeof data === 'string' ? data : JSON.stringify(data)
    },
  }
}

function createLocalStorage(): Storage {
  const store = new Map<string, string>()
  return {
    get length() { return store.size },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key) ?? null : null
    },
    setItem(key: string, value: string) {
      store.set(key, String(value))
    },
    removeItem(key: string) {
      store.delete(key)
    },
    clear() {
      store.clear()
    },
  }
}

function installWindow(): { localStorage: Storage } {
  const win = { localStorage: createLocalStorage() }
  ;(globalThis as unknown as { window: typeof win }).window = win
  return win
}

function installDocument(cookie: string = 'XSRF-TOKEN=test-csrf-token'): void {
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: { cookie },
  })
}

type FetchHandler = unknown | ((url: string, options: RequestInit) => Promise<unknown>)

function queueFetchResponses(...responses: FetchHandler[]): Array<{ url: string; options: RequestInit }> {
  const calls: Array<{ url: string; options: RequestInit }> = []
  ;(globalThis as unknown as { fetch: typeof fetch }).fetch = (async (url: string, options: RequestInit = {}) => {
    calls.push({ url, options })
    const next = responses.shift()
    if (typeof next === 'function') {
      return (next as (u: string, o: RequestInit) => Promise<unknown>)(url, options)
    }
    return next
  }) as unknown as typeof fetch
  return calls
}

afterEach(() => {
  clearAdminSession()
  clearAdminQueryCache()
  clearAdminCsrfTokenCache()
  ;(globalThis as unknown as { fetch: typeof fetch }).fetch = originalFetch
  ;(globalThis as unknown as { window?: unknown }).window = originalWindow
  delete (globalThis as unknown as { document?: unknown }).document
})

test('loginAdmin persists remember preference and hydrates admin session', async () => {
  installWindow()
  installDocument()
  queueFetchResponses(
    createMockResponse({
      data: {
        token: 'csrf-body-token',
        headerName: 'X-XSRF-TOKEN',
      },
    }),
    createMockResponse({
      data: {
        token: 'login-token',
        expiresInSeconds: 1800,
        role: 'SUPER_ADMIN',
        admin: { email: 'admin@myshop.com' },
      },
    }),
  )

  setAdminQueryData(['products'], { stale: true })

  const session = await loginAdmin('admin@myshop.com', 'secret', false)

  expect(getAdminRememberPreference()).toBe(false)
  expect(session.token).toBe('login-token')
  expect(session.role).toBe('SUPER_ADMIN')
  expect(getAdminSession().user).toEqual({ email: 'admin@myshop.com' })
  expect(getAdminQueryData(['products'])).toBeUndefined()
})

test('loginAdmin uses the freshly issued csrf token instead of a stale cookie token', async () => {
  installWindow()
  installDocument('XSRF-TOKEN=stale-csrf-token')

  const calls: Array<{ url: string; options: RequestInit }> = []
  ;(globalThis as unknown as { fetch: typeof fetch }).fetch = (async (url: string, options: RequestInit = {}) => {
    calls.push({ url, options })

    if (calls.length === 1) {
      Object.defineProperty(globalThis, 'document', {
        configurable: true,
        value: {
          cookie: 'XSRF-TOKEN=fresh-csrf-token',
        },
      })

      return createMockResponse({
        data: {
          token: 'csrf-body-token',
          headerName: 'X-XSRF-TOKEN',
        },
      })
    }

    expect((options.headers as Headers).get('X-XSRF-TOKEN')).toBe('csrf-body-token')
    return createMockResponse({
      data: {
        token: 'login-token',
        expiresInSeconds: 1800,
        role: 'ADMIN',
        admin: { email: 'admin@myshop.com' },
      },
    })
  }) as unknown as typeof fetch

  const session = await loginAdmin('admin@myshop.com', 'secret', true)

  expect(calls[0].url).toBe('/api/admins/csrf-token')
  expect(calls[1].url).toBe('/api/admins/login')
  expect(session.token).toBe('login-token')
})

test('refreshAdminSession deduplicates concurrent refresh requests', async () => {
  installWindow()
  installDocument()
  const calls = queueFetchResponses(
    async () => createMockResponse({
      data: {
        token: 'csrf-body-token',
        headerName: 'X-XSRF-TOKEN',
      },
    }),
    async () => createMockResponse({
      data: {
        token: 'refreshed-token',
        expiresInSeconds: 900,
        admin: { email: 'admin@myshop.com' },
      },
    }),
  )

  const [first, second] = await Promise.all([
    refreshAdminSession(),
    refreshAdminSession(),
  ])

  expect(calls).toHaveLength(2)
  expect(first.token).toBe('refreshed-token')
  expect(second.token).toBe('refreshed-token')
  expect(getAdminAccessToken()).toBe('refreshed-token')
  expect(calls[0].url).toBe('/api/admins/csrf-token')
  expect(calls[1].url).toBe('/api/admins/refresh')
})

test('apiGet refreshes an expired admin session before requesting protected data', async () => {
  installWindow()
  installDocument()
  setAdminSession({
    token: 'expired-token',
    expiresAt: Date.now() - 1000,
    role: 'ADMIN',
  })

  const calls = queueFetchResponses(
    createMockResponse({
      data: {
        token: 'csrf-body-token',
        headerName: 'X-XSRF-TOKEN',
      },
    }),
    createMockResponse({
      data: {
        token: 'fresh-token',
        expiresInSeconds: 1800,
        admin: { email: 'admin@myshop.com' },
      },
    }),
    createMockResponse({
      data: {
        items: [{ id: 1, nom: 'Produit test' }],
      },
    }),
  )

  const response = await apiGet('/produits')

  expect(calls).toHaveLength(3)
  expect(calls[0].url).toBe('/api/admins/csrf-token')
  expect(calls[1].url).toBe('/api/admins/refresh')
  expect(calls[2].url).toBe('/api/produits')
  expect((calls[2].options.headers as Headers).get('Authorization')).toBe('Bearer fresh-token')
  expect(response).toEqual({ items: [{ id: 1, nom: 'Produit test' }] })
})

test('apiGet clears the admin session when a protected request stays unauthorized after refresh', async () => {
  installWindow()
  installDocument()
  setAdminSession({
    token: 'valid-token',
    expiresAt: Date.now() + 60000,
    role: 'ADMIN',
  })

  queueFetchResponses(
    createMockResponse({
      ok: false,
      status: 401,
      data: { message: 'Unauthorized' },
    }),
    createMockResponse({
      data: {
        token: 'csrf-body-token',
        headerName: 'X-XSRF-TOKEN',
      },
    }),
    createMockResponse({
      data: {
        token: 'fresh-token',
        expiresInSeconds: 1800,
        admin: { email: 'admin@myshop.com' },
      },
    }),
    createMockResponse({
      ok: false,
      status: 401,
      data: { message: 'Unauthorized again' },
    }),
  )

  await expect(apiGet('/produits', { suppressConsoleError: true })).rejects.toThrow(/Unauthorized again/)

  expect(getAdminAccessToken()).toBeNull()
})

test('apiGet exposes a friendly error when the admin backend is unreachable', async () => {
  installWindow()
  installDocument()
  setAdminSession({
    token: 'valid-token',
    expiresAt: Date.now() + 60000,
    role: 'ADMIN',
  })

  ;(globalThis as unknown as { fetch: typeof fetch }).fetch = (async () => {
    throw new TypeError('fetch failed')
  }) as unknown as typeof fetch

  await expect(apiGet('/produits')).rejects.toThrow(/Impossible de contacter le serveur admin/)
})

test('logoutAdminSession refreshes the CSRF token and retries once after a forbidden response', async () => {
  installWindow()
  installDocument('XSRF-TOKEN=stale-csrf-token')

  const calls: Array<{ url: string; options: RequestInit }> = []
  ;(globalThis as unknown as { fetch: typeof fetch }).fetch = (async (url: string, options: RequestInit = {}) => {
    calls.push({ url, options })

    if (calls.length === 1) {
      return createMockResponse({
        data: {
          token: 'csrf-body-token',
          headerName: 'X-XSRF-TOKEN',
        },
      })
    }

    if (calls.length === 2) {
      expect((options.headers as Headers).get('X-XSRF-TOKEN')).toBe('csrf-body-token')
      Object.defineProperty(globalThis, 'document', {
        configurable: true,
        value: {
          cookie: 'XSRF-TOKEN=fresh-csrf-token',
        },
      })
      return createMockResponse({
        ok: false,
        status: 403,
        data: { message: 'Forbidden' },
      })
    }

    if (calls.length === 3) {
      return createMockResponse({
        data: {
          token: 'csrf-body-token-refreshed',
          headerName: 'X-XSRF-TOKEN',
        },
      })
    }

    expect((options.headers as Headers).get('X-XSRF-TOKEN')).toBe('csrf-body-token-refreshed')
    return createMockResponse({
      data: { message: 'Déconnecté' },
    })
  }) as unknown as typeof fetch

  await logoutAdminSession()

  expect(calls.map((call) => call.url)).toEqual([
    '/api/admins/csrf-token',
    '/api/admins/logout',
    '/api/admins/csrf-token',
    '/api/admins/logout',
  ])
})
