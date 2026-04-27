import {
  EMPTY_PRODUCT_FORM,
  EMPTY_PRODUCT_FORM_SNAPSHOT,
  EMPTY_PRODUCT_FORM_SNAPSHOT_JSON,
} from './constants.js'
import { buildEditFormSnapshot, getProductSelectionBuckets, resolveNextProductNavigation } from './utils.js'

export function buildUnsavedSelectionModalPayload(options = {}) {
  const draftIds = Array.from(new Set((options.draftIds || []).map((id) => String(id)).filter(Boolean)))
  const productIds = Array.from(new Set((options.productIds || []).map((id) => Number(id)).filter((id) => Number.isFinite(id))))

  if (draftIds.length === 0 && productIds.length === 0) {
    return null
  }

  return {
    isOpen: true,
    draftIds,
    productIds,
    label: String(options.label || ''),
  }
}

export function buildUnsavedSelectionResetState({
  currentOpenProductId,
  editDraftsByProductId,
  products,
  selectedProductIds,
  unsavedSelectionModalState,
}) {
  const productIds = Array.from(new Set(
    (unsavedSelectionModalState?.productIds || [])
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id))
  ))
  const draftIds = Array.from(new Set(
    (unsavedSelectionModalState?.draftIds || [])
      .map((id) => String(id))
      .filter(Boolean)
  ))
  const shouldNavigate = productIds.includes(Number(currentOpenProductId))

  return {
    draftIds,
    productIds,
    shouldNavigate,
    nextNavigation: resolveNextProductNavigation({
      editDraftsByProductId,
      excludedProductIds: productIds,
      products,
      selectedProductIds,
    }),
  }
}

export function buildCreateWorkspaceState({ createProductDraft, mode = 'single' }) {
  const firstDraft = createProductDraft()
  const nextDrafts = mode === 'multiple'
    ? [firstDraft, createProductDraft()]
    : [firstDraft]

  return {
    activeCreateDraftId: firstDraft.id,
    createDrafts: nextDrafts,
    createForm: firstDraft.form,
    createImageUrlDraft: '',
    createPreviewImage: '',
    createSnapshot: EMPTY_PRODUCT_FORM_SNAPSHOT,
    isClosingCreateWorkspace: false,
  }
}

export function buildCreateDraftRemovalState({
  activeCreateDraftId,
  createDrafts,
  draftId,
  savedCreateDraftIds,
}) {
  const isRemovingActiveDraft = String(draftId) === String(activeCreateDraftId || '')

  if (createDrafts.length <= 1) {
    return {
      activeCreateDraftId: null,
      createDrafts: [],
      createForm: EMPTY_PRODUCT_FORM,
      createImageUrlDraft: '',
      createSnapshot: EMPTY_PRODUCT_FORM_SNAPSHOT,
      isClosingCreateWorkspace: true,
      savedCreateDraftIds: [],
      selectedCreatePreviewImage: '',
      shouldNavigateToProducts: true,
    }
  }

  const nextDrafts = createDrafts.filter((draft) => draft.id !== draftId)
  const nextSavedCreateDraftIds = savedCreateDraftIds.filter((savedDraftId) => savedDraftId !== draftId)

  return {
    activeCreateDraftId: isRemovingActiveDraft ? null : activeCreateDraftId,
    createDrafts: nextDrafts,
    savedCreateDraftIds: nextSavedCreateDraftIds,
    shouldNavigateToProducts: isRemovingActiveDraft,
  }
}

export function buildPendingSelectionClearState({
  activeCreateDraftId,
  createDrafts,
  currentOpenProductId,
  editDraftsByProductId,
  isCreateSection,
  products,
  savedCreateDraftIds,
  selectedProductIds,
}) {
  const untouchedDraftIds = createDrafts
    .filter((draft) => !draft.persistedProductId && !savedCreateDraftIds.includes(draft.id))
    .filter((draft) => JSON.stringify(buildEditFormSnapshot(draft.form)) === EMPTY_PRODUCT_FORM_SNAPSHOT_JSON)
    .map((draft) => draft.id)

  const { pendingProducts } = getProductSelectionBuckets({
    editDraftsByProductId,
    products,
    selectedProductIds,
  })
  const untouchedProductIds = pendingProducts.map((product) => Number(product.id))
  const isCurrentPendingProduct = untouchedProductIds.includes(currentOpenProductId)
  const isCurrentPendingCreateDraft = Boolean(isCreateSection)
    && untouchedDraftIds.includes(String(activeCreateDraftId || ''))
  const nextNavigation = resolveNextProductNavigation({
    editDraftsByProductId,
    excludedProductIds: untouchedProductIds,
    products,
    selectedProductIds,
  })

  return {
    nextNavigation,
    shouldNavigate: isCurrentPendingProduct || isCurrentPendingCreateDraft,
    shouldResetCreateDraft: isCurrentPendingCreateDraft,
    untouchedDraftIds,
    untouchedProductIds,
  }
}
