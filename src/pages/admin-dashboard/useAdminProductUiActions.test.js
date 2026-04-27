import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildPendingProductIdsForActions,
  resolveSectionSelectAction,
} from './adminProductUiState.js'

test('buildPendingProductIdsForActions returns only pending finite product ids', () => {
  const result = buildPendingProductIdsForActions({
    editDraftsByProductId: {
      2: {
        form: { nom: 'Produit 2 modifie' },
        initialForm: { nom: 'Produit 2' },
      },
    },
    products: [
      { id: 1, nom: 'Produit 1' },
      { id: 2, nom: 'Produit 2' },
      { id: 3, nom: 'Produit 3' },
    ],
    selectedProductIds: [1, 2, 3, 'x'],
  })

  assert.deepEqual(result, [1, 3])
})

test('resolveSectionSelectAction maps products delete section to delete modal action', () => {
  const result = resolveSectionSelectAction({
    pageType: 'products',
    productId: null,
    sectionId: 'delete-products',
    pendingProductIdsForActions: [4, 7],
  })

  assert.deepEqual(result, {
    type: 'open-delete',
    productIds: [4, 7],
  })
})

test('resolveSectionSelectAction maps product-edit delete action with redirect', () => {
  const result = resolveSectionSelectAction({
    pageType: 'product-edit',
    productId: 9,
    sectionId: 'product-delete-action',
    pendingProductIdsForActions: [],
  })

  assert.deepEqual(result, {
    type: 'open-delete',
    productIds: [9],
    redirectTo: '/products',
  })
})

test('resolveSectionSelectAction keeps guarded navigation for product details', () => {
  const result = resolveSectionSelectAction({
    pageType: 'product-edit',
    productId: 12,
    sectionId: 'product-details',
    pendingProductIdsForActions: [],
  })

  assert.deepEqual(result, {
    type: 'navigate',
    to: '/products/12/edit#product-details',
    guarded: true,
  })
})

test('resolveSectionSelectAction sends add page directly to product create route', () => {
  const result = resolveSectionSelectAction({
    pageType: 'products',
    productId: null,
    sectionId: 'add-products',
    pendingProductIdsForActions: [],
  })

  assert.deepEqual(result, {
    type: 'navigate',
    to: '/products/add',
    guarded: false,
  })
})
