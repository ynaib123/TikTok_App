import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildCategoryDeleteModalProps,
  buildCategoryManagementSectionProps,
  buildCategorySelectionSidebarProps,
} from './categoryPanelProps.js'

test('buildCategoryManagementSectionProps keeps category section contract stable', () => {
  const noop = () => {}
  const result = buildCategoryManagementSectionProps({
    activeCategory: { id: 4, libelle: 'Gaming' },
    activeCategoryId: 4,
    categories: [{ id: 4, libelle: 'Gaming', productCount: 12 }],
    categoriesPerPage: 12,
    categoryCatalogTotalItems: 12,
    categoryCatalogTotalPages: 3,
    categoryPage: 2,
    categorySearch: 'gam',
    categorySort: 'usage_desc',
    createCategoryForm: { libelle: '' },
    editCategoryForm: { libelle: 'Gaming' },
    filteredCategoryIds: [4],
    handleCategorySelect: noop,
    handleClearAllSelectedCategories: noop,
    handleCreateCategory: noop,
    handleSelectAllFilteredCategories: noop,
    handleToggleSelectedCategoryId: noop,
    handleUpdateCategory: noop,
    hasSelectedCategories: true,
    isCreatingCategory: false,
    isDeletingCategory: false,
    isUpdatingCategory: true,
    loading: false,
    openCatalogMenu: 'category-sort',
    openCategoryDeleteModal: noop,
    presentation: { categoryCards: [{ id: 4, label: 'Gaming' }] },
    selectedCategoryIds: [4],
    selectedCategoriesPerPage: { value: 12, label: '12 categories par page' },
    selectedCategorySort: { value: 'usage_desc', label: 'Plus utilisees' },
    setCategoryPage: noop,
    setCategorySearch: noop,
    setCategorySort: noop,
    setCategoriesPerPage: noop,
    setCreateCategoryForm: noop,
    setEditCategoryForm: noop,
    setOpenCatalogMenu: noop,
    truncateLabel: noop,
  })

  assert.equal(result.categoryPage, 2)
  assert.equal(result.categorySort, 'usage_desc')
  assert.equal(result.hasSelectedCategories, true)
  assert.equal(result.presentation.categoryCards[0].label, 'Gaming')
})

test('buildCategoryDeleteModalProps keeps delete modal contract stable', () => {
  const noop = () => {}
  const result = buildCategoryDeleteModalProps({
    categoryDeleteModalState: { isOpen: true, categoryIds: [3, 4] },
    categoryDeletePreview: { categoryCount: 2, productCount: 5, referencedOrderLineCount: 1 },
    closeCategoryDeleteModal: noop,
    deleteModalCategories: [{ id: 3 }],
    handleDeleteSelectedCategories: noop,
    isDeletePreviewLoading: false,
    isDeletingCategory: true,
    truncateLabel: noop,
  })

  assert.equal(result.categoryDeleteModalState.isOpen, true)
  assert.equal(result.categoryDeletePreview.productCount, 5)
  assert.equal(result.isDeletingCategory, true)
})

test('buildCategorySelectionSidebarProps keeps sidebar contract stable', () => {
  const noop = () => {}
  const result = buildCategorySelectionSidebarProps({
    activeCategory: { id: 4, libelle: 'Gaming' },
    createCategoryForm: { libelle: '' },
    editCategoryForm: { libelle: 'Gaming' },
    mergeCategoryForm: { libelle: 'Univers gaming' },
    handleCreateCategory: noop,
    handleMergeCategories: noop,
    handleUpdateCategory: noop,
    isCreatingCategory: false,
    isDeletingCategory: false,
    isMergingCategories: true,
    isUpdatingCategory: false,
    presentation: { heroTitle: 'Gaming', selectionSummary: '3 selectionnes' },
    selectedCategoryCount: 3,
    setCreateCategoryForm: noop,
    setEditCategoryForm: noop,
    setMergeCategoryForm: noop,
    totalCategoryCount: 12,
    truncateLabel: noop,
  })

  assert.equal(result.mergeCategoryForm.libelle, 'Univers gaming')
  assert.equal(result.selectedCategoryCount, 3)
  assert.equal(result.isMergingCategories, true)
  assert.equal(result.presentation.heroTitle, 'Gaming')
})
