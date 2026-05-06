import test from 'node:test'
import assert from 'node:assert/strict'
import { isAdminRole, normalizeAdminRole } from './adminRoles.js'

test('isAdminRole accepte ADMIN et SUPER_ADMIN', () => {
  assert.equal(isAdminRole('ADMIN'), true)
  assert.equal(isAdminRole('SUPER_ADMIN'), true)
})

test("isAdminRole refuse les roles non admin ou vides", () => {
  assert.equal(isAdminRole('CLIENT'), false)
  assert.equal(isAdminRole(''), false)
  assert.equal(isAdminRole(null), false)
})

test('normalizeAdminRole normalise le role avant validation', () => {
  assert.equal(normalizeAdminRole(' super_admin '), 'SUPER_ADMIN')
  assert.equal(isAdminRole(' super_admin '), true)
})
