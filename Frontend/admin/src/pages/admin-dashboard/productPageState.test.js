import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildProductCreateDirtyState,
  buildProductHydrationIds,
  collectDirtyDraftProductIds,
  mergeProductIdsIntoSelection,
  resolveProductsActiveSectionId,
  resolveProductSelectionSidebarVisibility,
} from './productPageState.js'

test('resolveProductsActiveSectionId maps page type and hashes predictably', () => {
  assert.equal(resolveProductsActiveSectionId({ hash: '#bulk-add-products', pageType: 'products' }), 'add-products')
  assert.equal(resolveProductsActiveSectionId({ hash: '#edit-products', pageType: 'products' }), 'product-management')
  assert.equal(resolveProductsActiveSectionId({ pageType: 'product-edit', productId: 9 }), 'product-details')
})

test('collectDirtyDraftProductIds returns only modified product ids', () => {
  const result = collectDirtyDraftProductIds({
    4: {
      form: { nom: 'A', description: 'B', imageUrlsText: '' },
      initialForm: { nom: 'A', description: 'C', imageUrl: '', imageUrlsText: '', prixAchat: '', prix: '', promotionActive: false, promotionPercent: '', stock: '', rating: '0', categorieId: '' },
      descriptionInputValue: 'B',
    },
    7: {
      form: { nom: 'X', description: 'Y', imageUrl: '', imageUrlsText: '', prixAchat: '', prix: '', promotionActive: false, promotionPercent: '', stock: '', rating: '0', categorieId: '' },
      initialForm: { nom: 'X', description: 'Y', imageUrl: '', imageUrlsText: '', prixAchat: '', prix: '', promotionActive: false, promotionPercent: '', stock: '', rating: '0', categorieId: '' },
      descriptionInputValue: 'Y',
    },
  })

  assert.deepEqual(result, [4])
})

test('mergeProductIdsIntoSelection adds missing ids without duplicates', () => {
  assert.deepEqual(mergeProductIdsIntoSelection([2, 4], [4, 7]), [2, 4, 7])
})

test('mergeProductIdsIntoSelection preserves the same array when nothing changes', () => {
  const currentSelection = [2, 4]
  const result = mergeProductIdsIntoSelection(currentSelection, [2, 4])

  assert.equal(result, currentSelection)
})

test('buildProductHydrationIds gathers finite ids across controller sources', () => {
  const result = buildProductHydrationIds({
    deleteModalProductIds: [5],
    editDraftsByProductId: { 3: {}, bad: {} },
    managedEditProductId: 9,
    resolvedEditProductId: 8,
    selectedProductIds: [1, 2],
  })

  assert.deepEqual(result, [1, 2, 3, 5, 8, 9])
})

test('product create dirty state respects saved drafts and current workspace snapshots', () => {
  assert.equal(buildProductCreateDirtyState({
    createDrafts: [{ id: 'draft-1', form: { nom: 'Desk', description: '', imageUrlsText: '', imageUrl: '', prixAchat: '', prix: '', promotionActive: false, promotionPercent: '', stock: '', rating: '0', categorieId: '' } }],
    isCreateSection: true,
    savedCreateDraftIds: ['draft-1'],
  }), false)
})

test('resolveProductSelectionSidebarVisibility follows products section rules', () => {
  assert.equal(resolveProductSelectionSidebarVisibility({ pageType: 'product-edit' }), true)
  assert.equal(resolveProductSelectionSidebarVisibility({ locationHash: '#delete-products', pageType: 'products' }), true)
  assert.equal(resolveProductSelectionSidebarVisibility({ locationHash: '#overview', pageType: 'dashboard' }), false)
})
