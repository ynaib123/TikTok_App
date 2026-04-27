import { useEffect, useRef } from 'react'
import { apiGet } from '../../services/adminApiClient'
import { ADMIN_ERROR_MESSAGES } from './feedbackMessages.js'
import { buildLoadedEditWorkspaceState } from './productEditWorkspaceState.js'

export default function useProductEditWorkspace({
  editDraft,
  listProduct,
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
}) {
  const lastLoadedProductIdRef = useRef(null)

  useEffect(() => {
    const shouldLoadFromRoute = pageType === 'product-edit' && resolvedEditProductId
    if (!shouldLoadFromRoute) return

    const normalizedProductId = Number(resolvedEditProductId)
    if (!Number.isFinite(normalizedProductId)) return
    if (lastLoadedProductIdRef.current === normalizedProductId) return

    let isActive = true

    const loadProduct = async () => {
      setLoading(true)
      setError(null)

      try {
        const product = await apiGet(`/produits/${resolvedEditProductId}`)
        if (!isActive) return

        const nextState = buildLoadedEditWorkspaceState({
          apiProduct: product,
          draft: editDraft,
          listProduct,
        })

        setEditingProduct(nextState.editingProduct)
        setEditForm(nextState.editForm)
        setEditCategoryDraft(nextState.editCategoryDraft)
        setInitialEditForm(nextState.initialEditForm)
        setDescriptionInputValue(nextState.descriptionInputValue)
        setSelectedPreviewImage(nextState.selectedPreviewImage)
        lastLoadedProductIdRef.current = normalizedProductId
      } catch (err) {
        if (!isActive) return

        if (Number(err?.status) === 404 && listProduct) {
          const nextState = buildLoadedEditWorkspaceState({
            apiProduct: null,
            draft: editDraft,
            listProduct,
          })

          setEditingProduct(nextState.editingProduct)
          setEditForm(nextState.editForm)
          setEditCategoryDraft(nextState.editCategoryDraft)
          setInitialEditForm(nextState.initialEditForm)
          setDescriptionInputValue(nextState.descriptionInputValue)
          setSelectedPreviewImage(nextState.selectedPreviewImage)
          lastLoadedProductIdRef.current = normalizedProductId
          return
        }

        setError(err.message || ADMIN_ERROR_MESSAGES.loadProduct)
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    void loadProduct()

    return () => {
      isActive = false
    }
  }, [
    editDraft,
    listProduct,
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
  ])

  useEffect(() => {
    if (pageType !== 'product-edit') {
      lastLoadedProductIdRef.current = null
    }
  }, [pageType])
}
