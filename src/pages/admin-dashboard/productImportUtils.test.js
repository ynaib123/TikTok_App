import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildImportedProductDrafts,
  collectImportedCategoryLabels,
  resolveImportedCategoryId,
} from './productImportUtils.js'

test('resolveImportedCategoryId matches category ids and labels', () => {
  const categories = [
    { id: 3, libelle: 'Maison' },
    { id: 8, libelle: 'Tech' },
  ]

  assert.equal(resolveImportedCategoryId('8', categories), '8')
  assert.equal(resolveImportedCategoryId('maison', categories), '3')
  assert.equal(resolveImportedCategoryId('Inconnue', categories), '')
})

test('buildImportedProductDrafts maps imported rows into product drafts', () => {
  const rows = [
    {
      Nom: 'Lampe Nord',
      Description: 'Lampe de bureau',
      Categorie: 'Maison',
      'Prix achat': '120',
      Prix: '189',
      Promo: '10',
      Stock: '8',
      Image: 'https://cdn.test/lampe-cover.jpg',
      Images: 'https://cdn.test/lampe-1.jpg;https://cdn.test/lampe-2.jpg',
    },
    {
      name: 'Souris Pro',
      categoryId: '8',
      purchase_price: '40',
      sale_price: '65',
      quantity: '14',
    },
    {
      Nom: '',
      Description: '',
    },
  ]

  let sequence = 0
  const result = buildImportedProductDrafts({
    rows,
    categories: [
      { id: 3, libelle: 'Maison' },
      { id: 8, libelle: 'Tech' },
    ],
    createDraft: () => ({
      id: `draft-${sequence += 1}`,
      form: {},
      selectedPreviewImage: '',
      persistedProductId: null,
    }),
  })

  assert.equal(result.importedCount, 2)
  assert.equal(result.skippedRowCount, 1)
  assert.equal(result.drafts[0].form.nom, 'Lampe Nord')
  assert.equal(result.drafts[0].form.categorieId, '3')
  assert.equal(result.drafts[0].form.promotionActive, true)
  assert.equal(result.drafts[0].selectedPreviewImage, 'https://cdn.test/lampe-cover.jpg')
  assert.equal(result.drafts[0].form.imageUrlsText, 'https://cdn.test/lampe-cover.jpg\nhttps://cdn.test/lampe-1.jpg\nhttps://cdn.test/lampe-2.jpg')
  assert.equal(result.drafts[1].form.nom, 'Souris Pro')
  assert.equal(result.drafts[1].form.categorieId, '8')
  assert.equal(result.drafts[1].form.prixAchat, '40')
})

test('collectImportedCategoryLabels returns unique non-empty category labels', () => {
  const rows = [
    { Categorie: 'Maison' },
    { category: 'Tech' },
    { categoryLabel: 'maison' },
    { Categorie: '' },
    {},
  ]

  assert.deepEqual(collectImportedCategoryLabels(rows), ['Maison', 'Tech'])
})
