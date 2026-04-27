import { useCallback, useEffect, useMemo } from 'react'
import {
  EMPTY_PRODUCT_FORM_SNAPSHOT,
  createProductDraft,
  findFirstPendingCreateDraftId,
  isCreateDraftSaved,
} from './constants.js'
import {
  buildCreateDraftRemovalState,
  buildCreateWorkspaceState,
} from './productWorkspaceState.js'
import { normalizeImageUrlsText } from './utils.js'

export default function useProductCreateDraftWorkspace({
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
}) {
  const activeCreateDraft = useMemo(() => (
    createDrafts.find((draft) => draft.id === activeCreateDraftId) || null
  ), [activeCreateDraftId, createDrafts])

  const pendingCreateDrafts = useMemo(() => (
    createDrafts.filter((draft) => !draft.persistedProductId && !savedCreateDraftIds.includes(draft.id))
  ), [createDrafts, savedCreateDraftIds])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setSavedCreateDraftIds((prev) => prev.filter((id) => createDrafts.some((draft) => draft.id === id)))
    }, 0)
    return () => clearTimeout(timeoutId)
  }, [createDrafts, setSavedCreateDraftIds])

  useEffect(() => {
    if (!isCreateSection || isClosingCreateWorkspace) return

    if (createDrafts.length === 0) {
      const firstDraft = createProductDraft()
      const timeoutId = setTimeout(() => {
        setCreateDrafts([firstDraft])
        setActiveCreateDraftId(firstDraft.id)
      }, 0)
      return () => clearTimeout(timeoutId)
    }

    const activeDraft = activeCreateDraftId
      ? createDrafts.find((draft) => draft.id === activeCreateDraftId) || null
      : null
    const firstPendingDraftId = findFirstPendingCreateDraftId(createDrafts, savedCreateDraftIds)

    if (!activeDraft) {
      if (firstPendingDraftId) {
        const timeoutId = setTimeout(() => {
          setActiveCreateDraftId(firstPendingDraftId)
        }, 0)
        return () => clearTimeout(timeoutId)
      }

      const timeoutId = setTimeout(() => {
        navigate('/products', { replace: true })
      }, 0)
      return () => clearTimeout(timeoutId)
    }

    if (!isCreateDraftSaved(activeDraft, savedCreateDraftIds)) return

    if (firstPendingDraftId && firstPendingDraftId !== activeDraft.id) {
      const timeoutId = setTimeout(() => {
        setActiveCreateDraftId(firstPendingDraftId)
      }, 0)
      return () => clearTimeout(timeoutId)
    }

    if (!firstPendingDraftId) {
      const timeoutId = setTimeout(() => {
        setActiveCreateDraftId(null)
        navigate('/products', { replace: true })
      }, 0)
      return () => clearTimeout(timeoutId)
    }
  }, [
    activeCreateDraftId,
    createDrafts,
    isClosingCreateWorkspace,
    isCreateSection,
    navigate,
    savedCreateDraftIds,
    setActiveCreateDraftId,
    setCreateDrafts,
  ])

  useEffect(() => {
    if (isCreateSection) return
    if (!isClosingCreateWorkspace) return

    const timeoutId = setTimeout(() => {
      setIsClosingCreateWorkspace(false)
    }, 0)
    return () => clearTimeout(timeoutId)
  }, [isClosingCreateWorkspace, isCreateSection, setIsClosingCreateWorkspace])

  useEffect(() => {
    if (!isCreateSection || !activeCreateDraft) return

    setCreateForm(activeCreateDraft.form)
    setInitialCreateForm(EMPTY_PRODUCT_FORM_SNAPSHOT)
    const activeDraftCategory = categories.find((category) => String(category?.id) === String(activeCreateDraft.form.categorieId)) || null
    setCreateCategoryDraft(activeDraftCategory?.libelle ? String(activeDraftCategory.libelle) : '')
    setCreateImageUrlDraft('')

    const draftPreviewImage = activeCreateDraft.selectedPreviewImage
      || normalizeImageUrlsText(activeCreateDraft.form.imageUrlsText).split('\n').find(Boolean)
      || ''
    setSelectedCreatePreviewImage(draftPreviewImage)
  }, [
    activeCreateDraft,
    categories,
    isCreateSection,
    setCreateCategoryDraft,
    setCreateForm,
    setCreateImageUrlDraft,
    setInitialCreateForm,
    setSelectedCreatePreviewImage,
  ])

  const handleAddCreateDraft = useCallback((options = {}) => {
    const nextDraft = createProductDraft()
    const navigateTo = options.navigateTo || '/products/add'

    setIsClosingCreateWorkspace(false)
    setCreateDrafts((prev) => [...prev, nextDraft])
    setActiveCreateDraftId(nextDraft.id)
    setCreateForm(nextDraft.form)
    setInitialCreateForm(EMPTY_PRODUCT_FORM_SNAPSHOT)
    setCreateCategoryDraft('')
    setCreateImageUrlDraft('')
    setSelectedCreatePreviewImage(String(nextDraft.selectedPreviewImage || ''))
    setError(null)
    navigate(navigateTo)
  }, [
    navigate,
    setActiveCreateDraftId,
    setCreateCategoryDraft,
    setCreateDrafts,
    setCreateForm,
    setCreateImageUrlDraft,
    setError,
    setInitialCreateForm,
    setIsClosingCreateWorkspace,
    setSelectedCreatePreviewImage,
  ])

  const handleRemoveCreateDraft = useCallback((draftId) => {
    const nextState = buildCreateDraftRemovalState({
      activeCreateDraftId,
      createDrafts,
      draftId,
      savedCreateDraftIds,
    })

    setCreateDrafts(nextState.createDrafts)
    setSavedCreateDraftIds(nextState.savedCreateDraftIds)
    setActiveCreateDraftId(nextState.activeCreateDraftId)

    if (nextState.shouldNavigateToProducts) {
      setIsClosingCreateWorkspace(true)
      setActiveCreateDraftId(null)
      resetCreateWorkspaceView()
      navigate('/products')
      return
    }

    setError(null)
  }, [
    activeCreateDraftId,
    createDrafts,
    navigate,
    resetCreateWorkspaceView,
    savedCreateDraftIds,
    setActiveCreateDraftId,
    setCreateDrafts,
    setError,
    setIsClosingCreateWorkspace,
    setSavedCreateDraftIds,
  ])

  const handleSelectCreateDraft = useCallback((draftId) => {
    const selectedDraft = createDrafts.find((draft) => draft.id === draftId) || null
    if (!selectedDraft) return

    if (selectedDraft.persistedProductId) {
      navigate(`/products/${selectedDraft.persistedProductId}/edit#product-details`)
      return
    }

    setActiveCreateDraftId(draftId)
    setError(null)
    navigate('/products/add')
  }, [createDrafts, navigate, setActiveCreateDraftId, setError])

  const openProductCreateWorkspace = useCallback((mode = 'single') => {
    const nextState = buildCreateWorkspaceState({
      createProductDraft,
      mode,
    })
    setIsClosingCreateWorkspace(nextState.isClosingCreateWorkspace)
    setCreateDrafts((prev) => [...prev, ...nextState.createDrafts])
    setActiveCreateDraftId(nextState.activeCreateDraftId)
    setCreateForm(nextState.createForm)
    setInitialCreateForm(nextState.createSnapshot)
    setCreateCategoryDraft('')
    setCreateImageUrlDraft(nextState.createImageUrlDraft)
    setSelectedCreatePreviewImage(nextState.createPreviewImage)
    setError(null)
    navigate('/products/add')
  }, [
    navigate,
    setActiveCreateDraftId,
    setCreateCategoryDraft,
    setCreateDrafts,
    setCreateForm,
    setCreateImageUrlDraft,
    setError,
    setInitialCreateForm,
    setIsClosingCreateWorkspace,
    setSelectedCreatePreviewImage,
  ])

  return {
    activeCreateDraft,
    handleAddCreateDraft,
    handleRemoveCreateDraft,
    handleSelectCreateDraft,
    openProductCreateWorkspace,
    pendingCreateDrafts,
  }
}
