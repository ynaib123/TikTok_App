import { resolveActiveCategory } from './adminCategoryState.js'
import {
  buildAdminSelectionModel,
  getVisibleNumericIds,
} from './adminSelectionModel.js'

export function clampCategoryPage(page, totalPages) {
  const resolvedTotalPages = Math.max(1, Number(totalPages || 1))
  return Math.min(resolvedTotalPages, Math.max(1, Number(page || 1)))
}

export function getVisibleCategoryIds(categories) {
  return getVisibleNumericIds(categories, (category) => category?.id)
}

export function reconcileVisibleCategorySelection(selectedCategoryIds, categories) {
  const visibleIds = new Set(getVisibleCategoryIds(categories))
  const normalizedSelectedIds = Array.isArray(selectedCategoryIds) ? selectedCategoryIds : []
  const nextSelectedIds = normalizedSelectedIds.filter((categoryId) => visibleIds.has(Number(categoryId)))

  if (nextSelectedIds.length === normalizedSelectedIds.length
    && nextSelectedIds.every((categoryId, index) => Number(categoryId) === Number(normalizedSelectedIds[index]))) {
    return normalizedSelectedIds
  }

  return nextSelectedIds
}

export function buildDeleteModalCategories(categoryIds, categoryMap) {
  return (Array.isArray(categoryIds) ? categoryIds : [])
    .map((categoryId) => categoryMap.get(Number(categoryId)))
    .filter(Boolean)
}

export function resolveCategoryEditorState(categories, activeCategoryId) {
  const activeCategory = resolveActiveCategory(categories, activeCategoryId)
  if (!activeCategory) {
    return {
      activeCategory: null,
      activeCategoryId: null,
      editCategoryForm: { libelle: '' },
    }
  }

  return {
    activeCategory,
    activeCategoryId: Number(activeCategory.id),
    editCategoryForm: { libelle: String(activeCategory.libelle || '') },
  }
}

export function buildCategorySelectionModel({
  activeCategoryId = null,
  categories = [],
  selectedCategoryIds = [],
} = {}) {
  return buildAdminSelectionModel({
    activeId: activeCategoryId,
    selectedIds: selectedCategoryIds,
    visibleIds: getVisibleCategoryIds(categories),
  })
}
