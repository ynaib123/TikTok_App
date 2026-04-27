import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildCreateDraftRemovalState,
  buildCreateWorkspaceState,
  buildPendingSelectionClearState,
  buildUnsavedSelectionModalPayload,
  buildUnsavedSelectionResetState,
} from './productWorkspaceState.js'

test('buildUnsavedSelectionModalPayload normalizes and deduplicates ids', () => {
  const result = buildUnsavedSelectionModalPayload({
    draftIds: ['a1', 'a1', 'b2'],
    productIds: [3, '3', 5],
    label: 'elements',
  })

  assert.deepEqual(result, {
    isOpen: true,
    draftIds: ['a1', 'b2'],
    productIds: [3, 5],
    label: 'elements',
  })
})

test('buildCreateWorkspaceState creates one active draft in single mode', () => {
  let counter = 0
  const result = buildCreateWorkspaceState({
    createProductDraft: () => ({
      id: `draft-${++counter}`,
      form: { nom: '' },
      selectedPreviewImage: '',
      persistedProductId: null,
    }),
  })

  assert.equal(result.activeCreateDraftId, 'draft-1')
  assert.equal(result.createDrafts.length, 1)
  assert.equal(result.shouldNavigateToProducts, undefined)
})

test('buildUnsavedSelectionResetState keeps draft ids and redirects when current product is reset', () => {
  const result = buildUnsavedSelectionResetState({
    currentOpenProductId: 9,
    editDraftsByProductId: {
      4: { form: { nom: 'A' }, initialForm: { nom: 'A' } },
    },
    products: [{ id: 4, nom: 'Produit 4' }, { id: 9, nom: 'Produit 9' }],
    selectedProductIds: [4, 9],
    unsavedSelectionModalState: {
      draftIds: ['draft-1'],
      productIds: [9],
    },
  })

  assert.deepEqual(result.draftIds, ['draft-1'])
  assert.deepEqual(result.productIds, [9])
  assert.equal(result.shouldNavigate, true)
  assert.equal(result.nextNavigation.targetPath, '/products/4/edit#product-details')
})

test('buildCreateDraftRemovalState closes create page when active draft is removed', () => {
  const result = buildCreateDraftRemovalState({
    activeCreateDraftId: 'draft-2',
    createDrafts: [
      { id: 'draft-1' },
      { id: 'draft-2' },
      { id: 'draft-3' },
    ],
    draftId: 'draft-2',
    savedCreateDraftIds: ['draft-3'],
  })

  assert.equal(result.activeCreateDraftId, null)
  assert.deepEqual(result.createDrafts.map((draft) => draft.id), ['draft-1', 'draft-3'])
  assert.deepEqual(result.savedCreateDraftIds, ['draft-3'])
  assert.equal(result.shouldNavigateToProducts, true)
})

test('buildCreateDraftRemovalState keeps current page when removing an inactive draft', () => {
  const result = buildCreateDraftRemovalState({
    activeCreateDraftId: 'draft-2',
    createDrafts: [
      { id: 'draft-1' },
      { id: 'draft-2' },
      { id: 'draft-3' },
    ],
    draftId: 'draft-1',
    savedCreateDraftIds: ['draft-3'],
  })

  assert.equal(result.activeCreateDraftId, 'draft-2')
  assert.deepEqual(result.createDrafts.map((draft) => draft.id), ['draft-2', 'draft-3'])
  assert.deepEqual(result.savedCreateDraftIds, ['draft-3'])
  assert.equal(result.shouldNavigateToProducts, false)
})

test('buildCreateDraftRemovalState closes workspace when removing last draft', () => {
  const result = buildCreateDraftRemovalState({
    activeCreateDraftId: 'draft-1',
    createDrafts: [{ id: 'draft-1' }],
    draftId: 'draft-1',
    savedCreateDraftIds: ['draft-1'],
  })

  assert.equal(result.shouldNavigateToProducts, true)
  assert.equal(result.activeCreateDraftId, null)
  assert.deepEqual(result.createDrafts, [])
})

test('buildPendingSelectionClearState finds untouched drafts and pending selected products', () => {
  const result = buildPendingSelectionClearState({
    activeCreateDraftId: null,
    createDrafts: [
      { id: 'draft-1', form: { nom: '', description: '', imageUrl: '', imageUrlsText: '', prixAchat: '', prix: '', promotionActive: false, promotionPercent: '', stock: '', categorieId: '' }, persistedProductId: null },
      { id: 'draft-2', form: { nom: 'Started', description: '', imageUrl: '', imageUrlsText: '', prixAchat: '', prix: '', promotionActive: false, promotionPercent: '', stock: '', categorieId: '' }, persistedProductId: null },
    ],
    currentOpenProductId: 1,
    editDraftsByProductId: {},
    isCreateSection: false,
    products: [{ id: 1, nom: 'Produit 1' }, { id: 2, nom: 'Produit 2' }],
    savedCreateDraftIds: [],
    selectedProductIds: [1, 2],
  })

  assert.deepEqual(result.untouchedDraftIds, ['draft-1'])
  assert.deepEqual(result.untouchedProductIds, [1, 2])
  assert.equal(result.shouldNavigate, true)
  assert.equal(result.nextNavigation.targetPath, '/products')
})

test('buildPendingSelectionClearState redirects to products when clearing the current add draft', () => {
  const result = buildPendingSelectionClearState({
    activeCreateDraftId: 'draft-1',
    createDrafts: [
      { id: 'draft-1', form: { nom: '', description: '', imageUrl: '', imageUrlsText: '', prixAchat: '', prix: '', promotionActive: false, promotionPercent: '', stock: '', categorieId: '' }, persistedProductId: null },
      { id: 'draft-2', form: { nom: 'Started', description: '', imageUrl: '', imageUrlsText: '', prixAchat: '', prix: '', promotionActive: false, promotionPercent: '', stock: '', categorieId: '' }, persistedProductId: null },
    ],
    currentOpenProductId: null,
    editDraftsByProductId: {},
    isCreateSection: true,
    products: [],
    savedCreateDraftIds: [],
    selectedProductIds: [],
  })

  assert.deepEqual(result.untouchedDraftIds, ['draft-1'])
  assert.equal(result.shouldNavigate, true)
  assert.equal(result.shouldResetCreateDraft, true)
  assert.equal(result.nextNavigation.targetPath, '/products')
})
