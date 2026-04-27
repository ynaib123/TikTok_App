import test from 'node:test'
import assert from 'node:assert/strict'
import { EMPTY_PRODUCT_FORM, EMPTY_PRODUCT_FORM_SNAPSHOT } from './constants.js'
import { resolveCreateWorkspaceState } from './useProductPersistenceMutations.js'

test('resolveCreateWorkspaceState reopens the first pending create draft', () => {
  const result = resolveCreateWorkspaceState({
    createDrafts: [
      { id: 'draft-a', form: { nom: 'A' }, selectedPreviewImage: 'a.jpg' },
      { id: 'draft-b', form: { nom: 'B' }, selectedPreviewImage: 'b.jpg' },
    ],
    savedCreateDraftIds: ['draft-a'],
  })

  assert.deepEqual(result, {
    activeCreateDraftId: 'draft-b',
    createForm: { nom: 'B' },
    initialCreateForm: EMPTY_PRODUCT_FORM_SNAPSHOT,
    selectedCreatePreviewImage: 'b.jpg',
  })
})

test('resolveCreateWorkspaceState resets to the empty workspace when every draft is already saved', () => {
  const result = resolveCreateWorkspaceState({
    createDrafts: [
      { id: 'draft-a', form: { nom: 'A' }, selectedPreviewImage: 'a.jpg' },
    ],
    savedCreateDraftIds: ['draft-a'],
  })

  assert.deepEqual(result, {
    activeCreateDraftId: null,
    createForm: EMPTY_PRODUCT_FORM,
    initialCreateForm: EMPTY_PRODUCT_FORM_SNAPSHOT,
    selectedCreatePreviewImage: '',
  })
})
