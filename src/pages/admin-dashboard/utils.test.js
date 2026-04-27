import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveNextProductNavigation } from './utils.js'

const products = [
  { id: 1, nom: 'Produit 1' },
  { id: 2, nom: 'Produit 2' },
  { id: 3, nom: 'Produit 3' },
]

test('resolveNextProductNavigation prioritise dirty products before pending and saved', () => {
  const result = resolveNextProductNavigation({
    editDraftsByProductId: {
      2: {
        form: { nom: 'Produit 2 modifie' },
        initialForm: { nom: 'Produit 2' },
      },
    },
    products,
    selectedProductIds: [1, 2],
  })

  assert.equal(result.product?.id, 2)
  assert.equal(result.targetPath, '/products/2/edit#product-details')
})

test('resolveNextProductNavigation can exclude the current product and fall back to pending', () => {
  const result = resolveNextProductNavigation({
    editDraftsByProductId: {
      2: {
        form: { nom: 'Produit 2 modifie' },
        initialForm: { nom: 'Produit 2' },
      },
    },
    excludedProductIds: [2],
    products,
    selectedProductIds: [1, 2],
  })

  assert.equal(result.product?.id, 1)
  assert.equal(result.targetPath, '/products/1/edit#product-details')
})

test('resolveNextProductNavigation returns products list page when nothing remains', () => {
  const result = resolveNextProductNavigation({
    editDraftsByProductId: {},
    excludedProductIds: [1, 2, 3],
    products,
    selectedProductIds: [1, 2],
  })

  assert.equal(result.product, null)
  assert.equal(result.targetPath, '/products')
})
