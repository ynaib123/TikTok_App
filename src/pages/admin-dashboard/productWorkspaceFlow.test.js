import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildUnsavedSelectionModalPayload,
  buildUnsavedSelectionResetState,
  buildCreateDraftRemovalState,
  buildCreateWorkspaceState,
  buildPendingSelectionClearState,
} from './productWorkspaceState.js'

function createDraftFactory() {
  let counter = 0

  return () => ({
    id: `draft-${++counter}`,
    form: {
      nom: '',
      description: '',
      imageUrl: '',
      imageUrlsText: '',
      prixAchat: '',
      prix: '',
      promotionActive: false,
      promotionPercent: '',
      stock: '',
      categorieId: '',
    },
    persistedProductId: null,
    selectedPreviewImage: '',
  })
}

test('workspace flow keeps single create draft pending until removed', () => {
  const createProductDraft = createDraftFactory()
  const createState = buildCreateWorkspaceState({ createProductDraft, mode: 'single' })

  assert.equal(createState.createDrafts.length, 1)
  assert.equal(createState.activeCreateDraftId, 'draft-1')

  const removalState = buildCreateDraftRemovalState({
    activeCreateDraftId: createState.activeCreateDraftId,
    createDrafts: createState.createDrafts,
    draftId: createState.activeCreateDraftId,
    savedCreateDraftIds: [],
  })

  assert.equal(removalState.shouldNavigateToProducts, true)
  assert.equal(removalState.activeCreateDraftId, null)
  assert.deepEqual(removalState.createDrafts, [])
})

test('workspace flow preserves dirty create draft while clearing only untouched selections', () => {
  const result = buildPendingSelectionClearState({
    activeCreateDraftId: 'draft-1',
    createDrafts: [
      {
        id: 'draft-1',
        form: {
          nom: 'Produit brouillon',
          description: '',
          imageUrl: '',
          imageUrlsText: '',
          prixAchat: '',
          prix: '',
          promotionActive: false,
          promotionPercent: '',
          stock: '',
          categorieId: '',
        },
        persistedProductId: null,
      },
      {
        id: 'draft-2',
        form: {
          nom: '',
          description: '',
          imageUrl: '',
          imageUrlsText: '',
          prixAchat: '',
          prix: '',
          promotionActive: false,
          promotionPercent: '',
          stock: '',
          categorieId: '',
        },
        persistedProductId: null,
      },
    ],
    currentOpenProductId: 4,
    editDraftsByProductId: {
      4: {
        form: {
          nom: 'Produit 4 modifie',
          description: 'desc',
          imageUrl: '',
          imageUrlsText: '',
          prixAchat: '10',
          prix: '15',
          promotionActive: false,
          promotionPercent: '',
          stock: '2',
          categorieId: '1',
        },
        initialForm: {
          nom: 'Produit 4',
          description: 'desc',
          imageUrl: '',
          imageUrlsText: '',
          prixAchat: '10',
          prix: '15',
          promotionActive: false,
          promotionPercent: '',
          stock: '2',
          categorieId: '1',
        },
      },
    },
    isCreateSection: true,
    products: [{ id: 4, nom: 'Produit 4' }, { id: 9, nom: 'Produit 9' }],
    savedCreateDraftIds: [],
    selectedProductIds: [4, 9],
  })

  assert.deepEqual(result.untouchedDraftIds, ['draft-2'])
  assert.deepEqual(result.untouchedProductIds, [9])
  assert.equal(result.shouldResetCreateDraft, false)
  assert.equal(result.shouldNavigate, false)
})

test('workspace flow redirects back to products when clearing the only untouched create draft in add mode', () => {
  const result = buildPendingSelectionClearState({
    activeCreateDraftId: 'draft-1',
    createDrafts: [
      {
        id: 'draft-1',
        form: {
          nom: '',
          description: '',
          imageUrl: '',
          imageUrlsText: '',
          prixAchat: '',
          prix: '',
          promotionActive: false,
          promotionPercent: '',
          stock: '',
          categorieId: '',
        },
        persistedProductId: null,
      },
    ],
    currentOpenProductId: null,
    editDraftsByProductId: {},
    isCreateSection: true,
    products: [],
    savedCreateDraftIds: [],
    selectedProductIds: [],
  })

  assert.deepEqual(result.untouchedDraftIds, ['draft-1'])
  assert.equal(result.shouldResetCreateDraft, true)
  assert.equal(result.shouldNavigate, true)
  assert.equal(result.nextNavigation.targetPath, '/products')
})

test('workspace flow builds a stable payload for the unsaved selection modal', () => {
  const result = buildUnsavedSelectionModalPayload({
    draftIds: ['draft-2', 'draft-2', 'draft-1'],
    productIds: ['4', 4, 9],
    label: 'Produits non sauvegardes',
  })

  assert.deepEqual(result, {
    isOpen: true,
    draftIds: ['draft-2', 'draft-1'],
    productIds: [4, 9],
    label: 'Produits non sauvegardes',
  })
})

test('workspace flow computes the next navigation target after discarding unsaved edited products', () => {
  const result = buildUnsavedSelectionResetState({
    currentOpenProductId: 9,
    editDraftsByProductId: {
      9: { form: { nom: 'Produit 9 modifie' } },
    },
    products: [{ id: 4, nom: 'Produit 4' }, { id: 9, nom: 'Produit 9' }],
    selectedProductIds: [4, 9],
    unsavedSelectionModalState: {
      draftIds: [],
      productIds: [9],
    },
  })

  assert.deepEqual(result.productIds, [9])
  assert.equal(result.shouldNavigate, true)
  assert.equal(result.nextNavigation.targetPath, '/products/4/edit#product-details')
})

test('workspace flow opens add route with a single active draft by default', () => {
  const createProductDraft = createDraftFactory()
  const createState = buildCreateWorkspaceState({ createProductDraft, mode: 'single' })

  assert.equal(createState.activeCreateDraftId, 'draft-1')
  assert.equal(createState.createDrafts.length, 1)
  assert.deepEqual(createState.createForm, createState.createDrafts[0].form)
})

test('workspace flow can create multiple drafts for bulk add route', () => {
  const createProductDraft = createDraftFactory()
  const createState = buildCreateWorkspaceState({ createProductDraft, mode: 'multiple' })

  assert.equal(createState.activeCreateDraftId, 'draft-1')
  assert.equal(createState.createDrafts.length, 2)
  assert.deepEqual(createState.createDrafts.map((draft) => draft.id), ['draft-1', 'draft-2'])
})

test('workspace flow keeps dirty edit product out of pending clear set', () => {
  const result = buildPendingSelectionClearState({
    activeCreateDraftId: null,
    createDrafts: [],
    currentOpenProductId: 4,
    editDraftsByProductId: {
      4: {
        form: {
          nom: 'Produit 4 modifie',
          description: 'desc modifiee',
          imageUrl: '',
          imageUrlsText: '',
          prixAchat: '10',
          prix: '15',
          promotionActive: false,
          promotionPercent: '',
          stock: '2',
          categorieId: '1',
        },
        initialForm: {
          nom: 'Produit 4',
          description: 'desc',
          imageUrl: '',
          imageUrlsText: '',
          prixAchat: '10',
          prix: '15',
          promotionActive: false,
          promotionPercent: '',
          stock: '2',
          categorieId: '1',
        },
      },
      9: {
        form: {
          nom: 'Produit 9',
          description: '',
          imageUrl: '',
          imageUrlsText: '',
          prixAchat: '',
          prix: '',
          promotionActive: false,
          promotionPercent: '',
          stock: '',
          categorieId: '',
        },
        initialForm: {
          nom: 'Produit 9',
          description: '',
          imageUrl: '',
          imageUrlsText: '',
          prixAchat: '',
          prix: '',
          promotionActive: false,
          promotionPercent: '',
          stock: '',
          categorieId: '',
        },
      },
    },
    isCreateSection: false,
    products: [{ id: 4, nom: 'Produit 4' }, { id: 9, nom: 'Produit 9' }],
    savedCreateDraftIds: [],
    selectedProductIds: [4, 9],
  })

  assert.deepEqual(result.untouchedProductIds, [9])
  assert.equal(result.shouldNavigate, false)
})
