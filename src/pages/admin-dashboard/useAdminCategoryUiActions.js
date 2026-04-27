import { useCallback, useState } from 'react'
import { apiDelete, apiPost, apiPut } from '../../services/adminApiClient.js'
import { EMPTY_CATEGORY_FORM, EMPTY_CATEGORY_MERGE_FORM } from './constants.js'
import {
  ADMIN_ERROR_MESSAGES,
  ADMIN_INFO_MESSAGES,
} from './feedbackMessages.js'
import {
  buildCategoryDeleteModalState,
  normalizeCategorySelection,
} from './adminCategoryState.js'
import { appendStoredSessionActivity } from './sessionActivityStorage.js'
import { createSessionActivityEntry } from './utils.js'

async function deleteCategoriesWithFallback(categoryIds) {
  try {
    return await apiPost(
      '/categories/admin/delete-bulk',
      { categoryIds },
      { suppressConsoleError: true }
    )
  } catch (err) {
    if (Number(err?.status) !== 404) {
      throw err
    }

    for (const categoryId of categoryIds) {
      await apiDelete(`/categories/${categoryId}`, { suppressConsoleError: true })
    }

    return {
      deletedCategoryCount: categoryIds.length,
      deletedProductCount: null,
      referencedOrderLineCount: null,
      message: categoryIds.length > 1
        ? 'Categories supprimees avec succes.'
        : 'Categorie supprimee avec succes.',
    }
  }
}

export function buildOpenCategoryDeleteModalPayload(categoryIds = []) {
  const normalizedIds = normalizeCategorySelection(categoryIds)
  if (normalizedIds.length === 0) {
    return {
      error: ADMIN_ERROR_MESSAGES.selectCategory,
      nextState: buildCategoryDeleteModalState([], false),
    }
  }

  return {
    error: null,
    nextState: buildCategoryDeleteModalState(normalizedIds, true),
  }
}

export function buildCategoryMergePayload(categoryIds = [], libelle = '') {
  const normalizedIds = normalizeCategorySelection(categoryIds)
  const normalizedLabel = String(libelle || '').trim()

  if (normalizedIds.length < 2) {
    return {
      error: ADMIN_ERROR_MESSAGES.selectCategoriesForMerge,
      payload: null,
    }
  }

  if (!normalizedLabel) {
    return {
      error: ADMIN_ERROR_MESSAGES.categoryLabelRequired,
      payload: null,
    }
  }

  return {
    error: null,
    payload: {
      categoryIds: normalizedIds,
      libelle: normalizedLabel,
    },
  }
}

export default function useAdminCategoryUiActions({
  activeCategoryId,
  categories,
  categoryDeleteModalState,
  closeDeleteModal,
  createCategoryForm,
  editCategoryForm,
  mergeCategoryForm,
  invalidateCategoryCatalog,
  loadCategoryCatalog,
  loadCategoryDeletePreview,
  openDeleteModalWithIds,
  resetCreateCategoryForm,
  resetMergeCategoryForm,
  setActiveCategoryId,
  setCategories,
  setCreateCategoryForm,
  setEditCategoryForm,
  setError,
  setInfo,
  selectedCategoryIds,
  setSelectedCategoryIds,
  clearCategoryDeletePreview,
}) {
  const [isCreatingCategory, setIsCreatingCategory] = useState(false)
  const [isUpdatingCategory, setIsUpdatingCategory] = useState(false)
  const [isDeletingCategory, setIsDeletingCategory] = useState(false)
  const [isMergingCategories, setIsMergingCategories] = useState(false)

  const appendCategorySessionActivity = useCallback((entries) => {
    appendStoredSessionActivity(entries)
  }, [])

  const handleCreateCategory = useCallback(async () => {
    const libelle = String(createCategoryForm.libelle || '').trim()
    if (!libelle) {
      setError(ADMIN_ERROR_MESSAGES.categoryLabelRequired)
      return
    }

    setIsCreatingCategory(true)
    setError(null)

    try {
      const createdCategory = await apiPost('/categories', { libelle })
      invalidateCategoryCatalog()
      const refreshedCatalog = await loadCategoryCatalog({ force: true })
      const nextActiveCategoryId = Number(createdCategory?.id)
      if (Number.isFinite(nextActiveCategoryId)) {
        setActiveCategoryId(nextActiveCategoryId)
      }
      setEditCategoryForm({ libelle: String(createdCategory?.libelle || libelle) })
      resetCreateCategoryForm()
      setInfo(ADMIN_INFO_MESSAGES.categoryCreated)
      appendCategorySessionActivity(createSessionActivityEntry('Ajout', createdCategory, 'category'))

      if (refreshedCatalog?.items) {
        setCategories(refreshedCatalog.items)
      }
    } catch (err) {
      setError(err.message || ADMIN_ERROR_MESSAGES.createCategory)
    } finally {
      setIsCreatingCategory(false)
    }
  }, [
    appendCategorySessionActivity,
    createCategoryForm.libelle,
    invalidateCategoryCatalog,
    loadCategoryCatalog,
    resetCreateCategoryForm,
    setActiveCategoryId,
    setCategories,
    setEditCategoryForm,
    setError,
    setInfo,
  ])

  const handleUpdateCategory = useCallback(async () => {
    const resolvedCategoryId = Number(activeCategoryId)
    const libelle = String(editCategoryForm.libelle || '').trim()

    if (!Number.isFinite(resolvedCategoryId)) {
      setError(ADMIN_ERROR_MESSAGES.selectCategory)
      return
    }
    if (!libelle) {
      setError(ADMIN_ERROR_MESSAGES.categoryLabelRequired)
      return
    }

    setIsUpdatingCategory(true)
    setError(null)

    try {
      const updatedCategory = await apiPut(`/categories/${resolvedCategoryId}`, { libelle })
      invalidateCategoryCatalog()
      setCategories((prev) => prev.map((category) => (
        Number(category?.id) === resolvedCategoryId
          ? { ...category, ...updatedCategory, libelle }
          : category
      )))
      setInfo(ADMIN_INFO_MESSAGES.categoryUpdated)
      appendCategorySessionActivity(createSessionActivityEntry('Modification', { id: resolvedCategoryId, libelle }, 'category'))
    } catch (err) {
      setError(err.message || ADMIN_ERROR_MESSAGES.updateCategory)
    } finally {
      setIsUpdatingCategory(false)
    }
  }, [
    activeCategoryId,
    appendCategorySessionActivity,
    editCategoryForm.libelle,
    invalidateCategoryCatalog,
    setCategories,
    setError,
    setInfo,
  ])

  const openCategoryDeleteModal = useCallback(async (categoryIds) => {
    const { error, nextState } = buildOpenCategoryDeleteModalPayload(categoryIds)
    if (error) {
      setError(error)
      return
    }

    setError(null)
    openDeleteModalWithIds(nextState.categoryIds)
    await loadCategoryDeletePreview(nextState.categoryIds)
  }, [loadCategoryDeletePreview, openDeleteModalWithIds, setError])

  const handleCloseCategoryDeleteModal = useCallback(() => {
    if (isDeletingCategory) return
    clearCategoryDeletePreview()
    closeDeleteModal()
  }, [clearCategoryDeletePreview, closeDeleteModal, isDeletingCategory])

  const handleDeleteSelectedCategories = useCallback(async (categoryIds = categoryDeleteModalState.categoryIds) => {
    const normalizedIds = normalizeCategorySelection(categoryIds)
    if (normalizedIds.length === 0) return

    setIsDeletingCategory(true)
    setError(null)

    try {
      const response = await deleteCategoriesWithFallback(normalizedIds)
      invalidateCategoryCatalog()
      setCategories((prev) => prev.filter((category) => !normalizedIds.includes(Number(category?.id))))
      setSelectedCategoryIds((prev) => prev.filter((id) => !normalizedIds.includes(Number(id))))
      clearCategoryDeletePreview()
      closeDeleteModal()
      setEditCategoryForm(EMPTY_CATEGORY_FORM)
      setCreateCategoryForm(EMPTY_CATEGORY_FORM)
      setInfo(response?.message || ADMIN_INFO_MESSAGES.categoriesDeleted)
      appendCategorySessionActivity(
        (Array.isArray(categories) ? categories : [])
          .filter((category) => normalizedIds.includes(Number(category?.id)))
          .map((category) => createSessionActivityEntry('Suppression', category, 'category'))
      )
      await loadCategoryCatalog({ force: true })
    } catch (err) {
      setError(err.message || ADMIN_ERROR_MESSAGES.deleteCategory)
    } finally {
      setIsDeletingCategory(false)
    }
  }, [
    appendCategorySessionActivity,
    categories,
    categoryDeleteModalState.categoryIds,
    clearCategoryDeletePreview,
    closeDeleteModal,
    invalidateCategoryCatalog,
    loadCategoryCatalog,
    setCategories,
    setCreateCategoryForm,
    setEditCategoryForm,
    setError,
    setInfo,
    setSelectedCategoryIds,
  ])

  const handleMergeCategories = useCallback(async () => {
    const { error, payload } = buildCategoryMergePayload(selectedCategoryIds, mergeCategoryForm.libelle)
    if (error || !payload) {
      setError(error || ADMIN_ERROR_MESSAGES.mergeCategory)
      return
    }

    setIsMergingCategories(true)
    setError(null)

    try {
      const response = await apiPost('/categories/admin/merge', payload)
      invalidateCategoryCatalog()
      const refreshedCatalog = await loadCategoryCatalog({ force: true })

      const mergedCategoryId = Number(response?.mergedCategoryId)
      const mergedLabel = String(response?.libelle || payload.libelle)

      if (Number.isFinite(mergedCategoryId)) {
        setActiveCategoryId(mergedCategoryId)
        setSelectedCategoryIds([mergedCategoryId])
      }

      setEditCategoryForm({ libelle: mergedLabel })
      resetMergeCategoryForm()
      setInfo(response?.message || ADMIN_INFO_MESSAGES.categoriesMerged)
      appendCategorySessionActivity(createSessionActivityEntry('Fusion', { id: mergedCategoryId, libelle: mergedLabel }, 'category'))

      if (refreshedCatalog?.items) {
        setCategories(refreshedCatalog.items)
      }
    } catch (err) {
      setError(err.message || ADMIN_ERROR_MESSAGES.mergeCategory)
    } finally {
      setIsMergingCategories(false)
    }
  }, [
    appendCategorySessionActivity,
    invalidateCategoryCatalog,
    loadCategoryCatalog,
    mergeCategoryForm.libelle,
    selectedCategoryIds,
    setActiveCategoryId,
    setCategories,
    setEditCategoryForm,
    setError,
    setInfo,
    setSelectedCategoryIds,
    resetMergeCategoryForm,
  ])

  return {
    handleCloseCategoryDeleteModal,
    handleCreateCategory,
    handleMergeCategories,
    handleDeleteSelectedCategories,
    handleUpdateCategory,
    isCreatingCategory,
    isDeletingCategory,
    isMergingCategories,
    isUpdatingCategory,
    openCategoryDeleteModal,
  }
}
