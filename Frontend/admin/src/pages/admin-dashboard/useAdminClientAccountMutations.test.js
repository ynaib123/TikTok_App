import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveSelectedClientAccountStatusAction } from './useAdminClientAccountMutations.js'

test('resolveSelectedClientAccountStatusAction deactivates fully active selections', () => {
  assert.deepEqual(
    resolveSelectedClientAccountStatusAction([
      { id: 1, compteActif: true },
      { id: 2, compteActif: true },
    ]),
    { kind: 'deactivate', nextActive: false }
  )
})

test('resolveSelectedClientAccountStatusAction reactivates fully suspended selections', () => {
  assert.deepEqual(
    resolveSelectedClientAccountStatusAction([
      { id: 1, compteActif: false },
      { id: 2, compteActif: false },
    ]),
    { kind: 'activate', nextActive: true }
  )
})

test('resolveSelectedClientAccountStatusAction rejects mixed selections', () => {
  assert.deepEqual(
    resolveSelectedClientAccountStatusAction([
      { id: 1, compteActif: true },
      { id: 2, compteActif: false },
    ]),
    { kind: 'mixed', nextActive: null }
  )
})
