import { PRODUCT_MANAGEMENT_SUBSECTION_IDS } from './constants.js'
import {
  collectDirtyEditDraftProductIds,
  isCreateDraftDirty,
} from './productDraftDomain.js'

export function readStoredEditDrafts(storageKey) {
  if (typeof window === 'undefined') return {}

  try {
    const storedValue = window.localStorage.getItem(storageKey)
    const parsedValue = storedValue ? JSON.parse(storedValue) : {}
    if (!parsedValue || typeof parsedValue !== 'object' || Array.isArray(parsedValue)) return {}

    return Object.fromEntries(
      Object.entries(parsedValue).filter(([storedProductId, draft]) => (
        storedProductId
        && draft
        && typeof draft === 'object'
        && draft.form
        && draft.initialForm
      ))
    )
  } catch {
    return {}
  }
}

function normalizeStoredCreateDraft(candidateDraft) {
  if (!candidateDraft || typeof candidateDraft !== 'object' || Array.isArray(candidateDraft)) return null

  const draftId = String(candidateDraft.id || '').trim()
  if (!draftId) return null

  const form = candidateDraft.form
  if (!form || typeof form !== 'object' || Array.isArray(form)) return null

  return {
    id: draftId,
    form: { ...form },
    selectedPreviewImage: String(candidateDraft.selectedPreviewImage || ''),
    persistedProductId: Number.isFinite(Number(candidateDraft.persistedProductId))
      ? Number(candidateDraft.persistedProductId)
      : null,
  }
}

export function readStoredCreateDrafts(storageKey) {
  if (typeof window === 'undefined') return []

  try {
    const storedValue = window.localStorage.getItem(storageKey)
    const parsedValue = storedValue ? JSON.parse(storedValue) : []
    if (!Array.isArray(parsedValue)) return []

    return parsedValue
      .map(normalizeStoredCreateDraft)
      .filter(Boolean)
  } catch {
    return []
  }
}

export function readStoredIdArray(storageKey) {
  if (typeof window === 'undefined') return []

  try {
    const storedValue = window.localStorage.getItem(storageKey)
    const parsedValue = storedValue ? JSON.parse(storedValue) : []
    if (!Array.isArray(parsedValue)) return []

    return Array.from(new Set(
      parsedValue
        .map((candidateId) => String(candidateId || '').trim())
        .filter(Boolean)
    ))
  } catch {
    return []
  }
}

export function readStoredRawValue(storageKey) {
  if (typeof window === 'undefined') return null

  try {
    const storedValue = window.localStorage.getItem(storageKey)
    const normalizedValue = String(storedValue || '').trim()
    return normalizedValue || null
  } catch {
    return null
  }
}

export function resolveProductsActiveSectionId({ hash = '', pageType = 'products', productId = null }) {
  if (hash) {
    const hashSection = String(hash).replace('#', '')
    if (hashSection === 'edit-products' || hashSection === 'bulk-edit-products') return 'product-management'
    if (hashSection === 'bulk-add-products') return 'add-products'
    return hashSection
  }
  if (pageType === 'product-create') return 'add-products'
  if (pageType === 'product-edit' && productId) return 'product-details'
  return 'product-management'
}

export function collectDirtyDraftProductIds(editDraftsByProductId) {
  return collectDirtyEditDraftProductIds(editDraftsByProductId)
}

export function mergeProductIdsIntoSelection(selection, idsToMerge) {
  const currentIds = Array.isArray(selection) ? selection : []
  const nextIds = [...currentIds]
  let hasChanges = false

  ;(Array.isArray(idsToMerge) ? idsToMerge : []).forEach((draftProductId) => {
    if (!nextIds.includes(draftProductId)) {
      nextIds.push(draftProductId)
      hasChanges = true
    }
  })

  return hasChanges ? nextIds : currentIds
}

export function buildProductHydrationIds({
  deleteModalProductIds = [],
  editDraftsByProductId = {},
  managedEditProductId = null,
  resolvedEditProductId = null,
  selectedProductIds = [],
}) {
  return [
    ...(Array.isArray(selectedProductIds) ? selectedProductIds : []),
    ...Object.keys(editDraftsByProductId || {}).map((id) => Number(id)),
    ...(Array.isArray(deleteModalProductIds) ? deleteModalProductIds : []),
    resolvedEditProductId != null ? Number(resolvedEditProductId) : null,
    managedEditProductId != null ? Number(managedEditProductId) : null,
  ].filter((id) => Number.isFinite(id))
}

export function buildProductCreateDirtyState({
  createDrafts = [],
  currentCreateSnapshot = null,
  initialCreateSnapshot = null,
  isCreateSection = false,
  savedCreateDraftIds = [],
}) {
  if (!isCreateSection) return false

  return createDrafts.some((draft) => isCreateDraftDirty(draft, savedCreateDraftIds))
    || (createDrafts.length === 0 && initialCreateSnapshot != null && currentCreateSnapshot !== initialCreateSnapshot)
}

export function resolveProductSelectionSidebarVisibility({ locationHash = '', pageType = 'products' }) {
  if (pageType === 'product-edit' || pageType === 'product-create') return true

  const activeHashSection = locationHash ? locationHash.replace('#', '') : ''
  return pageType === 'products'
    && (
      activeHashSection === 'product-management'
      || PRODUCT_MANAGEMENT_SUBSECTION_IDS.includes(activeHashSection)
      || !activeHashSection
    )
}
