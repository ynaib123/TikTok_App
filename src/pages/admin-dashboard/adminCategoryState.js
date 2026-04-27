import {
  normalizeNumericSelection,
  selectVisibleNumericIds,
  toggleNumericSelection,
} from './adminSelectionModel.js'

export function normalizeCategoryCatalogResponse(response) {
  const items = Array.isArray(response?.items)
    ? response.items
      .map((category) => {
        if (!category || typeof category !== 'object') return null

        return {
          ...category,
          id: Number(category.id),
          libelle: String(category.libelle || '').trim(),
          productCount: Number(category.productCount || 0),
          onlineProductCount: Number(category.onlineProductCount || 0),
        }
      })
      .filter((category) => Number.isFinite(category.id))
    : []

  return {
    items,
    page: Number(response?.page || 1),
    size: Number(response?.size || 20),
    totalItems: Number(response?.totalItems || 0),
    totalPages: Math.max(1, Number(response?.totalPages || 1)),
  }
}

export function normalizeCategorySelection(categoryIds = []) {
  return normalizeNumericSelection(categoryIds)
}

export function toggleCategorySelection(selectedCategoryIds = [], categoryId) {
  return toggleNumericSelection(selectedCategoryIds, categoryId)
}

export function selectVisibleCategories(selectedCategoryIds = [], categories = []) {
  return selectVisibleNumericIds(selectedCategoryIds, categories, (category) => category?.id)
}

export function resolveActiveCategory(categories = [], activeCategoryId) {
  const normalizedCategories = Array.isArray(categories) ? categories : []
  if (normalizedCategories.length === 0) return null
  if (!Number.isFinite(Number(activeCategoryId))) return null

  const currentCategory = normalizedCategories.find((category) => Number(category?.id) === Number(activeCategoryId))
  return currentCategory || null
}

export function buildCategoryDeleteModalState(categoryIds = [], isOpen = true) {
  return {
    isOpen,
    categoryIds: normalizeCategorySelection(categoryIds),
  }
}
