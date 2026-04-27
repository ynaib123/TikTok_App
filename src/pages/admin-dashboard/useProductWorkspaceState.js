import { useCallback, useState } from 'react'
import {
  EMPTY_PRODUCT_FORM,
  EMPTY_PRODUCT_FORM_SNAPSHOT,
  PRODUCT_CREATE_ACTIVE_DRAFT_STORAGE_KEY,
  PRODUCT_CREATE_DRAFTS_STORAGE_KEY,
  PRODUCT_CREATE_SAVED_DRAFTS_STORAGE_KEY,
} from './constants.js'
import useProductCreateDraftWorkspace from './useProductCreateDraftWorkspace.js'
import useProductSelectionWorkspace from './useProductSelectionWorkspace.js'
import useDebouncedStorageEffect from './useDebouncedStorageEffect.js'
import {
  readStoredCreateDrafts,
  readStoredIdArray,
  readStoredRawValue,
} from './productPageState.js'

export default function useProductWorkspaceState({
  categories,
  editDraftsByProductId,
  isCreateSection,
  navigate,
  pageType,
  productId,
  products,
  setCreateCategoryDraft,
  setCreateForm,
  setCreateImageUrlDraft,
  setEditDraftsByProductId,
  setError,
  setInitialCreateForm,
  setSelectedCreatePreviewImage,
}) {
  const [createDrafts, setCreateDrafts] = useState(() => readStoredCreateDrafts(PRODUCT_CREATE_DRAFTS_STORAGE_KEY))
  const [activeCreateDraftId, setActiveCreateDraftId] = useState(() => readStoredRawValue(PRODUCT_CREATE_ACTIVE_DRAFT_STORAGE_KEY))
  const [savedCreateDraftIds, setSavedCreateDraftIds] = useState(() => readStoredIdArray(PRODUCT_CREATE_SAVED_DRAFTS_STORAGE_KEY))
  const [isClosingCreateWorkspace, setIsClosingCreateWorkspace] = useState(false)

  useDebouncedStorageEffect({
    delay: 0,
    key: PRODUCT_CREATE_DRAFTS_STORAGE_KEY,
    value: createDrafts,
  })

  useDebouncedStorageEffect({
    delay: 0,
    key: PRODUCT_CREATE_SAVED_DRAFTS_STORAGE_KEY,
    value: savedCreateDraftIds,
  })

  useDebouncedStorageEffect({
    delay: 0,
    key: PRODUCT_CREATE_ACTIVE_DRAFT_STORAGE_KEY,
    removeWhenNull: true,
    serialize: 'raw',
    value: activeCreateDraftId,
  })

  const resetCreateWorkspaceView = useCallback(() => {
    setCreateForm(EMPTY_PRODUCT_FORM)
    setInitialCreateForm(EMPTY_PRODUCT_FORM_SNAPSHOT)
    setCreateCategoryDraft('')
    setCreateImageUrlDraft('')
    setSelectedCreatePreviewImage('')
    setError(null)
  }, [
    setCreateCategoryDraft,
    setCreateForm,
    setCreateImageUrlDraft,
    setError,
    setInitialCreateForm,
    setSelectedCreatePreviewImage,
  ])

  const createDraftWorkspace = useProductCreateDraftWorkspace({
    activeCreateDraftId,
    categories,
    createDrafts,
    isClosingCreateWorkspace,
    isCreateSection,
    navigate,
    savedCreateDraftIds,
    setActiveCreateDraftId,
    setCreateCategoryDraft,
    setCreateDrafts,
    setCreateForm,
    setCreateImageUrlDraft,
    setError,
    setInitialCreateForm,
    setIsClosingCreateWorkspace,
    setSavedCreateDraftIds,
    setSelectedCreatePreviewImage,
    resetCreateWorkspaceView,
  })

  const selectionWorkspace = useProductSelectionWorkspace({
    activeCreateDraftId,
    createDrafts,
    editDraftsByProductId,
    isCreateSection,
    navigate,
    pageType,
    productId,
    products,
    resetCreateWorkspaceView,
    savedCreateDraftIds,
    setActiveCreateDraftId,
    setCreateDrafts,
    setEditDraftsByProductId,
    setError,
    setIsClosingCreateWorkspace,
    setSavedCreateDraftIds,
  })

  return {
    activeCreateDraft: createDraftWorkspace.activeCreateDraft,
    activeCreateDraftId,
    clearPendingSelectedProducts: selectionWorkspace.clearPendingSelectedProducts,
    closeUnsavedSelectionModal: selectionWorkspace.closeUnsavedSelectionModal,
    createDrafts,
    deleteModalState: selectionWorkspace.deleteModalState,
    handleAddCreateDraft: createDraftWorkspace.handleAddCreateDraft,
    handleClearPendingSelection: selectionWorkspace.handleClearPendingSelection,
    handleRemoveCreateDraft: createDraftWorkspace.handleRemoveCreateDraft,
    handleRemovePendingSelectedProduct: selectionWorkspace.handleRemovePendingSelectedProduct,
    handleSelectCreateDraft: createDraftWorkspace.handleSelectCreateDraft,
    managedEditProductId: selectionWorkspace.managedEditProductId,
    modificationProductIds: selectionWorkspace.modificationProductIds,
    openDeleteProductsModal: selectionWorkspace.openDeleteProductsModal,
    openProductCreateWorkspace: createDraftWorkspace.openProductCreateWorkspace,
    openProductModificationWorkspace: selectionWorkspace.openProductModificationWorkspace,
    openUnsavedSelectionModal: selectionWorkspace.openUnsavedSelectionModal,
    pendingCreateDrafts: createDraftWorkspace.pendingCreateDrafts,
    savedCreateDraftIds,
    selectAllFilteredProducts: selectionWorkspace.selectAllFilteredProducts,
    selectedProductIds: selectionWorkspace.selectedProductIds,
    setActiveCreateDraftId,
    setCreateDrafts,
    setDeleteModalState: selectionWorkspace.setDeleteModalState,
    setIsClosingCreateWorkspace,
    setManagedEditProductId: selectionWorkspace.setManagedEditProductId,
    setModificationProductIds: selectionWorkspace.setModificationProductIds,
    setSavedCreateDraftIds,
    setSelectedProductIds: selectionWorkspace.setSelectedProductIds,
    toggleSelectedProductId: selectionWorkspace.toggleSelectedProductId,
    unsavedSelectionModalState: selectionWorkspace.unsavedSelectionModalState,
  }
}
