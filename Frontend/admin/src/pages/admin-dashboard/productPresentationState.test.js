import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildCreateFormPresentation,
  buildProductCardPresentation,
  buildProductCommerceMetrics,
  getPublishState,
  getStockTone,
} from './productPresentationState.js'

test('getStockTone and getPublishState normalize visual states', () => {
  assert.equal(getStockTone(0), 'stock-out')
  assert.equal(getStockTone(3), 'stock-low')
  assert.equal(getStockTone(12), 'stock-ok')
  assert.deepEqual(getPublishState({ published: false }), {
    isPublished: false,
    label: 'Hors ligne',
    tone: 'is-offline',
  })
})

test('buildProductCommerceMetrics centralizes price and stock calculations', () => {
  const result = buildProductCommerceMetrics({
    price: '120',
    promotionActive: true,
    promotionPercent: '25',
    purchasePrice: '50',
    stock: '4',
  })

  assert.equal(result.currentPrice, 90)
  assert.equal(result.marginValue, 40)
  assert.equal(result.stockCostValue, 200)
  assert.equal(result.stockSaleValue, 480)
  assert.equal(result.stockTone, 'stock-low')
})

test('buildProductCardPresentation and buildCreateFormPresentation expose consistent UI data', () => {
  const productPresentation = buildProductCardPresentation({
    id: 7,
    nom: 'Lampe',
    prix: 220,
    prixAchat: 90,
    promotionActive: true,
    promotionPercent: 10,
    stock: 9,
    published: true,
    categorie: { libelle: 'Maison' },
    rating: 4.4,
    imageUrl: 'https://cdn/lampe.jpg',
  })
  const createPresentation = buildCreateFormPresentation({
    prix: '220',
    prixAchat: '90',
    promotionPercent: '10',
    stock: '9',
  })

  assert.equal(productPresentation.categoryLabel, 'Maison')
  assert.equal(productPresentation.publishLabel, 'En ligne')
  assert.equal(productPresentation.stockTone, 'stock-ok')
  assert.equal(createPresentation.currentPrice, 198)
  assert.equal(createPresentation.marginValue, 108)
})
