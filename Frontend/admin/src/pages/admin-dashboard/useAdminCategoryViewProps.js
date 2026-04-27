import { useMemo } from 'react'
import {
  buildCategoryDeleteModalProps,
  buildCategoryManagementSectionProps,
  buildCategorySelectionSidebarProps,
} from './categoryPanelProps'
import {
  buildCategoryCardPresentation,
  buildCategoryWorkspacePresentation,
} from './categoryPresentationState.js'
import { truncateLabel } from './utils'

export default function useAdminCategoryViewProps({
  actions,
  derived,
  resources,
  state,
}) {
  const selectedCategoryCount = state.selectedCategoryIds.length

  const managementSectionProps = useMemo(() => buildCategoryManagementSectionProps({
    activeCategory: derived.activeCategory,
    activeCategoryId: state.activeCategoryId,
    categories: resources.categories,
    categoriesPerPage: state.categoriesPerPage,
    categoryCatalogTotalItems: resources.categoryCatalogTotalItems,
    categoryCatalogTotalPages: resources.categoryCatalogTotalPages,
    categoryPage: state.categoryPage,
    categorySearch: state.categorySearch,
    categorySort: state.categorySort,
    createCategoryForm: state.createCategoryForm,
    editCategoryForm: state.editCategoryForm,
    filteredCategoryIds: derived.filteredCategoryIds,
    handleCategorySelect: state.handleCategorySelect,
    handleClearAllSelectedCategories: state.handleClearAllSelectedCategories,
    handleCreateCategory: actions.handleCreateCategory,
    handleOpenCategoryProducts: actions.handleOpenCategoryProducts,
    handleSelectAllFilteredCategories: derived.handleSelectAllFilteredCategories,
    handleToggleSelectedCategoryId: state.handleToggleSelectedCategoryId,
    handleUpdateCategory: actions.handleUpdateCategory,
    hasSelectedCategories: state.hasSelectedCategories,
    isCreatingCategory: actions.isCreatingCategory,
    isDeletingCategory: actions.isDeletingCategory,
    isUpdatingCategory: actions.isUpdatingCategory,
    loading: resources.loading,
    openCatalogMenu: state.openCatalogMenu,
    openCategoryDeleteModal: actions.openCategoryDeleteModal,
    presentation: {
      categoryCards: resources.categories.map(buildCategoryCardPresentation),
    },
    selectedCategoryIds: state.selectedCategoryIds,
    selectedCategoriesPerPage: state.selectedCategoriesPerPage,
    selectedCategorySort: state.selectedCategorySort,
    setCategoryPage: state.setCategoryPage,
    setCategorySearch: state.setCategorySearch,
    setCategorySort: state.setCategorySort,
    setCategoriesPerPage: state.setCategoriesPerPage,
    setCreateCategoryForm: state.setCreateCategoryForm,
    setEditCategoryForm: state.setEditCategoryForm,
    setOpenCatalogMenu: state.setOpenCatalogMenu,
    truncateLabel,
  }), [
    actions,
    derived,
    resources,
    state,
  ])

  const deleteModalProps = useMemo(() => buildCategoryDeleteModalProps({
    categoryDeleteModalState: state.categoryDeleteModalState,
    categoryDeletePreview: resources.categoryDeletePreview,
    closeCategoryDeleteModal: actions.handleCloseCategoryDeleteModal,
    deleteModalCategories: derived.deleteModalCategories,
    handleDeleteSelectedCategories: actions.handleDeleteSelectedCategories,
    isDeletePreviewLoading: resources.isDeletePreviewLoading,
    isDeletingCategory: actions.isDeletingCategory,
    truncateLabel,
  }), [
    actions,
    derived.deleteModalCategories,
    resources,
    state.categoryDeleteModalState,
  ])

  const selectionSidebarProps = useMemo(() => buildCategorySelectionSidebarProps({
    activeCategory: derived.activeCategory,
    createCategoryForm: state.createCategoryForm,
    editCategoryForm: state.editCategoryForm,
    handleCategorySelect: state.handleCategorySelect,
    handleClearAllSelectedCategories: state.handleClearAllSelectedCategories,
    handleRemoveSelectedCategoryId: state.handleRemoveSelectedCategoryId,
    mergeCategoryForm: state.mergeCategoryForm,
    handleCreateCategory: actions.handleCreateCategory,
    handleMergeCategories: actions.handleMergeCategories,
    handleUpdateCategory: actions.handleUpdateCategory,
    isCreatingCategory: actions.isCreatingCategory,
    isDeletingCategory: actions.isDeletingCategory,
    isMergingCategories: actions.isMergingCategories,
    isUpdatingCategory: actions.isUpdatingCategory,
    presentation: buildCategoryWorkspacePresentation({
      activeCategory: derived.activeCategory,
      selectedCategoryCount,
      totalCategoryCount: resources.categoryCatalogTotalItems,
    }),
    selectedCategories: state.selectedCategoryIds.map((categoryId) => {
      const matchingCategory = resources.categories.find((category) => Number(category?.id) === Number(categoryId))
      if (matchingCategory) {
        return buildCategoryCardPresentation(matchingCategory)
      }

      if (Number(derived.activeCategory?.id) === Number(categoryId)) {
        return buildCategoryCardPresentation(derived.activeCategory)
      }

      const persistedLabel = String(state.selectedCategoryLabelsById?.[String(categoryId)] || '').trim()
      return {
        id: Number(categoryId),
        idLabel: `#${categoryId}`,
        label: persistedLabel || `Categorie #${categoryId}`,
        selectionMetaLabel: `Identifiant #${categoryId}`,
      }
    }),
    selectedCategoryIds: state.selectedCategoryIds,
    selectedCategoryCount,
    selectionModel: state.selectionModel,
    setCreateCategoryForm: state.setCreateCategoryForm,
    setEditCategoryForm: state.setEditCategoryForm,
    setMergeCategoryForm: state.setMergeCategoryForm,
    totalCategoryCount: resources.categoryCatalogTotalItems,
    truncateLabel,
  }), [
    actions,
    derived.activeCategory,
    resources.categoryCatalogTotalItems,
    resources.categories,
    state.createCategoryForm,
    state.editCategoryForm,
    state.handleCategorySelect,
    state.handleClearAllSelectedCategories,
    state.handleRemoveSelectedCategoryId,
    state.mergeCategoryForm,
    state.selectedCategoryIds,
    state.selectedCategoryLabelsById,
    state.selectionModel,
    state.setCreateCategoryForm,
    state.setEditCategoryForm,
    state.setMergeCategoryForm,
    selectedCategoryCount,
  ])

  return {
    deleteModalProps,
    managementSectionProps,
    selectionSidebarProps,
  }
}
