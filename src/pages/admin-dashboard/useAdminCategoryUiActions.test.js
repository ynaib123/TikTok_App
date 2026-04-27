import test from 'node:test'
import assert from 'node:assert/strict'
import { buildCategoryMergePayload, buildOpenCategoryDeleteModalPayload } from './useAdminCategoryUiActions.js'

test('buildOpenCategoryDeleteModalPayload rejects empty selections', () => {
  const result = buildOpenCategoryDeleteModalPayload([])

  assert.equal(result.error, 'Selectionnez au moins une categorie.')
  assert.deepEqual(result.nextState, { isOpen: false, categoryIds: [] })
})

test('buildOpenCategoryDeleteModalPayload normalizes and opens modal state', () => {
  const result = buildOpenCategoryDeleteModalPayload(['4', 4, 7])

  assert.equal(result.error, null)
  assert.deepEqual(result.nextState, { isOpen: true, categoryIds: [4, 7] })
})

test('buildCategoryMergePayload rejects incomplete merge requests', () => {
  const missingSelection = buildCategoryMergePayload([4], 'Univers gaming')
  const missingLabel = buildCategoryMergePayload([4, 7], '   ')

  assert.equal(missingSelection.error, 'Selectionnez au moins deux categories a fusionner.')
  assert.equal(missingLabel.error, 'Saisissez un libelle de categorie.')
})

test('buildCategoryMergePayload normalizes selected category ids and label', () => {
  const result = buildCategoryMergePayload(['4', 4, 7], '  Univers gaming  ')

  assert.equal(result.error, null)
  assert.deepEqual(result.payload, {
    categoryIds: [4, 7],
    libelle: 'Univers gaming',
  })
})
