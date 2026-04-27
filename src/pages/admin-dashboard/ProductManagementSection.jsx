import { memo } from 'react'
import { ProductCatalogPanel } from './ProductPanels'
import { ProductManagementPagination, ProductManagementToolbar } from './ProductManagementPanels'

function ProductManagementSectionComponent({
  filteredProductCount,
  handleBulkProductPublishStatus,
  handleClearAllSelectedProducts,
  handleOpenProductCreateWorkspace,
  handleOpenProductImportModal,
  handleSelectAllFilteredProducts,
  hasSelectedProducts,
  isUpdatingProductPublishStatus,
  loading,
  openCatalogMenu,
  openDeleteProductsModal,
  openProductDetails,
  paginatedProducts,
  pendingProductsPerPageScrollRef,
  pendingSelectedProductIdSet,
  pendingSelectedProductIds,
  productCategoryFilter,
  productCategoryOptions,
  productPage,
  productPublishStatusFilter,
  productSearch,
  productSort,
  productStockFilter,
  productViewMode,
  productsPerPage,
  selectedProductCategory,
  selectedProductFilterSummary,
  selectedProductPublishStatusFilter,
  selectedProductSort,
  selectedProductsPerPage,
  selectedProductStockFilter,
  selectedProductViewMode,
  setOpenCatalogMenu,
  setProductCategoryFilter,
  setProductPage,
  setProductPublishStatusFilter,
  setProductSearch,
  setProductSort,
  setProductStockFilter,
  setProductViewMode,
  setProductsPerPage,
  toggleSelectedProductId,
  totalProductPages,
  formatMoney,
  getProductImage,
  getPromotionPrice,
  hasActivePromotion,
  filteredProductIds,
}) {
  const resolvedPaginatedProducts = Array.isArray(paginatedProducts) ? paginatedProducts : []
  const catalogTags = [
    productSearch
      ? {
          id: 'search',
          label: `Recherche: ${productSearch}`,
          isClearable: true,
          onClear: () => setProductSearch(''),
        }
      : null,
    {
      id: 'category',
      label: `Categorie: ${selectedProductCategory.label}`,
      isClearable: productCategoryFilter !== 'all',
      onClear: () => setProductCategoryFilter('all'),
    },
    {
      id: 'stock',
      label: `Stock: ${selectedProductStockFilter.label}`,
      isClearable: productStockFilter !== 'all',
      onClear: () => setProductStockFilter('all'),
    },
    {
      id: 'status',
      label: `Statut: ${selectedProductPublishStatusFilter.label}`,
      isClearable: productPublishStatusFilter !== 'all',
      onClear: () => setProductPublishStatusFilter('all'),
    },
    {
      id: 'sort',
      label: `Tri: ${selectedProductSort.label}`,
      isClearable: productSort !== 'recent',
      onClear: () => setProductSort('recent'),
    },
  ].filter(Boolean)
  const hasClearableCatalogTags = catalogTags.some((tag) => tag.isClearable)
  const handleResetAllCatalogTags = () => {
    setProductSearch('')
    setProductCategoryFilter('all')
    setProductStockFilter('all')
    setProductPublishStatusFilter('all')
    setProductSort('recent')
  }

  return (
    <section id="product-management">
      {catalogTags.length > 0 ? (
        <div className="admin-product-active-filters" aria-label="Filtres et tri actifs">
          <div className="admin-product-active-filters-list">
            {catalogTags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                className={`admin-product-active-filter-tag ${tag.isClearable ? 'is-clearable' : 'is-default'}`}
                onClick={tag.isClearable ? tag.onClear : undefined}
                title={tag.isClearable ? `Retirer ${tag.label}` : tag.label}
                disabled={!tag.isClearable}
              >
                <span>{tag.label}</span>
                {tag.isClearable ? <strong aria-hidden="true">×</strong> : null}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="admin-product-active-filters-reset"
            onClick={handleResetAllCatalogTags}
            disabled={!hasClearableCatalogTags}
          >
            Reinitialiser tout
          </button>
        </div>
      ) : null}

      <ProductManagementToolbar
        filteredProductIds={filteredProductIds}
        handleBulkProductPublishStatus={handleBulkProductPublishStatus}
        handleClearAllSelectedProducts={handleClearAllSelectedProducts}
        handleSelectAllFilteredProducts={handleSelectAllFilteredProducts}
        hasSelectedProducts={hasSelectedProducts}
        isUpdatingProductPublishStatus={isUpdatingProductPublishStatus}
        openProductImportModal={handleOpenProductImportModal}
        openCatalogMenu={openCatalogMenu}
        openDeleteProductsModal={openDeleteProductsModal}
        openProductCreateWorkspace={handleOpenProductCreateWorkspace}
        productCategoryFilter={productCategoryFilter}
        productCategoryOptions={productCategoryOptions}
        productPublishStatusFilter={productPublishStatusFilter}
        productSearch={productSearch}
        productSort={productSort}
        productStockFilter={productStockFilter}
        productViewMode={productViewMode}
        productsPerPage={productsPerPage}
        pendingProductsPerPageScrollRef={pendingProductsPerPageScrollRef}
        selectedProductCategory={selectedProductCategory}
        selectedProductFilterSummary={selectedProductFilterSummary}
        selectedProductPublishStatusFilter={selectedProductPublishStatusFilter}
        selectedProductSort={selectedProductSort}
        selectedProductsPerPage={selectedProductsPerPage}
        selectedProductStockFilter={selectedProductStockFilter}
        selectedProductViewMode={selectedProductViewMode}
        selectedProductIds={pendingSelectedProductIds}
        setOpenCatalogMenu={setOpenCatalogMenu}
        setProductCategoryFilter={setProductCategoryFilter}
        setProductPublishStatusFilter={setProductPublishStatusFilter}
        setProductSearch={setProductSearch}
        setProductSort={setProductSort}
        setProductStockFilter={setProductStockFilter}
        setProductViewMode={setProductViewMode}
        setProductsPerPage={setProductsPerPage}
      />

      <ProductCatalogPanel
        filteredProductCount={filteredProductCount}
        formatMoney={formatMoney}
        getProductImage={getProductImage}
        getPromotionPrice={getPromotionPrice}
        hasActivePromotion={hasActivePromotion}
        loading={loading}
        openProductDetails={openProductDetails}
        paginatedProducts={resolvedPaginatedProducts}
        productSort={productSort}
        productViewMode={productViewMode}
        selectedProductIdSet={pendingSelectedProductIdSet}
        setProductSort={setProductSort}
        toggleSelectedProductId={toggleSelectedProductId}
      />

      <ProductManagementPagination
        openCatalogMenu={openCatalogMenu}
        productPage={productPage}
        setOpenCatalogMenu={setOpenCatalogMenu}
        setProductPage={setProductPage}
        totalProductPages={totalProductPages}
        className="admin-product-pagination-nav-only"
      />
    </section>
  )
}

export default memo(ProductManagementSectionComponent)
