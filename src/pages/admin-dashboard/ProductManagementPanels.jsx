import { Fragment, memo } from 'react'
import AdminCatalogPagination from './AdminCatalogPagination'
import AdminToolbarMenuButton from './AdminToolbarMenuButton'
import {
  PRODUCT_PAGE_SIZE_OPTIONS,
  PRODUCT_PUBLISH_STATUS_FILTER_OPTIONS,
  PRODUCT_SORT_OPTIONS,
  PRODUCT_STOCK_FILTER_OPTIONS,
} from './constants'

function AddIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7h16" />
      <path d="M9 4h6" />
      <path d="M7 7v11a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V7" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
    </svg>
  )
}

function PublishIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="7.5" />
      <path d="M12 8.5v7" />
      <path d="M8.5 12h7" />
    </svg>
  )
}

function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="6" height="6" rx="1.4" />
      <rect x="14" y="4" width="6" height="6" rx="1.4" />
      <rect x="4" y="14" width="6" height="6" rx="1.4" />
      <rect x="14" y="14" width="6" height="6" rx="1.4" />
    </svg>
  )
}

function ListIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 6h11" />
      <path d="M9 12h11" />
      <path d="M9 18h11" />
      <path d="M4 6h.01" />
      <path d="M4 12h.01" />
      <path d="M4 18h.01" />
    </svg>
  )
}

function FilterIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7h16" />
      <path d="M7 12h10" />
      <path d="M10 17h4" />
    </svg>
  )
}

function SortIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 6v12" />
      <path d="m5.5 9 2.5-3 2.5 3" />
      <path d="M16 18V6" />
      <path d="m13.5 15 2.5 3 2.5-3" />
    </svg>
  )
}

function CheckSquareIcon({ checked = false }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="2.5" />
      {checked ? <path d="m8 12 2.6 2.6L16.5 9" /> : null}
    </svg>
  )
}

function PageSizeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 7h12" />
      <path d="M6 12h12" />
      <path d="M6 17h8" />
    </svg>
  )
}

function ProductDeletePanelComponent({
  guardedNavigate,
  isDeletingProducts,
  openDeleteProductsModal,
  productsById,
  selectedProductIds,
  truncateLabel,
}) {
  return (
    <section id="delete-products" className="admin-console-panel">
      <div className="admin-console-panel-head">
        <div>
          <p className="admin-console-panel-kicker">Gestion de produits</p>
          <h2>Supprimer produit(s)</h2>
        </div>
        <span>{selectedProductIds.length} selectionne{selectedProductIds.length > 1 ? 's' : ''}</span>
      </div>

      {selectedProductIds.length === 0 ? (
        <div className="admin-console-empty">Selectionnez au moins un produit depuis la gestion pour activer la suppression.</div>
      ) : (
        <div className="admin-console-stack">
          <p className="admin-console-copy">
            Cette action supprimera definitivement les produits selectionnes de la base de donnees.
          </p>
          <div className="admin-product-selection-summary">
            {selectedProductIds
              .map((selectedId) => productsById.get(Number(selectedId)))
              .filter(Boolean)
              .map((product) => (
                <span key={product.id} className="admin-product-selection-pill">
                  <span>#{product.id}</span>
                  <strong>{truncateLabel(product.nom || 'Produit sans nom', 24)}</strong>
                </span>
              ))}
          </div>
          <div className="admin-console-actions">
            <button
              type="button"
              className="admin-console-btn admin-console-btn-muted"
              onClick={() => guardedNavigate('/products')}
              disabled={isDeletingProducts}
            >
              Annuler
            </button>
            <button
              type="button"
              className="admin-console-btn admin-console-btn-danger"
              onClick={() => openDeleteProductsModal(selectedProductIds)}
              disabled={isDeletingProducts || selectedProductIds.length === 0}
            >
              {isDeletingProducts ? 'Suppression...' : `Supprimer ${selectedProductIds.length} produit${selectedProductIds.length > 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

function ProductManagementToolbarComponent({
  filteredProductIds,
  handleBulkProductPublishStatus,
  hasSelectedProducts,
  isUpdatingProductPublishStatus,
  openProductImportModal,
  openCatalogMenu,
  openDeleteProductsModal,
  openProductCreateWorkspace,
  productCategoryFilter,
  productCategoryOptions,
  productPublishStatusFilter,
  productSearch,
  productSort,
  productStockFilter,
  productViewMode,
  productsPerPage,
  selectedProductFilterSummary,
  selectedProductsPerPage,
  selectedProductSort,
  selectedProductViewMode,
  setOpenCatalogMenu,
  setProductCategoryFilter,
  setProductPublishStatusFilter,
  setProductSearch,
  setProductSort,
  setProductStockFilter,
  setProductViewMode,
  setProductsPerPage,
  selectedProductIds,
  handleClearAllSelectedProducts,
  handleSelectAllFilteredProducts,
  pendingProductsPerPageScrollRef,
}) {
  const visibleProductCategoryOptions = productCategoryOptions.filter((option) => option.value !== 'all')
  const visibleProductStockOptions = PRODUCT_STOCK_FILTER_OPTIONS.filter((option) => option.value !== 'all')
  const visibleProductPublishStatusOptions = PRODUCT_PUBLISH_STATUS_FILTER_OPTIONS.filter((option) => option.value !== 'all')
  const handleProductsPerPageChange = (nextValue, closeMenu) => {
    if (pendingProductsPerPageScrollRef?.current !== undefined) {
      pendingProductsPerPageScrollRef.current = typeof window === 'undefined' ? null : window.scrollY
    }
    setProductsPerPage(nextValue)
    closeMenu?.()
  }

  return (
    <Fragment>
      <div className="admin-product-toolbar">
        <div className="admin-product-toolbar-controls">
          <div className="admin-product-toolbar-actions">
            <AdminToolbarMenuButton
              ariaLabel="Choisir un mode d'ajout"
              icon={<AddIcon />}
              menuAriaLabel="Choisir un mode d'ajout produit"
              menuClassName="admin-product-toolbar-menu-create"
              menuId="create"
              menuRole="menu"
              openCatalogMenu={openCatalogMenu}
              setOpenCatalogMenu={setOpenCatalogMenu}
              title="Ajouter"
            >
              {({ closeMenu }) => (
                <Fragment>
                  <button
                    type="button"
                    className="admin-product-toolbar-option"
                    role="menuitem"
                    onClick={() => {
                      openProductCreateWorkspace('single')
                      closeMenu()
                    }}
                  >
                    <span>Manuel</span>
                  </button>
                  <button
                    type="button"
                    className="admin-product-toolbar-option"
                    role="menuitem"
                    onClick={() => {
                      openProductImportModal()
                      closeMenu()
                    }}
                  >
                    <span>Automatique</span>
                  </button>
                </Fragment>
              )}
            </AdminToolbarMenuButton>
            <button
              type="button"
              className={`admin-console-btn admin-console-btn-muted admin-product-toolbar-action admin-product-toolbar-icon-btn ${!hasSelectedProducts ? 'is-inactive' : ''}`}
              onClick={() => openDeleteProductsModal(selectedProductIds)}
              disabled={!hasSelectedProducts}
              aria-label="Supprimer les produits selectionnes"
              title={hasSelectedProducts ? 'Supprimer les produits selectionnes' : 'Selectionnez un produit pour activer la suppression'}
            >
              <span className="admin-toolbar-icon" aria-hidden="true"><TrashIcon /></span>
            </button>
            <AdminToolbarMenuButton
              ariaLabel="Piloter la mise en ligne des produits selectionnes"
              icon={<PublishIcon />}
              menuAriaLabel="Etat de mise en ligne des produits"
              menuClassName="admin-product-toolbar-menu-publish-status"
              menuId="publish-status"
              openCatalogMenu={openCatalogMenu}
              setOpenCatalogMenu={setOpenCatalogMenu}
              title="Publication"
            >
              {({ closeMenu }) => (
                <Fragment>
                  <button
                    type="button"
                    className="admin-product-toolbar-option"
                    disabled={!hasSelectedProducts || isUpdatingProductPublishStatus}
                    onClick={() => {
                      void handleBulkProductPublishStatus(selectedProductIds, true)
                      closeMenu()
                    }}
                  >
                    <span>Mettre en ligne</span>
                  </button>
                  <button
                    type="button"
                    className="admin-product-toolbar-option"
                    disabled={!hasSelectedProducts || isUpdatingProductPublishStatus}
                    onClick={() => {
                      void handleBulkProductPublishStatus(selectedProductIds, false)
                      closeMenu()
                    }}
                  >
                    <span>Mettre hors ligne</span>
                  </button>
                </Fragment>
              )}
            </AdminToolbarMenuButton>
          </div>
        </div>

        <div className="admin-product-toolbar-search">
          <input
            id="product-search"
            name="productSearch"
            type="search"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            value={productSearch}
            onChange={(event) => setProductSearch(event.target.value)}
            placeholder="Rechercher ..."
            aria-label="Rechercher un produit"
          />
        </div>

        <div className="admin-product-toolbar-filters">
          <button
            type="button"
            className="admin-console-btn admin-console-btn-muted admin-product-toolbar-action admin-product-toolbar-icon-btn"
            onClick={() => setProductViewMode(productViewMode === 'grid' ? 'details' : 'grid')}
            aria-label={`Basculer vers l'affichage ${productViewMode === 'grid' ? 'details' : 'grille'}`}
            title={`Affichage actuel: ${selectedProductViewMode.label}`}
          >
            <span className="admin-toolbar-icon" aria-hidden="true">{productViewMode === 'grid' ? <ListIcon /> : <GridIcon />}</span>
          </button>

          <AdminToolbarMenuButton
            ariaLabel={`Filtres produits, selection actuelle ${selectedProductFilterSummary}`}
            icon={<FilterIcon />}
            menuAriaLabel="Filtres produits"
            menuId="product-filters"
            openCatalogMenu={openCatalogMenu}
            setOpenCatalogMenu={setOpenCatalogMenu}
            title={`Filtres: ${selectedProductFilterSummary}`}
          >
            {({ closeMenu }) => (
              <Fragment>
                <div className="admin-product-toolbar-menu-section admin-product-toolbar-menu-section-scroll">
                  <span className="admin-product-toolbar-menu-title">Categorie</span>
                  <div className="admin-product-toolbar-menu-options-scroll">
                    {visibleProductCategoryOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={`admin-product-toolbar-option ${productCategoryFilter === option.value ? 'is-selected' : ''}`}
                        onClick={() => {
                          setProductCategoryFilter(option.value)
                          closeMenu()
                        }}
                      >
                        <span>{option.label}</span>
                        {productCategoryFilter === option.value ? <strong>•</strong> : null}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="admin-product-toolbar-menu-section admin-product-toolbar-menu-section-scroll">
                  <span className="admin-product-toolbar-menu-title">Stock</span>
                  <div className="admin-product-toolbar-menu-options-scroll">
                    {visibleProductStockOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={`admin-product-toolbar-option ${productStockFilter === option.value ? 'is-selected' : ''}`}
                        onClick={() => {
                          setProductStockFilter(option.value)
                          closeMenu()
                        }}
                      >
                        <span>{option.label}</span>
                        {productStockFilter === option.value ? <strong>•</strong> : null}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="admin-product-toolbar-menu-section admin-product-toolbar-menu-section-scroll">
                  <span className="admin-product-toolbar-menu-title">Statut</span>
                  <div className="admin-product-toolbar-menu-options-scroll">
                    {visibleProductPublishStatusOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={`admin-product-toolbar-option ${productPublishStatusFilter === option.value ? 'is-selected' : ''}`}
                        onClick={() => {
                          setProductPublishStatusFilter(option.value)
                          closeMenu()
                        }}
                      >
                        <span>{option.label}</span>
                        {productPublishStatusFilter === option.value ? <strong>•</strong> : null}
                      </button>
                    ))}
                  </div>
                </div>
              </Fragment>
            )}
          </AdminToolbarMenuButton>

          <AdminToolbarMenuButton
            ariaLabel={`Trier les produits, option actuelle ${selectedProductSort.label}`}
            icon={<SortIcon />}
            menuAriaLabel="Trier les produits"
            menuClassName="admin-product-toolbar-menu-sort"
            menuId="product-sort"
            openCatalogMenu={openCatalogMenu}
            setOpenCatalogMenu={setOpenCatalogMenu}
            title={`Tri: ${selectedProductSort.label}`}
          >
            {({ closeMenu }) => (
              <div className="admin-product-toolbar-menu-options-scroll admin-product-toolbar-menu-options-scroll-five">
                {PRODUCT_SORT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`admin-product-toolbar-option ${productSort === option.value ? 'is-selected' : ''}`}
                    onClick={() => {
                      setProductSort(option.value)
                      closeMenu()
                    }}
                  >
                    <span>{option.label}</span>
                    {productSort === option.value ? <strong>•</strong> : null}
                  </button>
                ))}
              </div>
            )}
          </AdminToolbarMenuButton>

          <AdminToolbarMenuButton
            ariaLabel={`Produits par page, option actuelle ${selectedProductsPerPage.label}`}
            icon={<PageSizeIcon />}
            menuAriaLabel="Choisir le nombre de produits par page"
            menuClassName="admin-product-toolbar-menu-sort"
            menuId="product-page-size"
            openCatalogMenu={openCatalogMenu}
            setOpenCatalogMenu={setOpenCatalogMenu}
            title={`Par page: ${selectedProductsPerPage.label}`}
          >
            {({ closeMenu }) => (
              <div className="admin-product-toolbar-menu-options-scroll admin-product-toolbar-menu-options-scroll-five">
                {PRODUCT_PAGE_SIZE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`admin-product-toolbar-option ${productsPerPage === option.value ? 'is-selected' : ''}`}
                    onClick={() => handleProductsPerPageChange(option.value, closeMenu)}
                  >
                    <span>{option.label}</span>
                    {productsPerPage === option.value ? <strong>•</strong> : null}
                  </button>
                ))}
              </div>
            )}
          </AdminToolbarMenuButton>

          <button
            type="button"
            className={`admin-console-btn admin-console-btn-muted admin-product-toolbar-bulk-btn admin-product-toolbar-bulk-toggle ${hasSelectedProducts ? 'is-active' : ''}`}
            onClick={hasSelectedProducts ? handleClearAllSelectedProducts : handleSelectAllFilteredProducts}
            disabled={filteredProductIds.length === 0}
            aria-label={hasSelectedProducts ? 'Tout deselectionner' : 'Selectionner tous les produits de la page'}
            title={hasSelectedProducts ? 'Tout deselectionner' : 'Selectionner tous les produits de la page'}
          >
            <span className="admin-toolbar-icon" aria-hidden="true"><CheckSquareIcon checked={hasSelectedProducts} /></span>
          </button>
        </div>
      </div>

    </Fragment>
  )
}

function ProductManagementPaginationComponent({
  openCatalogMenu,
  productPage,
  setOpenCatalogMenu,
  setProductPage,
  totalProductPages,
}) {
  return (
    <AdminCatalogPagination
      currentPage={productPage}
      menuId="page"
      onChangePage={(nextPage) => setProductPage(nextPage)}
      openCatalogMenu={openCatalogMenu}
      setOpenCatalogMenu={setOpenCatalogMenu}
      totalPages={totalProductPages}
      summaryLabel={`Page ${productPage} sur ${totalProductPages}`}
    />
  )
}

export const ProductDeletePanel = memo(ProductDeletePanelComponent)
export const ProductManagementToolbar = memo(ProductManagementToolbarComponent)
export const ProductManagementPagination = memo(ProductManagementPaginationComponent)
