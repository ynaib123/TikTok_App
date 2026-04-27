import test from 'node:test'
import assert from 'node:assert/strict'
import {
  apiGet,
} from '../../services/adminApiClient.js'
import {
  getAdminRememberPreference,
  loginAdmin,
  logoutAdminSession,
  refreshAdminSession,
} from '../../services/adminAuthService.js'
import {
  clearAdminSession,
  getAdminAccessToken,
  getAdminSession,
  setAdminSession,
} from '../../services/adminSessionStore.js'
import { clearAdminQueryCache, setAdminQueryData, getAdminQueryData } from '../../services/adminQueryCache.js'
import { clearAdminCsrfTokenCache } from '../../services/adminCsrfService.js'

const originalFetch = globalThis.fetch
const originalWindow = globalThis.window

function createMockResponse({ ok = true, status = 200, data = null, headers = {} } = {}) {
  return {
    ok,
    status,
    headers: {
      get(name) {
        return headers[name] ?? headers[String(name).toLowerCase()] ?? null
      },
    },
    async text() {
      if (data === null || data === undefined) return ''
      return typeof data === 'string' ? data : JSON.stringify(data)
    },
  }
}

function createLocalStorage() {
  const store = new Map()
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null
    },
    setItem(key, value) {
      store.set(key, String(value))
    },
    removeItem(key) {
      store.delete(key)
    },
    clear() {
      store.clear()
    },
  }
}

function installWindow() {
  globalThis.window = {
    localStorage: createLocalStorage(),
  }
  return globalThis.window
}

function installDocument(cookie = 'XSRF-TOKEN=test-csrf-token') {
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      cookie,
    },
  })
}

function queueFetchResponses(...responses) {
  const calls = []
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options })
    const next = responses.shift()
    if (typeof next === 'function') {
      return next(url, options)
    }
    return next
  }
  return calls
}

test.afterEach(() => {
  clearAdminSession()
  clearAdminQueryCache()
  clearAdminCsrfTokenCache()
  globalThis.fetch = originalFetch
  globalThis.window = originalWindow
  delete globalThis.document
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
    })
  )

  setAdminQueryData(['products'], { stale: true })

  const session = await loginAdmin('admin@myshop.com', 'secret', false)

  assert.equal(getAdminRememberPreference(), false)
  assert.equal(session.token, 'login-token')
  assert.equal(session.role, 'SUPER_ADMIN')
  assert.deepEqual(getAdminSession().user, { email: 'admin@myshop.com' })
  assert.equal(getAdminQueryData(['products']), undefined)
})

test('loginAdmin uses the freshly issued csrf token instead of a stale cookie token', async () => {
  installWindow()
  installDocument('XSRF-TOKEN=stale-csrf-token')

  const calls = []
  globalThis.fetch = async (url, options = {}) => {
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

    assert.equal(options.headers.get('X-XSRF-TOKEN'), 'csrf-body-token')
    return createMockResponse({
      data: {
        token: 'login-token',
        expiresInSeconds: 1800,
        role: 'ADMIN',
        admin: { email: 'admin@myshop.com' },
      },
    })
  }

  const session = await loginAdmin('admin@myshop.com', 'secret', true)

  assert.equal(calls[0].url, '/api/admins/csrf-token')
  assert.equal(calls[1].url, '/api/admins/login')
  assert.equal(session.token, 'login-token')
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
    })
  )

  const [first, second] = await Promise.all([
    refreshAdminSession(),
    refreshAdminSession(),
  ])

  assert.equal(calls.length, 2)
  assert.equal(first.token, 'refreshed-token')
  assert.equal(second.token, 'refreshed-token')
  assert.equal(getAdminAccessToken(), 'refreshed-token')
  assert.equal(calls[0].url, '/api/admins/csrf-token')
  assert.equal(calls[1].url, '/api/admins/refresh')
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
    })
  )

  const response = await apiGet('/produits')

  assert.equal(calls.length, 3)
  assert.equal(calls[0].url, '/api/admins/csrf-token')
  assert.equal(calls[1].url, '/api/admins/refresh')
  assert.equal(calls[2].url, '/api/produits')
  assert.equal(calls[2].options.headers.get('Authorization'), 'Bearer fresh-token')
  assert.deepEqual(response, { items: [{ id: 1, nom: 'Produit test' }] })
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
    })
  )

  await assert.rejects(
    () => apiGet('/produits', { suppressConsoleError: true }),
    /Unauthorized again/
  )

  assert.equal(getAdminAccessToken(), null)
})

test('apiGet exposes a friendly error when the admin backend is unreachable', async () => {
  installWindow()
  installDocument()
  setAdminSession({
    token: 'valid-token',
    expiresAt: Date.now() + 60000,
    role: 'ADMIN',
  })

  globalThis.fetch = async () => {
    throw new TypeError('fetch failed')
  }

  await assert.rejects(
    () => apiGet('/produits'),
    /Impossible de contacter le serveur admin/
  )
})

test('logoutAdminSession refreshes the CSRF token and retries once after a forbidden response', async () => {
  installWindow()
  installDocument('XSRF-TOKEN=stale-csrf-token')

  const calls = []
  globalThis.fetch = async (url, options = {}) => {
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
      assert.equal(options.headers.get('X-XSRF-TOKEN'), 'csrf-body-token')
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

    assert.equal(options.headers.get('X-XSRF-TOKEN'), 'csrf-body-token-refreshed')
    return createMockResponse({
      data: { message: 'Déconnecté' },
    })
  }

  await logoutAdminSession()

  assert.deepEqual(calls.map((call) => call.url), [
    '/api/admins/csrf-token',
    '/api/admins/logout',
    '/api/admins/csrf-token',
    '/api/admins/logout',
  ])
})
