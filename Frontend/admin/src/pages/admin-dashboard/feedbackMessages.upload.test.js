import test from 'node:test'
import assert from 'node:assert/strict'

import {
  normalizeUploadError,
  productImageFileTypeMessage,
  productImageInvalidFileMessage,
  productImageUrlMessage,
} from './feedbackMessages.js'

test('normalizeUploadError explains unsupported local image format', () => {
  assert.equal(
    normalizeUploadError("Format d'image non supporte. Utilisez JPG, PNG, WEBP ou GIF.", 'fallback'),
    productImageFileTypeMessage()
  )
})

test('normalizeUploadError explains invalid image file', () => {
  assert.equal(
    normalizeUploadError("Impossible de lire les dimensions de l'image.", 'fallback'),
    productImageInvalidFileMessage()
  )
})

test('productImageUrlMessage explains invalid remote image URL', () => {
  assert.equal(
    productImageUrlMessage(),
    "L'image doit être une URL valide commençant par http:// ou https://."
  )
})
