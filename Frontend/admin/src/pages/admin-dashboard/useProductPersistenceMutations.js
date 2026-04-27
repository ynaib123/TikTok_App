import { useCallback } from 'react'
import {
  EMPTY_PRODUCT_FORM,
  EMPTY_PRODUCT_FORM_SNAPSHOT,
  findFirstPendingCreateDraftId,
} from './constants.js'
import {
  ADMIN_ERROR_MESSAGES,
  ADMIN_INFO_MESSAGES,
  normalizeProductValidationError,
} from './feedbackMessages.js'
import {
  buildEditFormSnapshot,
  createSessionActivityEntry,
  resolveNextProductNavigation,
} from './utils.js'
import { getProductValidationMessageForForm } from './productDraftDomain.js'
import {
  buildProductFormState,
  buildProductMutationPayload,
  normalizePersistedProduct,
} from './productMutationState.js'
import {
  createProductRequest,
  updateProductRequest,
} from './productMutationService.js'

export function resolveCreateWorkspaceState({
  createDrafts,
  savedCreateDraftIds,
}) {
  const nextPendingDraftId = findFirstPendingCreateDraftId(createDrafts, savedCreateDraftIds)
  const nextPendingDraft = createDrafts.find((draft) => draft.id === nextPendingDraftId) || null

  if (nextPendingDraft) {
    return {
      activeCreateDraftId: nextPendingDraft.id,
      createForm: nextPendingDraft.form,
      initialCreateForm: EMPTY_PRODUCT_FORM_SNAPSHOT,
      selectedCreatePreviewImage: nextPendingDraft.selectedPreviewImage || '',
    }
  }

  return {
    activeCreateDraftId: null,
    createForm: EMPTY_PRODUCT_FORM,
    initialCreateForm: EMPTY_PRODUCT_FORM_SNAPSHOT,
    selectedCreatePreviewImage: '',
  }
}

export default function useProductPersistenceMutations({
  activeCreateDraftId,
  appendProductSessionActivity,
  createDrafts,
  createForm,
  descriptionInputValue,
  editDraftsByProductId,
  editForm,
  editingProduct,
  invalidateProductCatalog,
  navigate,
  products,
  resolvedEditProductId,
  savedCreateDraftIds,
  selectedCategory,
  selectedCreateCategory,
  selectedProductIds,
  setActiveCreateDraftId,
  setCreateDrafts,
  setCreateForm,
  setCreateImageUrlDraft,
  setEditCategoryDraft,
  setEditDraftsByProductId,
  setEditForm,
  setEditingProduct,
  setError,
  setInfo,
  setInitialCreateForm,
  setInitialEditForm,
  setIsCreatingProduct,
  setIsSaving,
  setModificationProductIds,
  setSavedCreateDraftIds,
  setSelectedCreatePreviewImage,
  setSelectedProductIds,
  upsertProductsInCache,
}) {
  const resetCreateWorkspace = useCallback((nextCreateDrafts, nextSavedCreateDraftIds) => {
    const nextWorkspace = resolveCreateWorkspaceState({
      createDrafts: nextCreateDrafts,
      savedCreateDraftIds: nextSavedCreateDraftIds,
    })

    setSavedCreateDraftIds(nextSavedCreateDraftIds)
    setCreateDrafts(nextCreateDrafts)
    setActiveCreateDraftId(nextWorkspace.activeCreateDraftId)
    setCreateForm(nextWorkspace.createForm)
    setInitialCreateForm(nextWorkspace.initialCreateForm)
    setSelectedCreatePreviewImage(nextWorkspace.selectedCreatePreviewImage)

    return nextWorkspace.activeCreateDraftId
  }, [
    setActiveCreateDraftId,
    setCreateDrafts,
    setCreateForm,
    setInitialCreateForm,
    setSavedCreateDraftIds,
    setSelectedCreatePreviewImage,
  ])

  const handleProductSave = useCallback(async (event) => {
    event.preventDefault()
    if (!resolvedEditProductId) return

    const currentProductId = Number(resolvedEditProductId)
    const nextNavigation = resolveNextProductNavigation({
      editDraftsByProductId,
      excludedProductIds: [currentProductId],
      products,
      priority: ['dirty', 'pending'],
      selectedProductIds,
    })

    const editValidationMessage = getProductValidationMessageForForm(editForm, {
      description: descriptionInputValue,
    })

    if (editValidationMessage) {
      setError(editValidationMessage)
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const payload = buildProductMutationPayload({
        category: selectedCategory,
        description: descriptionInputValue,
        form: editForm,
        productId: editingProduct?.id,
      })

      const updatedProduct = await updateProductRequest(resolvedEditProductId, payload)
      const normalizedUpdatedProduct = normalizePersistedProduct(updatedProduct, payload)
      const nextEditForm = buildProductFormState(normalizedUpdatedProduct)

      setEditingProduct(normalizedUpdatedProduct)
      setEditForm(nextEditForm)
      setEditCategoryDraft(normalizedUpdatedProduct?.categorie?.libelle ? String(normalizedUpdatedProduct.categorie.libelle) : '')
      setInitialEditForm(buildEditFormSnapshot(nextEditForm))
      setEditDraftsByProductId((prev) => {
        const nextDrafts = { ...prev }
        delete nextDrafts[String(normalizedUpdatedProduct.id)]
        return nextDrafts
      })
      setSelectedProductIds((prev) => prev.filter((id) => Number(id) !== Number(normalizedUpdatedProduct.id)))
      setModificationProductIds((prev) => prev.filter((id) => Number(id) !== Number(normalizedUpdatedProduct.id)))

      upsertProductsInCache([normalizedUpdatedProduct])
      invalidateProductCatalog()
      setInfo(ADMIN_INFO_MESSAGES.productSaved)
      appendProductSessionActivity(createSessionActivityEntry('Modification', normalizedUpdatedProduct))
      navigate(nextNavigation.targetPath, { replace: true })
    } catch (err) {
      setError(normalizeProductValidationError(err.message, ADMIN_ERROR_MESSAGES.saveProduct))
    } finally {
      setIsSaving(false)
    }
  }, [
    appendProductSessionActivity,
    descriptionInputValue,
    editDraftsByProductId,
    editForm,
    editingProduct?.id,
    invalidateProductCatalog,
    navigate,
    products,
    resolvedEditProductId,
    selectedCategory,
    selectedProductIds,
    setEditCategoryDraft,
    setEditDraftsByProductId,
    setEditForm,
    setEditingProduct,
    setError,
    setInfo,
    setInitialEditForm,
    setIsSaving,
    setModificationProductIds,
    setSelectedProductIds,
    upsertProductsInCache,
  ])

  const handleProductCreate = useCallback(async (event) => {
    event.preventDefault()
    if (!activeCreateDraftId) return

    const createValidationMessage = getProductValidationMessageForForm(createForm)

    if (createValidationMessage) {
      setError(createValidationMessage)
      return
    }

    setIsCreatingProduct(true)
    setError(null)

    try {
      const payload = buildProductMutationPayload({
        category: selectedCreateCategory,
        form: createForm,
      })
      const createdProduct = await createProductRequest(payload)
      const normalizedCreatedProduct = normalizePersistedProduct(createdProduct, payload)

      upsertProductsInCache([normalizedCreatedProduct])
      invalidateProductCatalog()
      setInfo(ADMIN_INFO_MESSAGES.productCreated)
      appendProductSessionActivity(createSessionActivityEntry('Ajout', normalizedCreatedProduct))

      const nextSavedCreateDraftIds = savedCreateDraftIds.includes(activeCreateDraftId)
        ? savedCreateDraftIds
        : [...savedCreateDraftIds, activeCreateDraftId]
      const nextCreateDrafts = createDrafts.map((draft) => (
        draft.id === activeCreateDraftId
          ? { ...draft, persistedProductId: normalizedCreatedProduct.id }
          : draft
      ))

      const nextActiveDraftId = resetCreateWorkspace(nextCreateDrafts, nextSavedCreateDraftIds)
      setCreateImageUrlDraft('')

      if (!nextActiveDraftId) {
        navigate('/products', { replace: true })
      }
    } catch (err) {
      setError(normalizeProductValidationError(err.message, ADMIN_ERROR_MESSAGES.createProduct))
    } finally {
      setIsCreatingProduct(false)
    }
  }, [
    activeCreateDraftId,
    appendProductSessionActivity,
    createDrafts,
    createForm,
    invalidateProductCatalog,
    navigate,
    resetCreateWorkspace,
    savedCreateDraftIds,
    selectedCreateCategory,
    setCreateImageUrlDraft,
    setError,
    setInfo,
    setIsCreatingProduct,
    upsertProductsInCache,
  ])

  return {
    handleProductCreate,
    handleProductSave,
    resetCreateWorkspace,
  }
}
