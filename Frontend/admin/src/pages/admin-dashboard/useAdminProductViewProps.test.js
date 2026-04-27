import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildActionModalProps,
  buildManagementSectionProps,
} from './useAdminProductViewProps.js'

test('buildManagementSectionProps keeps management section contract stable', () => {
  const noop = () => {}
  const result = buildManagementSectionProps({
    filteredProductCount: 24,
    filteredProductIds: [1, 2, 3],
    handleBulkProductPublishStatus: noop,
    handleClearAllSelectedProducts: noop,
    handleOpenProductCreateWorkspace: noop,
    handleOpenProductDetailsFromCatalog: noop,
    handleOpenProductImportModal: noop,
    handleSelectAllFilteredProducts: noop,
    hasSelectedProducts: true,
    isUpdatingProductPublishStatus: false,
    loading: false,
    openCatalogMenu: 'sort',
    openDeleteProductsModal: noop,
    paginatedProducts: [{ id: 1 }],
    pendingProductsPerPageScrollRef: { current: null },
    pendingSelectedProductIds: [1],
    pendingSelectedProductIdSet: new Set([1]),
    productCategoryFilter: 'all',
    productCategoryOptions: [{ value: 'all', label: 'Toutes categories' }],
    productPage: 2,
    productPublishStatusFilter: 'all',
    productSearch: 'lampe',
    productSort: 'recent',
    productStockFilter: 'all',
    productViewMode: 'grid',
    productsPerPage: 30,
    selectedProductCategory: { value: 'all', label: 'Toutes categories' },
    selectedProductFilterSummary: 'Aucun filtre',
    selectedProductPublishStatusFilter: { value: 'all', label: 'Tous les statuts' },
    selectedProductSort: { value: 'recent', label: 'Recents' },
    selectedProductsPerPage: { value: 30, label: '30' },
    selectedProductStockFilter: { value: 'all', label: 'Tous les stocks' },
    selectedProductViewMode: { value: 'grid', label: 'Grille' },
    setOpenCatalogMenu: noop,
    setProductCategoryFilter: noop,
    setProductPage: noop,
    setProductPublishStatusFilter: noop,
    setProductSearch: noop,
    setProductSort: noop,
    setProductStockFilter: noop,
    setProductViewMode: noop,
    setProductsPerPage: noop,
    toggleSelectedProductId: noop,
    totalProductPages: 4,
  })

  assert.equal(result.filteredProductCount, 24)
  assert.equal(result.hasSelectedProducts, true)
  assert.equal(result.openProductDetails, noop)
  assert.equal(typeof result.formatMoney, 'function')
  assert.equal(typeof result.hasActivePromotion, 'function')
})

test('buildActionModalProps includes import and delete modal flags', () => {
  const noop = () => {}
  const result = buildActionModalProps({
    closeDeleteModal: noop,
    closeProductImportModal: noop,
    closeUnsavedSelectionModal: noop,
    confirmUnsavedSelectionReset: noop,
    deleteModalProducts: [{ id: 2 }],
    deleteModalState: { isOpen: true, productIds: [2] },
    handleBulkProductDelete: noop,
    handleProductImportFileChange: noop,
    handleProductImportSubmit: noop,
    isDeletingProducts: true,
    isImportingProductFile: false,
    productImportModalState: { isOpen: true, files: [], error: null, importedRows: [] },
    unsavedSelectionModalState: { isOpen: false },
  })

  assert.equal(result.isDeletingProducts, true)
  assert.equal(result.isImportingProductFile, false)
  assert.equal(result.deleteModalState.isOpen, true)
  assert.equal(typeof result.truncateLabel, 'function')
})
