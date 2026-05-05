import test from 'node:test'
import assert from 'node:assert/strict'

import {
  getProductFormValidationMessage,
  normalizeProductValidationError,
} from './feedbackMessages.js'

test('getProductFormValidationMessage rejects more than 4 product images', () => {
  const result = getProductFormValidationMessage({
    nom: 'Produit test',
    description: 'Description test',
    prixAchat: '10',
    prix: '20',
    promotionPercent: '0',
    stock: '5',
    categorieId: '2',
    imageUrl: 'https://cdn/img-1.jpg',
    imageUrlsText: [
      'https://cdn/img-1.jpg',
      'https://cdn/img-2.jpg',
      'https://cdn/img-3.jpg',
      'https://cdn/img-4.jpg',
      'https://cdn/img-5.jpg',
    ].join('\n'),
  })

  assert.equal(result, 'Un produit ne peut pas avoir plus de 4 images.')
})

test('getProductFormValidationMessage requires description, category and at least one image', () => {
  assert.equal(getProductFormValidationMessage({
    nom: 'Produit test',
    description: '',
    prixAchat: '10',
    prix: '20',
    promotionPercent: '0',
    stock: '5',
    categorieId: '2',
    imageUrl: '',
    imageUrlsText: 'https://cdn/img-1.jpg',
  }), 'La description du produit est obligatoire.')

  assert.equal(getProductFormValidationMessage({
    nom: 'Produit test',
    description: 'Description test',
    prixAchat: '10',
    prix: '20',
    promotionPercent: '0',
    stock: '5',
    categorieId: '',
    imageUrl: '',
    imageUrlsText: 'https://cdn/img-1.jpg',
  }), 'La catégorie est obligatoire.')

  assert.equal(getProductFormValidationMessage({
    nom: 'Produit test',
    description: 'Description test',
    prixAchat: '10',
    prix: '20',
    promotionPercent: '0',
    stock: '5',
    categorieId: '2',
    imageUrl: '',
    imageUrlsText: '',
  }), 'Ajoutez au moins une photo du produit.')
})

test('normalizeProductValidationError maps backend category and image validation errors', () => {
  assert.equal(
    normalizeProductValidationError('Validation failed for field=categorySelectionValid, propertyPath=categorySelectionValid', 'fallback'),
    'Sélectionnez une catégorie valide.'
  )

  assert.equal(
    normalizeProductValidationError('Validation failed for field=imageUrls, propertyPath=imageUrls', 'fallback'),
    'Ajoutez au moins une photo du produit.'
  )
})
