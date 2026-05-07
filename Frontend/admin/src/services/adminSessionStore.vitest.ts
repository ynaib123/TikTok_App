import { test, expect } from 'vitest'
import {
  clearAdminSession,
  getAdminSession,
  isAdminAccessTokenExpired,
  setAdminSession,
} from './adminSessionStore'

test('setAdminSession derives an absolute expiry from expiresInSeconds', () => {
  clearAdminSession()
  const before = Date.now()

  const session = setAdminSession({
    token: 'access-token',
    expiresInSeconds: 1800,
    role: 'ADMIN',
    user: { email: 'admin@example.com' },
  })

  expect(session.token).toBe('access-token')
  expect(session.role).toBe('ADMIN')
  expect(Number.isFinite(session.expiresAt)).toBe(true)
  expect((session.expiresAt ?? 0) >= before + 1799000).toBe(true)
  expect(isAdminAccessTokenExpired()).toBe(false)

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

  expect(session.expiresAt).toBe(absoluteExpiry)
  expect(getAdminSession().user).toEqual({ email: 'admin@example.com' })

  clearAdminSession()
})
