import test from 'node:test'
import assert from 'node:assert/strict'
import { buildLoadedEditWorkspaceState } from './productEditWorkspaceState.js'

test('buildLoadedEditWorkspaceState hydrates edit form from API product when no draft exists', () => {
  const result = buildLoadedEditWorkspaceState({
    apiProduct: {
      id: 4,
      nom: 'Produit 4',
      description: 'Description 4',
      imageUrl: 'https://cdn/img-4.jpg',
      categorie: { id: 2, libelle: 'Maison' },
      promotionPercent: 10,
    },
    draft: null,
    listProduct: {
      id: 4,
      prixAchat: 20,
      prix: 40,
      promotionPercent: 10,
      stock: 6,
    },
  })

  assert.equal(result.editingProduct.id, 4)
  assert.equal(result.editForm.nom, 'Produit 4')
  assert.equal(result.editCategoryDraft, 'Maison')
  assert.equal(result.descriptionInputValue, 'Description 4')
  assert.equal(result.selectedPreviewImage, 'https://cdn/img-4.jpg')
})

test('buildLoadedEditWorkspaceState restores draft overrides when an edit draft exists', () => {
  const result = buildLoadedEditWorkspaceState({
    apiProduct: {
      id: 7,
      nom: 'Produit 7',
      description: 'Description API',
      imageUrl: 'https://cdn/api.jpg',
      categorie: { id: 3, libelle: 'Cuisine' },
    },
    draft: {
      form: {
        nom: 'Produit 7 modifie',
        description: 'Description draft',
        imageUrl: 'https://cdn/draft.jpg',
        imageUrlsText: 'https://cdn/draft.jpg',
        prixAchat: '15',
        prix: '25',
        promotionActive: false,
        promotionPercent: '',
        stock: '3',
        categorieId: '3',
      },
      initialForm: { nom: 'snapshot' },
      descriptionInputValue: 'Description saisie',
      editCategoryDraft: 'Cuisine premium',
      selectedPreviewImage: 'https://cdn/preview.jpg',
    },
    listProduct: {
      id: 7,
      prixAchat: 15,
      prix: 25,
      stock: 3,
    },
  })

  assert.equal(result.editForm.nom, 'Produit 7 modifie')
  assert.equal(result.initialEditForm.nom, 'snapshot')
  assert.equal(result.editCategoryDraft, 'Cuisine premium')
  assert.equal(result.descriptionInputValue, 'Description saisie')
  assert.equal(result.selectedPreviewImage, 'https://cdn/preview.jpg')
})

test('buildLoadedEditWorkspaceState falls back to the catalog product when the detail endpoint is unavailable', () => {
  const result = buildLoadedEditWorkspaceState({
    apiProduct: null,
    draft: null,
    listProduct: {
      id: 11,
      nom: 'Produit Hors Ligne',
      description: 'Visible seulement dans le catalogue admin.',
      imageUrl: 'https://cdn/offline.jpg',
      categorie: { id: 5, libelle: 'Archive' },
      prixAchat: 30,
      prix: 55,
      promotionPercent: 0,
      stock: 2,
      published: false,
      rating: 4,
    },
  })

  assert.equal(result.editingProduct.id, 11)
  assert.equal(result.editingProduct.published, false)
  assert.equal(result.editForm.nom, 'Produit Hors Ligne')
  assert.equal(result.editCategoryDraft, 'Archive')
  assert.equal(result.descriptionInputValue, 'Visible seulement dans le catalogue admin.')
  assert.equal(result.selectedPreviewImage, 'https://cdn/offline.jpg')
})
