import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildCreateSelectionStateByDraftId,
  buildEditSelectionStateByProductId,
  splitCreateDraftSelectionGroups,
  splitProductSelectionGroups,
} from './productSelectionState.js'

test('buildEditSelectionStateByProductId marks only modified drafts as dirty', () => {
  const state = buildEditSelectionStateByProductId({
    editDraftsByProductId: {
      12: {
        form: { nom: 'Chaussure', description: 'nouveau', prix: '90', imageUrlsText: '', prixAchat: '50', promotionActive: false, promotionPercent: '', stock: '4', categorieId: '3' },
        descriptionInputValue: 'nouveau',
        initialForm: { nom: 'Chaussure', description: 'ancien', prix: '90', imageUrlsText: '', prixAchat: '50', promotionActive: false, promotionPercent: '', stock: '4', categorieId: '3' },
      },
      18: {
        form: { nom: 'Sac', description: 'stable', prix: '120', imageUrlsText: '', prixAchat: '60', promotionActive: false, promotionPercent: '', stock: '2', categorieId: '4' },
        descriptionInputValue: 'stable',
        initialForm: { nom: 'Sac', description: 'stable', prix: '120', imageUrlsText: '', prixAchat: '60', promotionActive: false, promotionPercent: '', stock: '2', categorieId: '4' },
      },
    },
    isEditDirty: false,
    isEditWorkspaceActive: false,
    loadedEditProductId: null,
  })

  assert.equal(state['12'], true)
  assert.ok(Object.prototype.hasOwnProperty.call(state, '18'))
})

test('buildCreateSelectionStateByDraftId ignores saved drafts and flags edited drafts', () => {
  const state = buildCreateSelectionStateByDraftId({
    createDrafts: [
      { id: 'a1', form: { nom: '', description: '', imageUrl: '', imageUrlsText: '', prixAchat: '', prix: '', promotionActive: false, promotionPercent: '', stock: '', categorieId: '' } },
      { id: 'b2', form: { nom: 'Produit test', description: '', imageUrl: '', imageUrlsText: '', prixAchat: '', prix: '', promotionActive: false, promotionPercent: '', stock: '', categorieId: '' } },
      { id: 'c3', form: { nom: 'Sauve', description: '', imageUrl: '', imageUrlsText: '', prixAchat: '', prix: '', promotionActive: false, promotionPercent: '', stock: '', categorieId: '' } },
    ],
    savedCreateDraftIds: ['c3'],
  })

  assert.equal(state.a1, false)
  assert.equal(state.b2, true)
  assert.equal(state.c3, false)
})

test('split helpers separate pending and dirty groups deterministically', () => {
  const createGroups = splitCreateDraftSelectionGroups({
    createSelectionStateByDraftId: { a1: false, b2: true },
    pendingCreateDrafts: [{ id: 'a1' }, { id: 'b2' }],
  })
  const productGroups = splitProductSelectionGroups({
    editSelectionStateByProductId: { 11: true, 22: false },
    selectedProductsForSidebar: [{ id: 11 }, { id: 22 }],
  })

  assert.deepEqual(createGroups.pendingDrafts.map((draft) => draft.id), ['a1'])
  assert.deepEqual(createGroups.dirtyDrafts.map((draft) => draft.id), ['b2'])
  assert.deepEqual(productGroups.pendingProducts.map((product) => product.id), [22])
  assert.deepEqual(productGroups.dirtyProducts.map((product) => product.id), [11])
})
