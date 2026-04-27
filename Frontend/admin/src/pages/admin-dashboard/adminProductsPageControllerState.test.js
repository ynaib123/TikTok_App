import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildProductControllerHydrationIds,
  buildProductControllerResult,
} from './adminProductsPageControllerState.js'

test('buildProductControllerHydrationIds keeps controller hydration requests stable', () => {
  assert.deepEqual(
    buildProductControllerHydrationIds({
      deleteModalProductIds: [9],
      editDraftsByProductId: { 4: {}, invalid: {} },
      managedEditProductId: 7,
      resolvedEditProductId: 5,
      selectedProductIds: [2, 3],
    }),
    [2, 3, 4, 9, 5, 7]
  )
})

test('buildProductControllerResult keeps the shell contract stable', () => {
  const calls = []
  const result = buildProductControllerResult({
    actionModalProps: { isDeleteModalOpen: true },
    activeSectionId: 'product-management',
    blockingMessage: 'Traitement en cours...',
    blockingProgress: 72,
    error: 'Erreur',
    guardedNavigate: (to) => calls.push(to),
    info: 'Info',
    isBlocking: true,
    managementSectionProps: { products: [] },
    pageType: 'products',
    productCreatePanelProps: { createDrafts: [] },
    productDeletePanelProps: { deleteIds: [1] },
    productEditPanelProps: { productId: 3 },
    productSelectionSidebarProps: { totalSelectedProducts: 2 },
    setError: () => undefined,
    setInfo: () => undefined,
    showProductSelectionSidebar: true,
  })

  assert.equal(result.activeAdminNavId, 'products')
  assert.equal(result.activeSectionId, 'product-management')
  assert.equal(result.isBlocking, true)
  assert.equal(result.blockingProgress, 72)
  assert.equal(result.showProductSelectionSidebar, true)
  result.handleReturnToProducts()
  assert.deepEqual(calls, ['/products'])
})
