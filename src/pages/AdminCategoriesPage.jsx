import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminShell from '../components/AdminShell'
import AdminCategoryDeleteModal from './admin-dashboard/AdminCategoryDeleteModal'
import AdminCategoryManagementSection from './admin-dashboard/AdminCategoryManagementSection'
import AdminCategorySelectionSidebar from './admin-dashboard/AdminCategorySelectionSidebar'
import useAdminCategoryCatalogState from './admin-dashboard/useAdminCategoryCatalogState'
import { resolveActiveCategory } from './admin-dashboard/adminCategoryState'
import {
  buildDeleteModalCategories,
  clampCategoryPage,
  getVisibleCategoryIds,
  resolveCategoryEditorState,
} from './admin-dashboard/categoryPageState'
import useAdminCategoryResources from './admin-dashboard/useAdminCategoryResources'
import useAdminCategoryUiActions from './admin-dashboard/useAdminCategoryUiActions'
import useAdminCategoryViewProps from './admin-dashboard/useAdminCategoryViewProps'
import '../styles/features/catalog.css'
import '../styles/components/forms.css'
import '../styles/features/catalog-shared.css'
import '../styles/features/categories.css'

export default function AdminCategoriesPage() {
  const navigate = useNavigate()
  const categoryCatalogState = useAdminCategoryCatalogState()
  const categoryResources = useAdminCategoryResources({
    page: categoryCatalogState.categoryPage,
    search: categoryCatalogState.debouncedCategorySearch,
    size: categoryCatalogState.categoriesPerPage,
    sort: categoryCatalogState.categorySort,
  })
  const {
    activeCategoryId,
    categoryDeleteModalState,
    closeDeleteModal,
    createCategoryForm,
    editCategoryForm,
    openDeleteModalWithIds,
    resetCreateCategoryForm,
    resetMergeCategoryForm,
    selectedCategoryIds,
    selectedCategoryLabelsById,
    setActiveCategoryId,
    setCategoryPage,
    setCreateCategoryForm,
    setEditCategoryForm,
    setMergeCategoryForm,
    setSelectedCategoryIds,
  } = categoryCatalogState
  const {
    categories,
    categoryCatalogTotalPages,
    categoryDeletePreview,
    categoryMap,
    clearCategoryDeletePreview,
    error,
    info,
    invalidateCategoryCatalog,
    loadCategoryCatalog,
    loadCategoryDeletePreview,
    loading,
    setCategories,
    setError,
    setInfo,
  } = categoryResources

  useEffect(() => {
    const resolvedPage = clampCategoryPage(categoryCatalogState.categoryPage, categoryCatalogTotalPages)
    if (categoryCatalogState.categoryPage > resolvedPage) {
      setCategoryPage(resolvedPage)
    }
  }, [categoryCatalogState.categoryPage, categoryCatalogTotalPages, setCategoryPage])

  useEffect(() => {
    if (loading && categories.length === 0) return

    const nextEditorState = resolveCategoryEditorState(categories, activeCategoryId)
    if (!nextEditorState.activeCategory) {
      if (Number.isFinite(Number(activeCategoryId)) && selectedCategoryLabelsById[String(activeCategoryId)]) {
        setEditCategoryForm((prev) => {
          const nextLibelle = String(selectedCategoryLabelsById[String(activeCategoryId)] || '')
          return prev.libelle === nextLibelle ? prev : { libelle: nextLibelle }
        })
        return
      }

      setActiveCategoryId(null)
      setEditCategoryForm(nextEditorState.editCategoryForm)
      return
    }

    setActiveCategoryId(nextEditorState.activeCategoryId)
    setEditCategoryForm((prev) => {
      const nextLibelle = nextEditorState.editCategoryForm.libelle
      return prev.libelle === nextLibelle ? prev : { libelle: nextLibelle }
    })
  }, [
    activeCategoryId,
    categories,
    loading,
    selectedCategoryLabelsById,
    setActiveCategoryId,
    setEditCategoryForm,
  ])

  useEffect(() => {
    if (!info) return undefined
    const timer = window.setTimeout(() => setInfo(null), 4000)
    return () => window.clearTimeout(timer)
  }, [info, setInfo])

  const {
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
  } = useAdminCategoryUiActions({
    activeCategoryId,
    categories,
    categoryDeleteModalState,
    closeDeleteModal,
    createCategoryForm,
    editCategoryForm,
    mergeCategoryForm: categoryCatalogState.mergeCategoryForm,
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
    setMergeCategoryForm,
    setError,
    setInfo,
    selectedCategoryIds,
    setSelectedCategoryIds,
    clearCategoryDeletePreview,
  })

  const deleteModalCategories = useMemo(() => (
    buildDeleteModalCategories(categoryDeleteModalState.categoryIds, categoryMap)
  ), [categoryDeleteModalState.categoryIds, categoryMap])

  const activeCategory = useMemo(() => (
    resolveActiveCategory(categories, activeCategoryId)
  ), [activeCategoryId, categories])

  const filteredCategoryIds = useMemo(() => getVisibleCategoryIds(categories), [categories])

  const handleSelectAllFilteredCategories = () => {
    categoryCatalogState.handleSelectAllFilteredCategories(categories)
  }

  const handleOpenCategoryProducts = (category) => {
    const resolvedCategoryId = String(category?.id || '').trim()
    if (!resolvedCategoryId) return

    navigate(`/products?categoryId=${encodeURIComponent(resolvedCategoryId)}`)
  }

  const {
    deleteModalProps,
    managementSectionProps,
    selectionSidebarProps,
  } = useAdminCategoryViewProps({
    actions: {
      handleCloseCategoryDeleteModal,
      handleCreateCategory,
      handleDeleteSelectedCategories,
      handleMergeCategories,
      handleOpenCategoryProducts,
      handleUpdateCategory,
      isCreatingCategory,
      isDeletingCategory,
      isMergingCategories,
      isUpdatingCategory,
      openCategoryDeleteModal,
    },
    derived: {
      activeCategory,
      deleteModalCategories,
      filteredCategoryIds,
      handleSelectAllFilteredCategories,
    },
    resources: {
      ...categoryResources,
      categoryDeletePreview,
    },
    state: categoryCatalogState,
  })

  return (
    <div className="admin-page admin-page-categories">
      <AdminShell
        activeNavId="categories"
        feedbackItems={[
          { type: 'error', message: error, onClose: () => setError(null) },
          { type: 'success', message: info, onClose: () => setInfo(null) },
        ]}
      >
        <div className="admin-console-layout has-selection-sidebar">
          <div className="admin-console-shell is-products-page admin-categories-page-shell">
            <AdminCategoryManagementSection {...managementSectionProps} />
            <AdminCategoryDeleteModal {...deleteModalProps} />
          </div>

          <AdminCategorySelectionSidebar
            key={activeCategory?.id != null ? `category-sidebar-${activeCategory.id}` : 'category-sidebar-empty'}
            {...selectionSidebarProps}
          />
        </div>
      </AdminShell>
    </div>
  )
}
