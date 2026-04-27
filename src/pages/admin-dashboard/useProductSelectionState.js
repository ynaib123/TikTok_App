import { useMemo } from 'react'
import {
  buildCreateSelectionStateByDraftId,
  buildEditSelectionStateByProductId,
  splitCreateDraftSelectionGroups,
  splitProductSelectionGroups,
} from './productSelectionState.js'

export default function useProductSelectionState({
  createDrafts,
  editDraftsByProductId,
  isEditDirty,
  isEditWorkspaceActive,
  loadedEditProductId,
  pendingCreateDrafts,
  savedCreateDraftIds,
  selectedProductsForSidebar,
}) {
  const editSelectionStateByProductId = useMemo(() => buildEditSelectionStateByProductId({
    editDraftsByProductId,
    isEditDirty,
    isEditWorkspaceActive,
    loadedEditProductId,
  }), [editDraftsByProductId, isEditDirty, isEditWorkspaceActive, loadedEditProductId])

  const createSelectionStateByDraftId = useMemo(() => buildCreateSelectionStateByDraftId({
    createDrafts,
    savedCreateDraftIds,
  }), [createDrafts, savedCreateDraftIds])

  const { pendingDrafts: untouchedCreateDrafts, dirtyDrafts: dirtyCreateDrafts } = useMemo(() => (
    splitCreateDraftSelectionGroups({
      createSelectionStateByDraftId,
      pendingCreateDrafts,
    })
  ), [createSelectionStateByDraftId, pendingCreateDrafts])

  const { pendingProducts: untouchedSelectedProductsForSidebar, dirtyProducts: dirtySelectedProductsForSidebar } = useMemo(() => (
    splitProductSelectionGroups({
      editSelectionStateByProductId,
      selectedProductsForSidebar,
    })
  ), [editSelectionStateByProductId, selectedProductsForSidebar])

  const selectionSummary = useMemo(() => ({
    pendingCount: untouchedCreateDrafts.length + untouchedSelectedProductsForSidebar.length,
    dirtyCount: dirtyCreateDrafts.length + dirtySelectedProductsForSidebar.length,
    totalCount: untouchedCreateDrafts.length + untouchedSelectedProductsForSidebar.length + dirtyCreateDrafts.length + dirtySelectedProductsForSidebar.length,
  }), [
    dirtyCreateDrafts.length,
    dirtySelectedProductsForSidebar.length,
    untouchedCreateDrafts.length,
    untouchedSelectedProductsForSidebar.length,
  ])

  return {
    createSelectionStateByDraftId,
    dirtyCreateDrafts,
    dirtySelectedProductsForSidebar,
    editSelectionStateByProductId,
    selectionSummary,
    untouchedCreateDrafts,
    untouchedSelectedProductsForSidebar,
  }
}
