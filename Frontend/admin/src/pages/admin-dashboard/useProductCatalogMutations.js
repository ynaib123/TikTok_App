import { useCallback } from 'react'
import {
  ADMIN_ERROR_MESSAGES,
  ADMIN_INFO_MESSAGES,
} from './feedbackMessages.js'
import { createSessionActivityEntry } from './utils.js'
import { normalizePersistedProduct } from './productMutationState.js'
import {
  deleteProductsBulkRequest,
  deleteProductRequest,
  updateProductPublishStatusRequest,
} from './productMutationService.js'

const ADMIN_BLOCKING_FALLBACK_MIN_DURATION_MS = 5000

function normalizeProductIds(productIds = []) {
  return Array.from(new Set(
    (Array.isArray(productIds) ? productIds : [])
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id))
  ))
}

export default function useProductCatalogMutations({
  appendProductSessionActivity,
  createDrafts,
  deleteModalState,
  guardedNavigate,
  invalidateProductCatalog,
  productsById,
  refreshCategories,
  removeProductsFromCache,
  selectedProductIds,
  setCreateDrafts,
  setDeleteProgressPercent,
  setDeleteModalState,
  setError,
  setInfo,
  setIsDeletingProducts,
  setIsUpdatingProductPublishStatus,
  setManagedEditProductId,
  setModificationProductIds,
  setSavedCreateDraftIds,
  setSelectedProductIds,
  upsertProductsInCache,
}) {
  const handleBulkProductDelete = useCallback(async (
    productIds = deleteModalState.productIds,
    redirectTo = deleteModalState.redirectTo,
  ) => {
    const normalizedIds = normalizeProductIds(productIds)

    if (normalizedIds.length === 0) {
      setError(ADMIN_ERROR_MESSAGES.selectProduct)
      return
    }

    const startedAt = Date.now()
    setIsDeletingProducts(true)
    setDeleteProgressPercent(8)
    setError(null)

    try {
      const deletedProducts = normalizedIds.map((productId) => (
        productsById.get(Number(productId)) || { id: productId, nom: `Produit #${productId}` }
      ))
      let deleteResponse = null

      try {
        deleteResponse = await deleteProductsBulkRequest(normalizedIds)
        setDeleteProgressPercent(72)
      } catch (bulkError) {
        if (Number(bulkError?.status) !== 404) {
          throw bulkError
        }

        for (let index = 0; index < normalizedIds.length; index += 1) {
          const productId = normalizedIds[index]
          await deleteProductRequest(productId)
          const nextProgress = 18 + Math.round(((index + 1) / normalizedIds.length) * 54)
          setDeleteProgressPercent(nextProgress)
        }
      }

      removeProductsFromCache(normalizedIds)
      invalidateProductCatalog()
      if (typeof refreshCategories === 'function') {
        await refreshCategories()
      }
      setDeleteProgressPercent(92)
      appendProductSessionActivity(deletedProducts.map((product) => createSessionActivityEntry('Suppression', product)))
      setSelectedProductIds((prev) => prev.filter((id) => !normalizedIds.includes(id)))
      setModificationProductIds((prev) => prev.filter((id) => !normalizedIds.includes(id)))
      setManagedEditProductId((prev) => (prev != null && normalizedIds.includes(prev) ? null : prev))
      setCreateDrafts((prev) => prev.filter((draft) => !draft.persistedProductId || !normalizedIds.includes(draft.persistedProductId)))
      setSavedCreateDraftIds((prev) => prev.filter((draftId) => {
        const matchingDraft = createDrafts.find((draft) => draft.id === draftId)
        return !matchingDraft?.persistedProductId || !normalizedIds.includes(matchingDraft.persistedProductId)
      }))
      setDeleteModalState({
        isOpen: false,
        productIds: [],
        redirectTo: null,
      })
      setDeleteProgressPercent(100)
      const elapsed = Date.now() - startedAt
      const remaining = Math.max(0, ADMIN_BLOCKING_FALLBACK_MIN_DURATION_MS - elapsed)
      if (remaining > 0) {
        await new Promise((resolve) => window.setTimeout(resolve, remaining))
      }
      setInfo(deleteResponse?.message || ADMIN_INFO_MESSAGES.productsDeleted)
      guardedNavigate(redirectTo || '/products', { replace: true })
    } catch (err) {
      setError(err.message || ADMIN_ERROR_MESSAGES.deleteProducts)
      setDeleteProgressPercent(0)
    } finally {
      setIsDeletingProducts(false)
    }
  }, [
    appendProductSessionActivity,
    createDrafts,
    deleteModalState.productIds,
    deleteModalState.redirectTo,
    guardedNavigate,
    invalidateProductCatalog,
    productsById,
    refreshCategories,
    removeProductsFromCache,
    setCreateDrafts,
    setDeleteProgressPercent,
    setDeleteModalState,
    setError,
    setInfo,
    setIsDeletingProducts,
    setManagedEditProductId,
    setModificationProductIds,
    setSavedCreateDraftIds,
    setSelectedProductIds,
  ])

  const handleBulkProductPublishStatus = useCallback(async (productIds = selectedProductIds, published) => {
    const normalizedIds = normalizeProductIds(productIds)

    if (normalizedIds.length === 0) {
      setError(ADMIN_ERROR_MESSAGES.selectProduct)
      return
    }

    setIsUpdatingProductPublishStatus(true)
    setError(null)

    try {
      const response = await updateProductPublishStatusRequest(normalizedIds, Boolean(published))
      upsertProductsInCache(normalizedIds.map((productId) => {
        const existingProduct = productsById.get(Number(productId)) || { id: productId }
        return normalizePersistedProduct({
          ...existingProduct,
          published: Boolean(published),
        }, existingProduct)
      }))
      invalidateProductCatalog()
      setSelectedProductIds((prev) => prev.filter((id) => !normalizedIds.includes(Number(id))))
      setInfo(response?.message || (
        published ? ADMIN_INFO_MESSAGES.productsPublished : ADMIN_INFO_MESSAGES.productsUnpublished
      ))
      appendProductSessionActivity(normalizedIds.map((productId) => {
        const existingProduct = productsById.get(Number(productId)) || { id: productId, nom: `Produit #${productId}` }
        return createSessionActivityEntry(
          published ? 'Mise en ligne' : 'Hors ligne',
          { ...existingProduct, published: Boolean(published) }
        )
      }))
    } catch (err) {
      setError(err.message || ADMIN_ERROR_MESSAGES.updateProductPublishStatus)
    } finally {
      setIsUpdatingProductPublishStatus(false)
    }
  }, [
    appendProductSessionActivity,
    invalidateProductCatalog,
    productsById,
    selectedProductIds,
    setError,
    setInfo,
    setIsUpdatingProductPublishStatus,
    setSelectedProductIds,
    upsertProductsInCache,
  ])

  return {
    handleBulkProductDelete,
    handleBulkProductPublishStatus,
  }
}
