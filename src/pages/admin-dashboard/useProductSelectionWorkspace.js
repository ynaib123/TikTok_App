import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  PRODUCT_SELECTION_STORAGE_KEY,
} from './constants.js'
import { ADMIN_ERROR_MESSAGES } from './feedbackMessages.js'
import { buildPendingSelectionClearState, buildUnsavedSelectionModalPayload } from './productWorkspaceState.js'
import useDebouncedStorageEffect from './useDebouncedStorageEffect.js'
import { getCurrentOpenProductId, resolveNextProductNavigation } from './utils.js'

function normalizeStoredProductSelection(value) {
  if (!Array.isArray(value)) return []

  return Array.from(new Set(
    value
      .map((candidateId) => Number(candidateId))
      .filter((candidateId) => Number.isFinite(candidateId))
  ))
}

function readStoredProductSelection() {
  if (typeof window === 'undefined') return []

  try {
    const rawValue = window.localStorage.getItem(PRODUCT_SELECTION_STORAGE_KEY)
    const parsedValue = rawValue ? JSON.parse(rawValue) : []
    return normalizeStoredProductSelection(parsedValue)
  } catch {
    return []
  }
}

export default function useProductSelectionWorkspace({
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
}) {
  const [managedEditProductId, setManagedEditProductId] = useState(null)
  const [selectedProductIds, setSelectedProductIds] = useState(() => readStoredProductSelection())
  const [modificationProductIds, setModificationProductIds] = useState([])
  const [deleteModalState, setDeleteModalState] = useState({
    isOpen: false,
    productIds: [],
    redirectTo: null,
  })
  const [unsavedSelectionModalState, setUnsavedSelectionModalState] = useState({
    isOpen: false,
    draftIds: [],
    productIds: [],
    label: '',
  })

  const selectedProductIdsRef = useRef(selectedProductIds)
  const modificationProductIdsRef = useRef(modificationProductIds)
  const createDraftsRef = useRef(createDrafts)
  const savedCreateDraftIdsRef = useRef(savedCreateDraftIds)

  useEffect(() => {
    selectedProductIdsRef.current = selectedProductIds
    modificationProductIdsRef.current = modificationProductIds
    createDraftsRef.current = createDrafts
    savedCreateDraftIdsRef.current = savedCreateDraftIds
  }, [createDrafts, modificationProductIds, savedCreateDraftIds, selectedProductIds])

  const currentOpenProductId = useMemo(() => getCurrentOpenProductId({
    managedEditProductId,
    pageType,
    productId,
  }), [managedEditProductId, pageType, productId])

  useDebouncedStorageEffect({
    delay: 0,
    key: PRODUCT_SELECTION_STORAGE_KEY,
    value: normalizeStoredProductSelection(selectedProductIds),
  })

  useEffect(() => {
    if (managedEditProductId == null) return
    if (modificationProductIds.includes(managedEditProductId)) return

    const timeoutId = setTimeout(() => {
      setManagedEditProductId(modificationProductIds[0] ?? null)
    }, 0)
    return () => clearTimeout(timeoutId)
  }, [managedEditProductId, modificationProductIds])

  useEffect(() => {
    if (pageType !== 'product-edit' || !productId) return

    const resolvedProductId = Number(productId)
    if (!Number.isFinite(resolvedProductId)) return

    const timeoutId = setTimeout(() => {
      setManagedEditProductId(resolvedProductId)
    }, 0)
    return () => clearTimeout(timeoutId)
  }, [pageType, productId])

  const toggleSelectedProductId = useCallback((productIdToToggle) => {
    setSelectedProductIds((prev) => (
      prev.includes(productIdToToggle)
        ? prev.filter((id) => id !== productIdToToggle)
        : [...prev, productIdToToggle]
    ))
  }, [])

  const handleRemovePendingSelectedProduct = useCallback((productIdToRemove) => {
    const normalizedProductId = Number(productIdToRemove)
    const nextSelectedProductIds = selectedProductIdsRef.current.filter((id) => Number(id) !== normalizedProductId)
    const nextModificationProductIds = modificationProductIdsRef.current.filter((id) => Number(id) !== normalizedProductId)
    const nextEditDraftsByProductId = { ...editDraftsByProductId }
    delete nextEditDraftsByProductId[String(normalizedProductId)]
    const nextNavigation = resolveNextProductNavigation({
      editDraftsByProductId,
      excludedProductIds: [normalizedProductId],
      products,
      selectedProductIds: selectedProductIdsRef.current,
    })
    const isRemovingCurrentProduct = Number(currentOpenProductId) === normalizedProductId

    setSelectedProductIds(nextSelectedProductIds)
    setModificationProductIds(nextModificationProductIds)
    setEditDraftsByProductId(nextEditDraftsByProductId)

    if (isRemovingCurrentProduct) {
      navigate(nextNavigation.targetPath, { replace: true })
    }
  }, [
    currentOpenProductId,
    editDraftsByProductId,
    navigate,
    products,
    setEditDraftsByProductId,
  ])

  const selectAllFilteredProducts = useCallback((filteredProductIds) => {
    setSelectedProductIds((prev) => {
      const next = [...prev]
      filteredProductIds.forEach((id) => {
        if (!next.includes(id)) next.push(id)
      })
      return next
    })
  }, [])

  const clearPendingSelectedProducts = useCallback((pendingSelectedProductIds) => {
    const nextSelectedProductIds = selectedProductIdsRef.current.filter((id) => !pendingSelectedProductIds.includes(Number(id)))
    const nextModificationProductIds = modificationProductIdsRef.current.filter((id) => !pendingSelectedProductIds.includes(Number(id)))
    setSelectedProductIds(nextSelectedProductIds)
    setModificationProductIds(nextModificationProductIds)
  }, [])

  const handleClearPendingSelection = useCallback(() => {
    const nextState = buildPendingSelectionClearState({
      activeCreateDraftId,
      createDrafts: createDraftsRef.current,
      currentOpenProductId,
      editDraftsByProductId,
      isCreateSection,
      products,
      savedCreateDraftIds: savedCreateDraftIdsRef.current,
      selectedProductIds: selectedProductIdsRef.current,
    })

    const nextCreateDrafts = createDraftsRef.current.filter((draft) => !nextState.untouchedDraftIds.includes(draft.id))
    const nextSavedCreateDraftIds = savedCreateDraftIdsRef.current.filter((id) => !nextState.untouchedDraftIds.includes(id))
    const nextSelectedProductIds = selectedProductIdsRef.current.filter((id) => !nextState.untouchedProductIds.includes(Number(id)))
    const nextModificationProductIds = modificationProductIdsRef.current.filter((id) => !nextState.untouchedProductIds.includes(Number(id)))
    const nextEditDraftsByProductId = { ...editDraftsByProductId }
    nextState.untouchedProductIds.forEach((candidateProductId) => {
      delete nextEditDraftsByProductId[String(candidateProductId)]
    })

    setCreateDrafts(nextCreateDrafts)
    setSavedCreateDraftIds(nextSavedCreateDraftIds)
    setSelectedProductIds(nextSelectedProductIds)
    setModificationProductIds(nextModificationProductIds)
    setEditDraftsByProductId(nextEditDraftsByProductId)

    if (nextState.shouldResetCreateDraft) {
      setIsClosingCreateWorkspace(true)
      setActiveCreateDraftId(null)
      resetCreateWorkspaceView()
    }

    if (nextState.shouldNavigate) {
      navigate(nextState.shouldResetCreateDraft ? '/products' : nextState.nextNavigation.targetPath, { replace: true })
    }
  }, [
    activeCreateDraftId,
    currentOpenProductId,
    editDraftsByProductId,
    isCreateSection,
    navigate,
    products,
    resetCreateWorkspaceView,
    setActiveCreateDraftId,
    setCreateDrafts,
    setEditDraftsByProductId,
    setIsClosingCreateWorkspace,
    setSavedCreateDraftIds,
  ])

  const openDeleteProductsModal = useCallback((productIds, options = {}) => {
    const normalizedIds = Array.from(new Set(
      (Array.isArray(productIds) ? productIds : [])
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id))
    ))

    if (normalizedIds.length === 0) {
      setError(ADMIN_ERROR_MESSAGES.selectProduct)
      return
    }

    setError(null)
    setDeleteModalState({
      isOpen: true,
      productIds: normalizedIds,
      redirectTo: options.redirectTo || null,
    })
  }, [setError])

  const closeUnsavedSelectionModal = useCallback(() => {
    setUnsavedSelectionModalState({
      isOpen: false,
      draftIds: [],
      productIds: [],
      label: '',
    })
  }, [])

  const openUnsavedSelectionModal = useCallback((options = {}) => {
    const nextState = buildUnsavedSelectionModalPayload(options)
    if (!nextState) return
    setUnsavedSelectionModalState(nextState)
  }, [])

  const openProductModificationWorkspace = useCallback((productIdToOpen, options = {}) => {
    const resolvedProductId = Number(productIdToOpen)
    if (!Number.isFinite(resolvedProductId)) return false

    setModificationProductIds((prev) => (
      prev.includes(resolvedProductId)
        ? prev
        : [resolvedProductId, ...prev]
    ))
    setManagedEditProductId(resolvedProductId)
    setError(null)
    navigate(`/products/${resolvedProductId}/edit#product-details`, options)
    return true
  }, [navigate, setError])

  return {
    clearPendingSelectedProducts,
    closeUnsavedSelectionModal,
    currentOpenProductId,
    deleteModalState,
    handleClearPendingSelection,
    handleRemovePendingSelectedProduct,
    managedEditProductId,
    modificationProductIds,
    openDeleteProductsModal,
    openProductModificationWorkspace,
    openUnsavedSelectionModal,
    selectAllFilteredProducts,
    selectedProductIds,
    setDeleteModalState,
    setManagedEditProductId,
    setModificationProductIds,
    setSelectedProductIds,
    toggleSelectedProductId,
    unsavedSelectionModalState,
  }
}
