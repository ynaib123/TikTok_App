import { useCallback, useMemo } from 'react'
import {
  buildProductWorkspaceModel,
  collectDirtyEditDraftProductIds,
} from './productDraftDomain.js'
import { mergeProductIdsIntoSelection } from './productPageState.js'

export function buildAdminProductPageDerivedState({
  activeSectionId,
  editDraftsByProductId,
  managedEditProductId,
  pageType,
  productImportModalOpen,
  products,
  selectedProductIds,
  workspaceState,
}) {
  const dirtyDraftProductIds = collectDirtyEditDraftProductIds(editDraftsByProductId)
  const effectiveSelectedProductIds = mergeProductIdsIntoSelection(selectedProductIds, dirtyDraftProductIds)
  const productWorkspaceModel = buildProductWorkspaceModel({
    createDrafts: workspaceState.createDrafts,
    editDraftsByProductId,
    products,
    savedCreateDraftIds: workspaceState.savedCreateDraftIds,
    selectedProductIds: effectiveSelectedProductIds,
    uiState: {
      activeCreateDraftId: workspaceState.activeCreateDraftId,
      activeSectionId,
      managedEditProductId,
      pageType,
      productImportModalOpen,
    },
  })

  return {
    dirtyDraftProductIds,
    effectiveSelectedProductIds,
    productWorkspaceModel,
  }
}

export default function useAdminProductPageDerived({
  activeSectionId,
  editDraftsByProductId,
  managedEditProductId,
  navigate,
  pageType,
  productImportModalOpen,
  products,
  productsById,
  selectedProductIds,
  workspaceState,
}) {
  const derivedState = useMemo(() => buildAdminProductPageDerivedState({
    activeSectionId,
    editDraftsByProductId,
    managedEditProductId,
    pageType,
    productImportModalOpen,
    products,
    selectedProductIds,
    workspaceState,
  }), [
    activeSectionId,
    editDraftsByProductId,
    managedEditProductId,
    pageType,
    productImportModalOpen,
    products,
    selectedProductIds,
    workspaceState,
  ])

  const mapProductIdsToProducts = useCallback((ids = []) => (
    ids
      .map((id) => productsById.get(Number(id)))
      .filter(Boolean)
  ), [productsById])

  const guardedNavigate = useCallback((to, options) => {
    navigate(to, options)
    return true
  }, [navigate])

  return {
    dirtyDraftProductIds: derivedState.dirtyDraftProductIds,
    effectiveSelectedProductIds: derivedState.effectiveSelectedProductIds,
    guardedNavigate,
    mapProductIdsToProducts,
    productWorkspaceModel: derivedState.productWorkspaceModel,
  }
}
