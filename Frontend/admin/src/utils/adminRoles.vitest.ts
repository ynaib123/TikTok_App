import { test, expect } from 'vitest'
import { isAdminRole, normalizeAdminRole } from './adminRoles'

test('isAdminRole accepte ADMIN et SUPER_ADMIN', () => {
  expect(isAdminRole('ADMIN')).toBe(true)
  expect(isAdminRole('SUPER_ADMIN')).toBe(true)
})

test("isAdminRole refuse les roles non admin ou vides", () => {
  expect(isAdminRole('CLIENT')).toBe(false)
  expect(isAdminRole('')).toBe(false)
  expect(isAdminRole(null)).toBe(false)
})

test('normalizeAdminRole normalise le role avant validation', () => {
  expect(normalizeAdminRole(' super_admin ')).toBe('SUPER_ADMIN')
  expect(isAdminRole(' super_admin ')).toBe(true)
})
