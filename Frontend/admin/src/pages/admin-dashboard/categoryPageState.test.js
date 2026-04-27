import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildCategorySelectionModel,
  buildDeleteModalCategories,
  clampCategoryPage,
  getVisibleCategoryIds,
  reconcileVisibleCategorySelection,
  resolveCategoryEditorState,
} from './categoryPageState.js'

test('clampCategoryPage keeps category pagination in range', () => {
  assert.equal(clampCategoryPage(0, 4), 1)
  assert.equal(clampCategoryPage(9, 4), 4)
})

test('getVisibleCategoryIds normalizes finite ids only', () => {
  assert.deepEqual(getVisibleCategoryIds([{ id: '2' }, { id: 'x' }, { id: 5 }]), [2, 5])
})

test('buildDeleteModalCategories resolves ids through the category map', () => {
  const categoryMap = new Map([[2, { id: 2, libelle: 'Gaming' }]])
  assert.deepEqual(buildDeleteModalCategories([2, 7], categoryMap), [{ id: 2, libelle: 'Gaming' }])
})

test('reconcileVisibleCategorySelection preserves reference when selection is still visible', () => {
  const selectedIds = [2, 5]
  const result = reconcileVisibleCategorySelection(selectedIds, [{ id: 2 }, { id: 5 }, { id: 9 }])

  assert.equal(result, selectedIds)
})

test('reconcileVisibleCategorySelection drops hidden category ids', () => {
  assert.deepEqual(
    reconcileVisibleCategorySelection([2, 5, 7], [{ id: 2 }, { id: 7 }]),
    [2, 7]
  )
})

test('resolveCategoryEditorState hydrates the active category form', () => {
  const result = resolveCategoryEditorState([{ id: 3, libelle: 'Audio' }], 3)
  assert.equal(result.activeCategoryId, 3)
  assert.equal(result.editCategoryForm.libelle, 'Audio')
})

test('buildCategorySelectionModel exposes counts for selected visible categories', () => {
  const model = buildCategorySelectionModel({
    activeCategoryId: '3',
    categories: [{ id: 3 }, { id: 5 }, { id: 8 }],
    selectedCategoryIds: [3, 8, 13],
  })

  assert.equal(model.activeId, 3)
  assert.equal(model.selectedCount, 3)
  assert.equal(model.visibleSelectedCount, 2)
})
