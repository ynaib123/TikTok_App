import { useCallback, useEffect, useMemo } from 'react'
import { apiPost } from '../../services/adminApiClient'
import { EMPTY_PRODUCT_FORM, EMPTY_PRODUCT_FORM_SNAPSHOT } from './constants.js'
import { ADMIN_ERROR_MESSAGES } from './feedbackMessages.js'
import { appendStoredSessionActivity } from './sessionActivityStorage.js'
import useProductEditWorkspace from './useProductEditWorkspace.js'
import useAdminProductWorkspaceDerived from './useAdminProductWorkspaceDerived.js'
import { buildUnsavedSelectionResetState } from './productWorkspaceState.js'
import { buildProductSnapshot } from './productDraftDomain.js'
import {
  createSessionActivityEntry,
  getProductImage,
  normalizeImageUrlsText,
} from './utils.js'

export default function useAdminProductWorkspaceController({
  activeCreateDraftId,
  categories,
  createCategoryDraft,
  createDrafts,
  createForm,
  deleteModalState,
  descriptionInputValue,
  editCategoryDraft,
  editDraftsByProductId,
  editForm,
  editingProduct,
  initialCreateForm,
  initialEditForm,
  isCreateSection,
  locationHash,
  navigate,
  pageType,
  productId,
  products,
  productsById,
  savedCreateDraftIds,
  selectedPreviewImage,
  selectedProductIds,
  setActiveCreateDraftId,
  setCategories,
  setCreateCategoryDraft,
  setCreateDrafts,
  setCreateForm,
  setCreateImageUrlDraft,
  setDescriptionInputValue,
  setEditCategoryDraft,
  setEditDraftsByProductId,
  setEditForm,
  setEditingProduct,
  setError,
  setImageUrlDraft,
  setInitialEditForm,
  setIsCreatingCategory,
  setIsClosingCreateWorkspace,
  setLoading,
  setModificationProductIds,
  setSavedCreateDraftIds,
  setSelectedCreatePreviewImage,
  setSelectedPreviewImage,
  setSelectedProductIds,
  setInitialCreateForm,
  unsavedSelectionModalState,
  closeUnsavedSelectionModal,
  mapProductIdsToProducts,
  pendingCreateDrafts,
}) {
  const confirmUnsavedSelectionReset = useCallback(() => {
    const resetState = buildUnsavedSelectionResetState({
      currentOpenProductId: editingProduct?.id,
      editDraftsByProductId,
      products,
      selectedProductIds,
      unsavedSelectionModalState,
    })
    const currentEditingProductId = Number(editingProduct?.id)
    const isResettingCurrentEditProduct = Number.isFinite(currentEditingProductId) && resetState.productIds.includes(currentEditingProductId)
    const isResettingCurrentCreateDraft = isCreateSection
      && resetState.draftIds.includes(String(activeCreateDraftId || ''))

    if (isResettingCurrentEditProduct && initialEditForm) {
      const initialCategory = categories.find((category) => String(category?.id) === String(initialEditForm.categorieId)) || null
      const resetPreview = normalizeImageUrlsText(initialEditForm.imageUrlsText).split('\n').find(Boolean)
        || initialEditForm.imageUrl
        || getProductImage(editingProduct)

      setEditForm(initialEditForm)
      setEditCategoryDraft(initialCategory?.libelle ? String(initialCategory.libelle) : '')
      setDescriptionInputValue(String(initialEditForm.description || ''))
      setSelectedPreviewImage(resetPreview)
      setImageUrlDraft('')
    }

    if (resetState.draftIds.length > 0) {
      setCreateDrafts((prev) => prev.filter((draft) => !resetState.draftIds.includes(draft.id)))
      setSavedCreateDraftIds((prev) => prev.filter((id) => !resetState.draftIds.includes(id)))
    }

    if (isResettingCurrentCreateDraft) {
      setIsClosingCreateWorkspace(true)
      setActiveCreateDraftId(null)
      setCreateForm(EMPTY_PRODUCT_FORM)
      setInitialCreateForm(EMPTY_PRODUCT_FORM_SNAPSHOT)
      setCreateCategoryDraft('')
      setCreateImageUrlDraft('')
      setSelectedCreatePreviewImage('')
    }

    if (resetState.productIds.length > 0) {
      setEditDraftsByProductId((prev) => {
        const nextDrafts = { ...prev }
        resetState.productIds.forEach((productIdToReset) => {
          delete nextDrafts[String(productIdToReset)]
        })
        return nextDrafts
      })
      setSelectedProductIds((prev) => prev.filter((id) => !resetState.productIds.includes(Number(id))))
      setModificationProductIds((prev) => prev.filter((id) => !resetState.productIds.includes(Number(id))))
    }

    closeUnsavedSelectionModal()

    if (isResettingCurrentEditProduct) {
      navigate('/products', { replace: true })
      return
    }

    if (isResettingCurrentCreateDraft) {
      navigate('/products', { replace: true })
    }
  }, [
    activeCreateDraftId,
    categories,
    closeUnsavedSelectionModal,
    editDraftsByProductId,
    editingProduct,
    initialEditForm,
    isCreateSection,
    products,
    selectedProductIds,
    setActiveCreateDraftId,
    setCreateCategoryDraft,
    setCreateDrafts,
    setCreateForm,
    setCreateImageUrlDraft,
    setDescriptionInputValue,
    setEditCategoryDraft,
    setEditDraftsByProductId,
    setEditForm,
    setImageUrlDraft,
    setInitialCreateForm,
    setModificationProductIds,
    setSavedCreateDraftIds,
    setIsClosingCreateWorkspace,
    setSelectedCreatePreviewImage,
    setSelectedPreviewImage,
    setSelectedProductIds,
    unsavedSelectionModalState,
    navigate,
  ])

  const loadedEditProductId = useMemo(() => {
    const value = Number(editingProduct?.id)
    return Number.isFinite(value) ? value : null
  }, [editingProduct?.id])

  const appendProductSessionActivity = useCallback((entries) => {
    appendStoredSessionActivity(entries)
  }, [])

  const handleCreateEditCategory = useCallback(async () => {
    const libelle = String(editCategoryDraft || '').trim()

    if (!libelle) {
      setError(ADMIN_ERROR_MESSAGES.categoryNameRequired)
      return
    }

    const existingCategory = categories.find((category) => (
      String(category?.libelle || '').trim().toLowerCase() === libelle.toLowerCase()
    ))

    if (existingCategory) {
      setEditForm((prev) => ({ ...prev, categorieId: String(existingCategory.id) }))
      setEditCategoryDraft('')
      setError(null)
      return
    }

    setIsCreatingCategory(true)
    setError(null)

    try {
      const createdCategory = await apiPost('/categories', { libelle })
      setCategories((prev) => [createdCategory, ...prev.filter((category) => Number(category?.id) !== Number(createdCategory?.id))])
      setEditForm((prev) => ({ ...prev, categorieId: String(createdCategory?.id || '') }))
      setEditCategoryDraft('')
      appendProductSessionActivity(createSessionActivityEntry('Ajout', createdCategory, 'category'))
    } catch (err) {
      setError(err.message || ADMIN_ERROR_MESSAGES.createCategory)
    } finally {
      setIsCreatingCategory(false)
    }
  }, [appendProductSessionActivity, categories, editCategoryDraft, setCategories, setEditCategoryDraft, setEditForm, setError, setIsCreatingCategory])

  const {
    createDirtyFields,
    createImageUrls,
    currentEditDraft,
    currentEditListProduct,
    deferredEditDescription,
    deleteModalProducts,
    dirtyCreateDrafts,
    dirtySelectedProductsForSidebar,
    editDirtyFields,
    editImageUrls,
    editPreviewImage,
    editPreviewSidebarSlots,
    filteredCreateCategories,
    filteredEditCategories,
    isCreateDirty,
    isEditDirty,
    isEditWorkspaceActive,
    pendingSelectedProductIds,
    resolvedEditProductId,
    selectedCategory,
    selectedCreateCategory,
    selectedCreateCategoryLabel,
    selectedEditCategoryLabel,
    selectionSummary,
    showProductSelectionSidebar,
    untouchedCreateDrafts,
    untouchedSelectedProductsForSidebar,
    unsavedSelectionModalProducts,
  } = useAdminProductWorkspaceDerived({
    categories,
    createCategoryDraft,
    createDrafts,
    createForm,
    deleteModalState,
    descriptionInputValue,
    editCategoryDraft,
    editDraftsByProductId,
    editForm,
    editingProduct,
    initialCreateForm,
    initialEditForm,
    isCreateSection,
    loadedEditProductId,
    locationHash,
    mapProductIdsToProducts,
    pageType,
    pendingCreateDrafts,
    productId,
    productsById,
    savedCreateDraftIds,
    selectedPreviewImage,
    selectedProductIds,
    unsavedSelectionModalState,
  })

  useProductEditWorkspace({
    editDraft: currentEditDraft,
    listProduct: currentEditListProduct,
    pageType,
    resolvedEditProductId,
    setDescriptionInputValue,
    setEditCategoryDraft,
    setEditForm,
    setEditingProduct,
    setError,
    setInitialEditForm,
    setLoading,
    setSelectedPreviewImage,
  })

  useEffect(() => {
    if (!locationHash) return
    if (pageType !== 'dashboard') return

    const element = document.getElementById(locationHash.replace('#', ''))
    if (!element) return

    requestAnimationFrame(() => {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [locationHash, pageType])

  useEffect(() => {
    setDescriptionInputValue(String(editForm.description || ''))
  }, [editForm.description, editingProduct?.id, setDescriptionInputValue])

  useEffect(() => {
    if (descriptionInputValue === String(editForm.description || '')) return undefined

    const timeoutId = setTimeout(() => {
      setEditForm((prev) => (
        prev.description === descriptionInputValue
          ? prev
          : { ...prev, description: descriptionInputValue }
      ))
    }, 80)

    return () => clearTimeout(timeoutId)
  }, [descriptionInputValue, editForm.description, setEditForm])

  useEffect(() => {
    if (!loadedEditProductId || !initialEditForm) return

    const productKey = String(loadedEditProductId)
    const nextDraft = {
      form: editForm,
      initialForm: initialEditForm,
      descriptionInputValue,
      editCategoryDraft,
      selectedPreviewImage,
    }

    setEditDraftsByProductId((prev) => {
      const currentDraft = prev[productKey]
      if (
        currentDraft
        && JSON.stringify(currentDraft.form) === JSON.stringify(nextDraft.form)
        && buildProductSnapshot(currentDraft.initialForm) === buildProductSnapshot(nextDraft.initialForm)
        && String(currentDraft.descriptionInputValue || '') === String(nextDraft.descriptionInputValue || '')
        && String(currentDraft.editCategoryDraft || '') === String(nextDraft.editCategoryDraft || '')
        && String(currentDraft.selectedPreviewImage || '') === String(nextDraft.selectedPreviewImage || '')
      ) {
        return prev
      }

      return {
        ...prev,
        [productKey]: nextDraft,
      }
    })
  }, [descriptionInputValue, editCategoryDraft, editForm, initialEditForm, loadedEditProductId, selectedPreviewImage, setEditDraftsByProductId])

  useEffect(() => {
    if (pageType !== 'product-edit') return
    setSelectedPreviewImage((prev) => prev || getProductImage(editingProduct))
  }, [editingProduct, pageType, setSelectedPreviewImage])

  useEffect(() => {
    if (pageType !== 'product-edit') return
    setImageUrlDraft('')
  }, [pageType, productId, setImageUrlDraft])

  useEffect(() => {
    if (pageType === 'product-edit') return
    setInitialEditForm(null)
  }, [pageType, setInitialEditForm])

  return {
    appendProductSessionActivity,
    confirmUnsavedSelectionReset,
    createDirtyFields,
    createImageUrls,
    deferredEditDescription,
    deleteModalProducts,
    unsavedSelectionModalProducts,
    dirtyCreateDrafts,
    dirtySelectedProductsForSidebar,
    editDirtyFields,
    editImageUrls,
    editPreviewImage,
    editPreviewSidebarSlots,
    filteredCreateCategories,
    filteredEditCategories,
    handleCreateEditCategory,
    isCreateDirty,
    isEditDirty,
    isEditWorkspaceActive,
    loadedEditProductId,
    pendingSelectedProductIds,
    resolvedEditProductId,
    selectedCategory,
    selectedCreateCategory,
    selectedCreateCategoryLabel,
    selectedEditCategoryLabel,
    selectionSummary,
    showProductSelectionSidebar,
    untouchedCreateDrafts,
    untouchedSelectedProductsForSidebar,
  }
}
