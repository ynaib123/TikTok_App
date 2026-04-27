import { useDeferredValue, useMemo } from 'react'
import { EMPTY_PRODUCT_FORM_SNAPSHOT, EMPTY_PRODUCT_FORM_SNAPSHOT_JSON } from './constants.js'
import { buildProductSnapshot } from './productDraftDomain.js'
import useProductSelectionState from './useProductSelectionState.js'
import {
  buildProductCreateDirtyState,
  resolveProductSelectionSidebarVisibility,
} from './productPageState.js'
import {
  getProductImage,
  normalizeImageUrlsText,
} from './utils.js'

export default function useAdminProductWorkspaceDerived({
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
  pageType,
  pendingCreateDrafts,
  productId,
  productsById,
  savedCreateDraftIds,
  selectedPreviewImage,
  selectedProductIds,
  unsavedSelectionModalState,
}) {
  const selectedCategory = useMemo(() => (
    categories.find((category) => String(category?.id) === String(editForm.categorieId)) || null
  ), [categories, editForm.categorieId])

  const selectedCreateCategory = useMemo(() => (
    categories.find((category) => String(category?.id) === String(createForm.categorieId)) || null
  ), [categories, createForm.categorieId])

  const selectedEditCategoryLabel = selectedCategory?.libelle || 'Sans categorie'
  const selectedCreateCategoryLabel = selectedCreateCategory?.libelle || 'Sans categorie'

  const filteredEditCategories = useMemo(() => {
    const query = String(editCategoryDraft || '').trim().toLowerCase()
    const source = Array.isArray(categories) ? categories : []

    if (!query) return source

    return source.filter((category) => (
      String(category?.libelle || '').trim().toLowerCase().includes(query)
    ))
  }, [categories, editCategoryDraft])

  const filteredCreateCategories = useMemo(() => {
    const query = String(createCategoryDraft || '').trim().toLowerCase()
    const source = Array.isArray(categories) ? categories : []

    if (!query) return source

    return source.filter((category) => (
      String(category?.libelle || '').trim().toLowerCase().includes(query)
    ))
  }, [categories, createCategoryDraft])

  const resolvedEditProductId = useMemo(() => {
    if (pageType === 'product-edit' && productId) return productId
    return null
  }, [pageType, productId])

  const currentEditDraft = useMemo(() => (
    resolvedEditProductId ? (editDraftsByProductId[String(resolvedEditProductId)] || null) : null
  ), [editDraftsByProductId, resolvedEditProductId])

  const currentEditListProduct = useMemo(() => (
    resolvedEditProductId ? (productsById.get(Number(resolvedEditProductId)) || null) : null
  ), [productsById, resolvedEditProductId])

  const showProductSelectionSidebar = useMemo(() => (
    resolveProductSelectionSidebarVisibility({ locationHash, pageType })
  ), [locationHash, pageType])

  const selectedProductsForSidebar = useMemo(() => (
    (Array.isArray(selectedProductIds) ? selectedProductIds : [])
      .map((selectedId) => {
        const normalizedId = Number(selectedId)
        if (!Number.isFinite(normalizedId)) return null

        const hydratedProduct = productsById.get(normalizedId)
        if (hydratedProduct) return hydratedProduct

        const draft = editDraftsByProductId[String(normalizedId)]
        if (!draft?.form) {
          return {
            id: normalizedId,
            nom: `Produit #${normalizedId}`,
          }
        }

        const draftImageUrls = normalizeImageUrlsText(draft.form.imageUrlsText).split('\n').filter(Boolean)
        const draftPrimaryImage = String(
          draft.selectedPreviewImage
          || draft.form.imageUrl
          || draftImageUrls[0]
          || ''
        ).trim()

        return {
          id: normalizedId,
          nom: String(draft.form.nom || '').trim() || `Produit #${normalizedId}`,
          imageUrl: draftPrimaryImage,
          imageUrls: draftImageUrls,
        }
      })
      .filter(Boolean)
  ), [editDraftsByProductId, productsById, selectedProductIds])

  const deleteModalProducts = useMemo(() => (
    deleteModalState.productIds
      .map((id) => productsById.get(Number(id)) || { id, nom: `Produit #${id}` })
  ), [deleteModalState.productIds, productsById])

  const unsavedSelectionModalProducts = useMemo(() => {
    const draftItems = (unsavedSelectionModalState?.draftIds || []).map((draftId) => {
      const draft = createDrafts.find((entry) => entry.id === String(draftId))
      const draftName = String(draft?.form?.nom || '').trim()

      return {
        key: `draft-${draftId}`,
        badge: 'Brouillon',
        name: draftName || 'Produit non enregistre',
        meta: 'Creation non enregistree',
      }
    })

    const productItems = (unsavedSelectionModalState?.productIds || []).map((productId) => {
      const product = productsById.get(Number(productId))

      return {
        key: `product-${productId}`,
        badge: `#${productId}`,
        name: product?.nom || `Produit #${productId}`,
        meta: 'Modifications non enregistrees',
      }
    })

    return [...draftItems, ...productItems]
  }, [createDrafts, productsById, unsavedSelectionModalState])

  const editImageUrls = useMemo(() => {
    const urls = editForm.imageUrlsText
      .split('\n')
      .map((value) => value.trim())
      .filter(Boolean)

    return urls.filter((value, index, array) => array.indexOf(value) === index)
  }, [editForm.imageUrlsText])

  const createImageUrls = useMemo(() => {
    const urls = createForm.imageUrlsText
      .split('\n')
      .map((value) => value.trim())
      .filter(Boolean)

    return urls.filter((value, index, array) => array.indexOf(value) === index)
  }, [createForm.imageUrlsText])

  const editPreviewImage = useMemo(() => (
    selectedPreviewImage || editImageUrls[0] || getProductImage(editingProduct)
  ), [editImageUrls, editingProduct, selectedPreviewImage])

  const editPreviewSidebarSlots = useMemo(() => {
    const sidebarImages = editImageUrls
      .filter((url) => url !== editPreviewImage)
      .slice(0, 3)

    return Array.from({ length: 3 }, (_, index) => sidebarImages[index] || null)
  }, [editImageUrls, editPreviewImage])

  const deferredEditDescription = useDeferredValue(descriptionInputValue)

  const currentEditSnapshot = useMemo(() => (
    buildProductSnapshot(editForm, descriptionInputValue)
  ), [descriptionInputValue, editForm])

  const initialEditSnapshot = useMemo(() => (
    initialEditForm ? buildProductSnapshot(initialEditForm) : null
  ), [initialEditForm])

  const isEditDirty = useMemo(() => (
    pageType === 'product-edit'
      && initialEditSnapshot != null
      && currentEditSnapshot !== initialEditSnapshot
  ), [currentEditSnapshot, initialEditSnapshot, pageType])

  const isEditWorkspaceActive = pageType === 'product-edit'

  const editDirtyFields = useMemo(() => {
    const initialForm = initialEditForm || EMPTY_PRODUCT_FORM_SNAPSHOT

    return {
      nom: String(editForm.nom || '') !== String(initialForm.nom || ''),
      categorieId: String(editForm.categorieId || '') !== String(initialForm.categorieId || ''),
      description: String(descriptionInputValue || '') !== String(initialForm.description || ''),
      prix: String(editForm.prix || '') !== String(initialForm.prix || ''),
      promotionPercent: String(editForm.promotionPercent || '') !== String(initialForm.promotionPercent || ''),
      stock: String(editForm.stock || '') !== String(initialForm.stock || ''),
      imageUrlsText: normalizeImageUrlsText(editForm.imageUrlsText) !== normalizeImageUrlsText(initialForm.imageUrlsText),
    }
  }, [descriptionInputValue, editForm, initialEditForm])

  const currentCreateSnapshot = useMemo(() => buildProductSnapshot(createForm), [createForm])

  const initialCreateSnapshot = useMemo(() => (
    initialCreateForm ? buildProductSnapshot(initialCreateForm) : null
  ), [initialCreateForm])

  const isCreateDirty = useMemo(() => (
    buildProductCreateDirtyState({
      createDrafts,
      currentCreateSnapshot,
      initialCreateSnapshot,
      isCreateSection,
      savedCreateDraftIds,
    })
  ), [createDrafts, currentCreateSnapshot, initialCreateSnapshot, isCreateSection, savedCreateDraftIds])

  const createDirtyFields = useMemo(() => {
    const hasStartedDraft = currentCreateSnapshot !== EMPTY_PRODUCT_FORM_SNAPSHOT_JSON

    return {
      nom: hasStartedDraft && !String(createForm.nom || '').trim(),
      categorieId: hasStartedDraft && !String(createForm.categorieId || '').trim(),
      description: hasStartedDraft && !String(createForm.description || '').trim(),
      prix: hasStartedDraft && String(createForm.prix || '').trim() === '',
      promotionPercent: false,
      stock: hasStartedDraft && String(createForm.stock || '').trim() === '',
      imageUrlsText: hasStartedDraft && normalizeImageUrlsText(createForm.imageUrlsText).trim() === '',
    }
  }, [createForm, currentCreateSnapshot])

  const {
    dirtyCreateDrafts,
    dirtySelectedProductsForSidebar,
    selectionSummary,
    untouchedCreateDrafts,
    untouchedSelectedProductsForSidebar,
  } = useProductSelectionState({
    createDrafts,
    editDraftsByProductId,
    isEditDirty,
    isEditWorkspaceActive,
    loadedEditProductId,
    pendingCreateDrafts,
    savedCreateDraftIds,
    selectedProductsForSidebar,
  })

  const pendingSelectedProductIds = useMemo(() => (
    untouchedSelectedProductsForSidebar.map((product) => Number(product.id)).filter((id) => Number.isFinite(id))
  ), [untouchedSelectedProductsForSidebar])

  return {
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
  }
}
