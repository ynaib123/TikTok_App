import test from 'node:test'
import assert from 'node:assert/strict'
import { buildAdminProductPageDerivedState } from './useAdminProductPageDerived.js'

test('buildAdminProductPageDerivedState merges dirty edited products into the selected workspace ids', () => {
  const result = buildAdminProductPageDerivedState({
    activeSectionId: 'product-management',
    editDraftsByProductId: {
      4: {
        form: { nom: 'Produit 4 maj', description: 'Desc', imageUrl: '', imageUrlsText: '', prixAchat: '', prix: '', promotionActive: false, promotionPercent: '', stock: '', rating: '0', categorieId: '' },
        initialForm: { nom: 'Produit 4', description: 'Ancienne', imageUrl: '', imageUrlsText: '', prixAchat: '', prix: '', promotionActive: false, promotionPercent: '', stock: '', rating: '0', categorieId: '' },
        descriptionInputValue: 'Desc',
      },
    },
    managedEditProductId: 4,
    pageType: 'products',
    productImportModalOpen: false,
    products: [{ id: 2, nom: 'Produit 2' }, { id: 4, nom: 'Produit 4' }],
    selectedProductIds: [2],
    workspaceState: {
      activeCreateDraftId: 'draft-1',
      createDrafts: [{ id: 'draft-1', form: { nom: 'Draft' } }],
      savedCreateDraftIds: [],
    },
  })

  assert.deepEqual(result.dirtyDraftProductIds, [4])
  assert.deepEqual(result.effectiveSelectedProductIds, [2, 4])
  assert.deepEqual(result.productWorkspaceModel.selectedIds, [2, 4])
  assert.equal(result.productWorkspaceModel.uiState.activeSectionId, 'product-management')
  assert.equal(result.productWorkspaceModel.uiState.managedEditProductId, 4)
})
