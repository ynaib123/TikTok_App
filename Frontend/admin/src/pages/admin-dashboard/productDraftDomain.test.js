import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildDraftMutationPayload,
  collectDirtyCreateDrafts,
  collectDirtyEditDraftEntries,
  isCreateDraftDirty,
  isEditDraftDirty,
} from './productDraftDomain.js'

test('isCreateDraftDirty ignores saved drafts and detects modified create drafts', () => {
  const dirtyDraft = {
    id: 'draft-1',
    form: {
      nom: 'Lampe',
      description: '',
      imageUrl: '',
      imageUrlsText: '',
      prixAchat: '',
      prix: '',
      promotionActive: false,
      promotionPercent: '',
      stock: '',
      rating: '0',
      categorieId: '',
    },
  }

  assert.equal(isCreateDraftDirty(dirtyDraft, []), true)
  assert.equal(isCreateDraftDirty(dirtyDraft, ['draft-1']), false)
  assert.deepEqual(collectDirtyCreateDrafts([dirtyDraft], []), [dirtyDraft])
})

test('isEditDraftDirty compares current form against the initial snapshot', () => {
  const cleanDraft = {
    initialForm: {
      nom: 'Produit A',
      description: 'Desc',
      imageUrl: 'https://cdn/img-a.jpg',
      imageUrlsText: 'https://cdn/img-a.jpg',
      prixAchat: '10',
      prix: '20',
      promotionActive: false,
      promotionPercent: '',
      stock: '4',
      rating: '0',
      categorieId: '3',
    },
    form: {
      nom: 'Produit A',
      description: 'Desc',
      imageUrl: 'https://cdn/img-a.jpg',
      imageUrlsText: 'https://cdn/img-a.jpg',
      prixAchat: '10',
      prix: '20',
      promotionActive: false,
      promotionPercent: '',
      stock: '4',
      rating: '0',
      categorieId: '3',
    },
  }
  const dirtyDraft = {
    ...cleanDraft,
    descriptionInputValue: 'Desc modifiee',
  }

  assert.equal(isEditDraftDirty(cleanDraft), false)
  assert.equal(isEditDraftDirty(dirtyDraft), true)
  assert.deepEqual(collectDirtyEditDraftEntries({ 8: dirtyDraft }), [['8', dirtyDraft]])
})

test('buildDraftMutationPayload resolves the category from the draft form', () => {
  const payload = buildDraftMutationPayload({
    categories: [{ id: 9, libelle: 'Maison' }],
    draft: {
      form: {
        nom: 'Chaise',
        description: 'Chaise bois',
        imageUrl: '',
        imageUrlsText: 'https://cdn/chaise.jpg',
        prixAchat: '50',
        prix: '90',
        promotionPercent: '0',
        stock: '3',
        categorieId: '9',
      },
    },
    productId: 4,
  })

  assert.equal(payload.id, 4)
  assert.equal(payload.categorieId, 9)
  assert.deepEqual(payload.categorie, { id: 9, libelle: 'Maison' })
})
