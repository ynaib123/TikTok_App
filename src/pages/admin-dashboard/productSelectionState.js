import { isCreateDraftDirty, isEditDraftDirty } from './productDraftDomain.js'

export function buildEditSelectionStateByProductId({
  editDraftsByProductId,
  isEditDirty,
  isEditWorkspaceActive,
  loadedEditProductId,
}) {
  const map = {}

  Object.entries(editDraftsByProductId || {}).forEach(([productId, draft]) => {
    map[productId] = isEditDraftDirty(draft)
  })

  if (isEditWorkspaceActive && loadedEditProductId != null) {
    map[String(loadedEditProductId)] = isEditDirty
  }

  return map
}

export function buildCreateSelectionStateByDraftId({ createDrafts, savedCreateDraftIds }) {
  const map = {}

  createDrafts.forEach((draft) => {
    map[draft.id] = isCreateDraftDirty(draft, savedCreateDraftIds)
  })

  return map
}

export function splitProductSelectionGroups({ editSelectionStateByProductId, selectedProductsForSidebar }) {
  const pendingProducts = []
  const dirtyProducts = []

  selectedProductsForSidebar.forEach((product) => {
    if (editSelectionStateByProductId[String(product.id)]) {
      dirtyProducts.push(product)
    } else {
      pendingProducts.push(product)
    }
  })

  return {
    dirtyProducts,
    pendingProducts,
  }
}

export function splitCreateDraftSelectionGroups({ createSelectionStateByDraftId, pendingCreateDrafts }) {
  const pendingDrafts = []
  const dirtyDrafts = []

  pendingCreateDrafts.forEach((draft) => {
    if (createSelectionStateByDraftId[draft.id]) {
      dirtyDrafts.push(draft)
    } else {
      pendingDrafts.push(draft)
    }
  })

  return {
    dirtyDrafts,
    pendingDrafts,
  }
}
