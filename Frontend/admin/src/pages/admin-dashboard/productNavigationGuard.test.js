import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildUnsavedProductChangesMessage,
  buildUnsavedProductChangesState,
  resolveProductNavigationPolicy,
} from './productNavigationGuard.js'

test('buildUnsavedProductChangesState detects pending drafts and edits', () => {
  const result = buildUnsavedProductChangesState({
    dirtyCreateDrafts: [{ id: 'draft-1' }],
    dirtySelectedProductsForSidebar: [{ id: 7 }],
  })

  assert.equal(result.hasUnsavedChanges, true)
  assert.equal(result.dirtyCreateCount, 1)
  assert.equal(result.dirtyEditCount, 1)
})

test('buildUnsavedProductChangesMessage summarizes pending product work', () => {
  const message = buildUnsavedProductChangesMessage({
    dirtyCreateCount: 2,
    dirtyEditCount: 1,
    isImportModalOpen: true,
  })

  assert.match(message, /2 brouillons de creation/)
  assert.match(message, /1 produit modifie/)
  assert.match(message, /importation en cours/)
})

test('buildUnsavedProductChangesState treats an open import modal as unsaved work', () => {
  const result = buildUnsavedProductChangesState({
    isImportModalOpen: true,
  })

  assert.equal(result.hasUnsavedChanges, true)
  assert.equal(result.isImportModalOpen, true)
})

test('buildUnsavedProductChangesState also tracks current form dirty flags', () => {
  const result = buildUnsavedProductChangesState({
    isCreateDirty: true,
    isEditDirty: false,
  })

  assert.equal(result.hasUnsavedChanges, true)
  assert.equal(result.dirtyCreateCount, 0)
  assert.equal(result.dirtyEditCount, 0)
})

test('buildUnsavedProductChangesMessage falls back to a generic warning when no detail is available', () => {
  const message = buildUnsavedProductChangesMessage({})

  assert.match(message, /modifications non sauvegardees/)
})

test('resolveProductNavigationPolicy keeps in-app admin navigation direct', () => {
  const result = resolveProductNavigationPolicy({
    hasSelectionReset: true,
    hasUnsavedChanges: true,
    intent: 'open-create-workspace',
  })

  assert.equal(result, 'allow')
})

test('resolveProductNavigationPolicy opens the internal modal for selection reset actions', () => {
  const result = resolveProductNavigationPolicy({
    hasSelectionReset: true,
    hasUnsavedChanges: true,
    intent: 'selection-reset',
  })

  assert.equal(result, 'open-selection-modal')
})

test('resolveProductNavigationPolicy reserves browser confirm for leaving admin workspace', () => {
  const result = resolveProductNavigationPolicy({
    hasUnsavedChanges: true,
    intent: 'leave-admin',
  })

  assert.equal(result, 'confirm-browser')
})

test('resolveProductNavigationPolicy allows selection reset actions when nothing is pending', () => {
  const result = resolveProductNavigationPolicy({
    hasSelectionReset: false,
    hasUnsavedChanges: false,
    intent: 'selection-reset',
  })

  assert.equal(result, 'allow')
})
