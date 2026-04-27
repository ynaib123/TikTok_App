import test from 'node:test'
import assert from 'node:assert/strict'
import { formatDirtySelectionSaveMessage } from './useProductBulkMutations.js'

test('formatDirtySelectionSaveMessage keeps the mixed result copy stable', () => {
  assert.equal(
    formatDirtySelectionSaveMessage({ invalidCount: 2, savedCount: 5 }),
    '5 element(s) enregistre(s). 2 element(s) restent dans Non sauvegardes.'
  )
})

test('formatDirtySelectionSaveMessage keeps the success copy stable', () => {
  assert.equal(
    formatDirtySelectionSaveMessage({ invalidCount: 0, savedCount: 3 }),
    '3 element(s) enregistre(s) avec succes.'
  )
})
