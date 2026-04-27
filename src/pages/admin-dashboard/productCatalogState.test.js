import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildProductCategoryOptions,
  buildProductFilterSummary,
  filterProducts,
  paginateProducts,
  sortProducts,
} from './productCatalogState.js'

test('filterProducts combines search, category and stock filters', () => {
  const products = [
    { id: 1, nom: 'Lampe Nord', description: 'Bureau', stock: 8, published: true, categorie: { id: 3, libelle: 'Maison' } },
    { id: 2, nom: 'Souris Pro', description: 'Tech bureau', stock: 0, published: true, categorie: { id: 8, libelle: 'Tech' } },
    { id: 3, nom: 'Clavier Air', description: 'Tech mobile', stock: 3, published: false, categorie: { id: 8, libelle: 'Tech' } },
  ]

  const result = filterProducts(products, {
    productCategoryFilter: '8',
    productPublishStatusFilter: 'offline',
    productSearch: 'tech',
    productStockFilter: 'low',
  })

  assert.deepEqual(result.map((product) => product.id), [3])
})

test('sortProducts supports recent and name ordering', () => {
  const products = [
    { id: 2, nom: 'Bravo' },
    { id: 9, nom: 'Alpha' },
    { id: 5, nom: 'Charlie' },
  ]

  assert.deepEqual(sortProducts(products, 'recent').map((product) => product.id), [9, 5, 2])
  assert.deepEqual(sortProducts(products, 'name_asc').map((product) => product.nom), ['Alpha', 'Bravo', 'Charlie'])
})

test('paginateProducts slices the current page deterministically', () => {
  const products = Array.from({ length: 8 }, (_, index) => ({ id: index + 1 }))
  assert.deepEqual(paginateProducts(products, 2, 3).map((product) => product.id), [4, 5, 6])
})

test('buildProductCategoryOptions prefers categories but can fall back to products', () => {
  const fallbackOptions = buildProductCategoryOptions([], [
    { categorie: { id: 8, libelle: 'Tech' } },
    { categorie: { id: 8, libelle: 'Tech' } },
    { categorie: { id: 3, libelle: 'Maison' } },
  ])
  const categoryOptions = buildProductCategoryOptions([
    { id: 3, libelle: 'Maison' },
    { id: 8, libelle: 'Tech' },
  ], [])

  assert.deepEqual(fallbackOptions, [
    { value: 'all', label: 'Toutes categories' },
    { value: '8', label: 'Tech' },
    { value: '3', label: 'Maison' },
  ])
  assert.deepEqual(categoryOptions, [
    { value: 'all', label: 'Toutes categories' },
    { value: '3', label: 'Maison' },
    { value: '8', label: 'Tech' },
  ])
})

test('buildProductFilterSummary stays readable for active filters', () => {
  assert.equal(buildProductFilterSummary({
    productCategoryFilter: 'all',
    productPublishStatusFilter: 'all',
    productStockFilter: 'all',
    selectedProductCategory: { label: 'Toutes categories' },
    selectedProductPublishStatusFilter: { label: 'Tous les statuts' },
    selectedProductStockFilter: { label: 'Tous les stocks' },
  }), 'Aucun filtre')

  assert.equal(buildProductFilterSummary({
    productCategoryFilter: '8',
    productPublishStatusFilter: 'offline',
    productStockFilter: 'low',
    selectedProductCategory: { label: 'Tech' },
    selectedProductPublishStatusFilter: { label: 'Hors ligne' },
    selectedProductStockFilter: { label: 'Stock faible' },
  }), 'Tech • Stock faible • Hors ligne')
})
