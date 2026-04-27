import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildAdminSelectionModel,
  clearVisibleNumericSelection,
  getVisibleNumericIds,
  normalizeNumericSelection,
  selectVisibleNumericIds,
  toggleNumericSelection,
} from './adminSelectionModel.js'

test('normalizeNumericSelection deduplicates and coerces finite ids', () => {
  assert.deepEqual(normalizeNumericSelection(['4', 4, 7, 'oops']), [4, 7])
})

test('toggleNumericSelection adds and removes ids deterministically', () => {
  assert.deepEqual(toggleNumericSelection([], 9), [9])
  assert.deepEqual(toggleNumericSelection([4, 9], '4'), [9])
})

test('visible selection helpers work from arbitrary item arrays', () => {
  const items = [{ id: '2' }, { id: 5 }, { id: 'x' }]

  assert.deepEqual(getVisibleNumericIds(items), [2, 5])
  assert.deepEqual(selectVisibleNumericIds([7], items), [7, 2, 5])
  assert.deepEqual(clearVisibleNumericSelection([2, 5, 7], items), [7])
})

test('buildAdminSelectionModel exposes visible and selected counts', () => {
  const model = buildAdminSelectionModel({
    activeId: '7',
    selectedIds: [2, 5, 7],
    visibleIds: [5, 7, 12],
  })

  assert.equal(model.activeId, 7)
  assert.equal(model.selectedCount, 3)
  assert.equal(model.visibleSelectedCount, 2)
  assert.equal(model.hasSelection, true)
})
