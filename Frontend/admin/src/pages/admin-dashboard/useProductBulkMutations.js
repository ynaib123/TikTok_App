import { useCallback } from 'react'
import {
  ADMIN_ERROR_MESSAGES,
  ADMIN_INFO_MESSAGES,
  normalizeProductValidationError,
  productRequiredFieldsMessage,
} from './feedbackMessages.js'
import { buildEditFormSnapshot, createSessionActivityEntry } from './utils.js'
import {
  buildDraftMutationPayload,
  collectDirtyCreateDrafts,
  collectDirtyEditDraftEntries,
  getProductValidationMessageForForm,
} from './productDraftDomain.js'
import {
  buildProductFormState,
  normalizePersistedProduct,
} from './productMutationState.js'
import {
  createProductRequest,
  updateProductRequest,
} from './productMutationService.js'

export function formatDirtySelectionSaveMessage({
  invalidCount,
  savedCount,
}) {
  if (invalidCount > 0) {
    return `${savedCount} element(s) enregistre(s). ${invalidCount} element(s) restent dans Non sauvegardes.`
  }

  return `${savedCount} element(s) enregistre(s) avec succes.`
}

export default function useProductBulkMutations({
  appendProductSessionActivity,
  categories,
  createDrafts,
  editDraftsByProductId,
  invalidateProductCatalog,
  navigate,
  resetCreateWorkspace,
  resolvedEditProductId,
  savedCreateDraftIds,
  setActiveCreateDraftId,
  setCreateImageUrlDraft,
  setEditCategoryDraft,
  setEditDraftsByProductId,
  setEditForm,
  setEditingProduct,
  setError,
  setInfo,
  setInitialEditForm,
  setIsCreatingProduct,
  setIsSavingDirtySelection,
  setModificationProductIds,
  setSelectedProductIds,
  upsertProductsInCache,
}) {
  const handleBulkProductCreate = useCallback(async (event) => {
    event.preventDefault()

    const draftsToCreate = collectDirtyCreateDrafts(createDrafts, savedCreateDraftIds)

    if (draftsToCreate.length === 0) {
      setError(ADMIN_ERROR_MESSAGES.completeRequiredProductFields)
      return
    }

    const invalidDraft = draftsToCreate.find((draft) => Boolean(getProductValidationMessageForForm(draft.form)))

    if (invalidDraft) {
      const invalidDraftIndex = createDrafts.findIndex((draft) => draft.id === invalidDraft.id) + 1
      const validationMessage = getProductValidationMessageForForm(invalidDraft.form)
      setError(validationMessage || productRequiredFieldsMessage(invalidDraftIndex))
      setActiveCreateDraftId(invalidDraft.id)
      return
    }

    setIsCreatingProduct(true)
    setError(null)

    try {
      const createdProductsByDraftId = new Map()
      const createdProducts = []

      for (const draft of draftsToCreate) {
        const payload = buildDraftMutationPayload({
          categories,
          draft,
        })

        const createdProduct = await createProductRequest(payload)
        const normalizedCreatedProduct = normalizePersistedProduct(createdProduct, payload)
        createdProductsByDraftId.set(draft.id, normalizedCreatedProduct.id)
        createdProducts.push(normalizedCreatedProduct)
      }

      upsertProductsInCache(createdProducts)
      invalidateProductCatalog()
      setInfo(ADMIN_INFO_MESSAGES.productsCreated)
      appendProductSessionActivity(createdProducts.map((product) => createSessionActivityEntry('Ajout', product)))

      const nextSavedCreateDraftIds = Array.from(new Set([
        ...savedCreateDraftIds,
        ...draftsToCreate.map((draft) => draft.id),
      ]))
      const nextCreateDrafts = createDrafts.map((draft) => (
        createdProductsByDraftId.has(draft.id)
          ? { ...draft, persistedProductId: createdProductsByDraftId.get(draft.id) }
          : draft
      ))

      const nextActiveDraftId = resetCreateWorkspace(nextCreateDrafts, nextSavedCreateDraftIds)
      setCreateImageUrlDraft('')

      if (!nextActiveDraftId) {
        navigate('/products', { replace: true })
      }
    } catch (err) {
      setError(normalizeProductValidationError(err.message, ADMIN_ERROR_MESSAGES.createProducts))
    } finally {
      setIsCreatingProduct(false)
    }
  }, [
    appendProductSessionActivity,
    categories,
    createDrafts,
    invalidateProductCatalog,
    navigate,
    resetCreateWorkspace,
    savedCreateDraftIds,
    setActiveCreateDraftId,
    setCreateImageUrlDraft,
    setError,
    setInfo,
    setIsCreatingProduct,
    upsertProductsInCache,
  ])

  const handleSaveDirtySelection = useCallback(async () => {
    const dirtyCreateDrafts = collectDirtyCreateDrafts(createDrafts, savedCreateDraftIds)
    const dirtyEditEntries = collectDirtyEditDraftEntries(editDraftsByProductId)
    const activeEditedProductId = Number(resolvedEditProductId)
    const shouldRedirectToProductsAfterSave = Number.isFinite(activeEditedProductId)
      && dirtyEditEntries.some(([productId]) => Number(productId) === activeEditedProductId)

    if (dirtyCreateDrafts.length === 0 && dirtyEditEntries.length === 0) {
      setError(ADMIN_ERROR_MESSAGES.completeRequiredProductFields)
      return
    }

    setIsSavingDirtySelection(true)
    setError(null)

    try {
      const createdProductsByDraftId = new Map()
      const updatedProductsById = new Map()
      const createdProducts = []
      const updatedProducts = []
      const invalidCreateDraftIds = []
      const invalidEditProductIds = []
      let firstFailureMessage = null

      for (const draft of dirtyCreateDrafts) {
        const draftValidationMessage = getProductValidationMessageForForm(draft.form)

        if (draftValidationMessage) {
          invalidCreateDraftIds.push(draft.id)
          if (!firstFailureMessage) firstFailureMessage = draftValidationMessage
          continue
        }

        try {
          const payload = buildDraftMutationPayload({
            categories,
            draft,
          })
          const createdProduct = await createProductRequest(payload)
          const normalizedCreatedProduct = normalizePersistedProduct(createdProduct, payload)
          createdProductsByDraftId.set(draft.id, normalizedCreatedProduct.id)
          createdProducts.push(normalizedCreatedProduct)
        } catch (err) {
          invalidCreateDraftIds.push(draft.id)
          if (!firstFailureMessage) {
            firstFailureMessage = normalizeProductValidationError(err.message, ADMIN_ERROR_MESSAGES.createProduct)
          }
        }
      }

      for (const [productId, draft] of dirtyEditEntries) {
        const resolvedProductId = Number(productId)
        const description = draft.descriptionInputValue ?? draft.form?.description ?? ''
        const editValidationMessage = getProductValidationMessageForForm(draft.form, { description })

        if (editValidationMessage) {
          invalidEditProductIds.push(resolvedProductId)
          if (!firstFailureMessage) firstFailureMessage = editValidationMessage
          continue
        }

        try {
          const payload = buildDraftMutationPayload({
            categories,
            description,
            draft,
            productId: resolvedProductId,
          })
          const updatedProduct = await updateProductRequest(resolvedProductId, payload)
          const normalizedUpdatedProduct = normalizePersistedProduct(updatedProduct, payload)
          updatedProductsById.set(resolvedProductId, normalizedUpdatedProduct)
          updatedProducts.push(normalizedUpdatedProduct)
        } catch (err) {
          invalidEditProductIds.push(resolvedProductId)
          if (!firstFailureMessage) {
            firstFailureMessage = normalizeProductValidationError(err.message, ADMIN_ERROR_MESSAGES.saveProduct)
          }
        }
      }

      const savedCount = createdProducts.length + updatedProducts.length
      const invalidCount = invalidCreateDraftIds.length + invalidEditProductIds.length

      if (savedCount === 0) {
        setError(firstFailureMessage || ADMIN_ERROR_MESSAGES.completeRequiredProductFields)
        return
      }

      const nextSavedCreateDraftIds = Array.from(new Set([
        ...savedCreateDraftIds,
        ...createdProductsByDraftId.keys(),
      ]))
      const nextCreateDrafts = createDrafts.map((draft) => (
        createdProductsByDraftId.has(draft.id)
          ? { ...draft, persistedProductId: createdProductsByDraftId.get(draft.id) }
          : draft
      ))
      resetCreateWorkspace(nextCreateDrafts, nextSavedCreateDraftIds)

      setEditDraftsByProductId((prev) => {
        const nextDrafts = { ...prev }
        updatedProductsById.forEach((_, productId) => {
          delete nextDrafts[String(productId)]
        })
        return nextDrafts
      })
      setSelectedProductIds((prev) => prev.filter((id) => !updatedProductsById.has(Number(id))))
      setModificationProductIds((prev) => prev.filter((id) => !updatedProductsById.has(Number(id))))

      const currentEditedProduct = resolvedEditProductId != null
        ? updatedProductsById.get(Number(resolvedEditProductId)) || null
        : null

      if (currentEditedProduct) {
        const nextEditForm = buildProductFormState(currentEditedProduct)
        setEditingProduct(currentEditedProduct)
        setEditForm(nextEditForm)
        setEditCategoryDraft(currentEditedProduct?.categorie?.libelle ? String(currentEditedProduct.categorie.libelle) : '')
        setInitialEditForm(buildEditFormSnapshot(nextEditForm))
      }

      if (createdProducts.length > 0) {
        upsertProductsInCache(createdProducts)
      }
      if (updatedProducts.length > 0) {
        upsertProductsInCache(updatedProducts)
      }
      invalidateProductCatalog()
      if (createdProducts.length > 0) {
        appendProductSessionActivity(createdProducts.map((product) => createSessionActivityEntry('Ajout', product)))
      }
      if (updatedProducts.length > 0) {
        appendProductSessionActivity(updatedProducts.map((product) => createSessionActivityEntry('Modification', product)))
      }

      setInfo(formatDirtySelectionSaveMessage({
        invalidCount,
        savedCount,
      }))

      if (shouldRedirectToProductsAfterSave && updatedProductsById.has(activeEditedProductId)) {
        navigate('/products', { replace: true })
      }
    } finally {
      setIsSavingDirtySelection(false)
    }
  }, [
    appendProductSessionActivity,
    categories,
    createDrafts,
    editDraftsByProductId,
    invalidateProductCatalog,
    navigate,
    resetCreateWorkspace,
    resolvedEditProductId,
    savedCreateDraftIds,
    setEditCategoryDraft,
    setEditDraftsByProductId,
    setEditForm,
    setEditingProduct,
    setError,
    setInfo,
    setInitialEditForm,
    setIsSavingDirtySelection,
    setModificationProductIds,
    setSelectedProductIds,
    upsertProductsInCache,
  ])

  return {
    handleBulkProductCreate,
    handleSaveDirtySelection,
  }
}
