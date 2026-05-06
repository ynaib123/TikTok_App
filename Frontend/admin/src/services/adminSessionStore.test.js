import test from 'node:test'
import assert from 'node:assert/strict'
import {
  clearAdminSession,
  getAdminSession,
  isAdminAccessTokenExpired,
  setAdminSession,
} from './adminSessionStore.js'

test('setAdminSession derives an absolute expiry from expiresInSeconds', () => {
  clearAdminSession()
  const before = Date.now()

  const session = setAdminSession({
    token: 'access-token',
    expiresInSeconds: 1800,
    role: 'ADMIN',
    user: { email: 'admin@example.com' },
  })

  assert.equal(session.token, 'access-token')
  assert.equal(session.role, 'ADMIN')
  assert.ok(Number.isFinite(session.expiresAt))
  assert.ok(session.expiresAt >= before + 1799000)
  assert.equal(isAdminAccessTokenExpired(), false)

  clearAdminSession()
})

test('setAdminSession preserves an explicit absolute expiry when provided', () => {
  clearAdminSession()
  const absoluteExpiry = Date.now() + 45000

  const session = setAdminSession({
    token: 'access-token',
    expiresAt: absoluteExpiry,
    expiresInSeconds: 1800,
    role: 'ADMIN',
    user: { email: 'admin@example.com' },
  })

  assert.equal(session.expiresAt, absoluteExpiry)
  assert.deepEqual(getAdminSession().user, { email: 'admin@example.com' })

  clearAdminSession()
})
