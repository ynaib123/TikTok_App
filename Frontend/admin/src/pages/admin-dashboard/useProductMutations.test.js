import test from 'node:test'
import assert from 'node:assert/strict'
import {
  applyImageListMutation,
  buildProductFormState,
  buildProductMutationPayload,
  getNormalizedImageUrls,
  normalizePersistedProduct,
} from './productMutationState.js'

test('getNormalizedImageUrls merges primary image and removes duplicates', () => {
  const result = getNormalizedImageUrls('https://cdn/img-1.jpg\nhttps://cdn/img-2.jpg\nhttps://cdn/img-1.jpg', 'https://cdn/img-0.jpg')

  assert.deepEqual(result, [
    'https://cdn/img-0.jpg',
    'https://cdn/img-1.jpg',
    'https://cdn/img-2.jpg',
  ])
})

test('applyImageListMutation returns normalized image form values', () => {
  const result = applyImageListMutation('https://cdn/img-1.jpg\nhttps://cdn/img-2.jpg', (currentUrls) => [
    currentUrls[1],
    currentUrls[0],
    'https://cdn/img-2.jpg',
  ])

  assert.deepEqual(result, {
    imageUrl: 'https://cdn/img-2.jpg',
    imageUrls: ['https://cdn/img-2.jpg', 'https://cdn/img-1.jpg'],
    imageUrlsText: 'https://cdn/img-2.jpg\nhttps://cdn/img-1.jpg',
  })
})

test('buildProductMutationPayload trims fields and derives promotion state from percent', () => {
  const result = buildProductMutationPayload({
    form: {
      nom: '  Produit Pro  ',
      description: '  Description  ',
      imageUrl: '',
      imageUrlsText: 'https://cdn/img-1.jpg\nhttps://cdn/img-2.jpg',
      prixAchat: '42',
      prix: '99',
      promotionPercent: '15',
      stock: '8',
    },
    category: { id: 3, libelle: 'Accessoires' },
    productId: 12,
  })

  assert.deepEqual(result, {
    id: 12,
    nom: 'Produit Pro',
    description: 'Description',
    imageUrl: 'https://cdn/img-1.jpg',
    imageUrls: ['https://cdn/img-1.jpg', 'https://cdn/img-2.jpg'],
    prixAchat: 42,
    prix: 99,
    promotionActive: true,
    promotionPercent: 15,
    stock: 8,
    categorieId: 3,
    categorie: { id: 3, libelle: 'Accessoires' },
  })
})

test('normalizePersistedProduct and buildProductFormState keep API fallbacks stable', () => {
  const normalizedProduct = normalizePersistedProduct({
    id: 5,
    nom: 'Produit 5',
    imageUrl: 'https://cdn/img-1.jpg',
    imageUrls: ['https://cdn/img-2.jpg'],
    categorie: { id: 7, libelle: 'Maison' },
  }, {
    prixAchat: 10,
    prix: 25,
    promotionPercent: 20,
    stock: 4,
    rating: 3.7,
  })

  assert.deepEqual(buildProductFormState(normalizedProduct), {
    nom: 'Produit 5',
    description: '',
    imageUrl: 'https://cdn/img-1.jpg',
    imageUrlsText: 'https://cdn/img-1.jpg\nhttps://cdn/img-2.jpg',
    prixAchat: '10',
    prix: '25',
    promotionActive: true,
    promotionPercent: '20',
    stock: '4',
    rating: '3.7',
    categorieId: '7',
  })
})
