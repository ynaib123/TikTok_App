import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildCategoryCardPresentation,
  buildCategoryWorkspacePresentation,
} from './categoryPresentationState.js'

test('buildCategoryCardPresentation shapes category usage for the UI', () => {
  const result = buildCategoryCardPresentation({
    id: 4,
    libelle: 'Gaming',
    productCount: 12,
    onlineProductCount: 5,
  })

  assert.equal(result.label, 'Gaming')
  assert.equal(result.densityTone, 'is-online')
  assert.equal(result.usageLabel, '12 produits')
  assert.equal(result.selectionMetaLabel, 'Identifiant #4 • 5 en ligne')
})

test('buildCategoryWorkspacePresentation summarizes active and selected categories', () => {
  const result = buildCategoryWorkspacePresentation({
    activeCategory: { id: 8, libelle: 'Audio' },
    selectedCategoryCount: 3,
    totalCategoryCount: 12,
  })

  assert.equal(result.heroTitle, 'Audio')
  assert.equal(result.heroSubtitle, 'Categorie #8')
  assert.equal(result.selectionSummary, '3 selectionnes')
})
