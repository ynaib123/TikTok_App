import AdminCatalogPagination from './AdminCatalogPagination'
import AdminToolbarMenuButton from './AdminToolbarMenuButton'
import { CATEGORY_PAGE_SIZE_OPTIONS, CATEGORY_SORT_OPTIONS } from './constants'

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

function FilterIcon() {
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

export default function AdminCategoryManagementSection({
  activeCategoryId,
  categories,
  categoriesPerPage,
  categoryCatalogTotalPages,
  categoryPage,
  categorySearch,
  categorySort,
  filteredCategoryIds,
  handleClearAllSelectedCategories,
  handleOpenCategoryProducts,
  handleSelectAllFilteredCategories,
  handleToggleSelectedCategoryId,
  hasSelectedCategories,
  isDeletingCategory,
  loading,
  openCatalogMenu,
  openCategoryDeleteModal,
  presentation,
  selectedCategoryIds,
  selectedCategoriesPerPage,
  selectedCategorySort,
  setCategoryPage,
  setCategorySearch,
  setCategorySort,
  setCategoriesPerPage,
  setOpenCatalogMenu,
}) {
  const resolvedCategories = Array.isArray(categories) ? categories : []
  const trimmedCategorySearch = String(categorySearch || '').trim()
  const categoryTags = [
    {
      key: 'sort',
      label: `Tri: ${selectedCategorySort?.label || 'Plus recentes'}`,
      isClearable: categorySort !== 'recent',
      onClear: () => setCategorySort('recent'),
    },
  ]
  const hasClearableCategoryTags = trimmedCategorySearch.length > 0 || categoryTags.some((tag) => tag.isClearable)
  const handleResetAllCategoryTags = () => {
    setCategorySearch('')
    setCategorySort('recent')
  }

  return (
    <section id="categories" className="admin-category-panel">
      <div className="admin-product-active-filters admin-category-active-filters">
        <div className="admin-product-active-filters-list">
          {trimmedCategorySearch ? (
            <button
              type="button"
              className="admin-product-active-filter-tag is-clearable"
              onClick={() => setCategorySearch('')}
              title={`Retirer Recherche: ${trimmedCategorySearch}`}
            >
              <span>{`Recherche: ${trimmedCategorySearch}`}</span>
              <strong aria-hidden="true">×</strong>
            </button>
          ) : null}

          {categoryTags.map((tag) => (
            <button
              key={tag.key}
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
          onClick={handleResetAllCategoryTags}
          disabled={!hasClearableCategoryTags}
        >
          Reinitialiser tout
        </button>
      </div>

      <div className="admin-product-toolbar">
        <div className="admin-product-toolbar-controls">
          <div className="admin-product-toolbar-actions">
            <button
              type="button"
              className={`admin-console-btn admin-console-btn-muted admin-product-toolbar-action admin-product-toolbar-icon-btn ${!hasSelectedCategories ? 'is-inactive' : ''}`}
              onClick={() => void openCategoryDeleteModal(selectedCategoryIds)}
              disabled={isDeletingCategory || !hasSelectedCategories}
              aria-label="Supprimer les categories selectionnees"
              title={hasSelectedCategories ? 'Supprimer les categories selectionnees' : 'Selectionnez une categorie pour activer la suppression'}
            >
              <span className="admin-toolbar-icon" aria-hidden="true"><TrashIcon /></span>
            </button>
          </div>
        </div>

        <div className="admin-product-toolbar-search">
          <input
            type="search"
            value={categorySearch}
            onChange={(event) => setCategorySearch(event.target.value)}
            placeholder="Rechercher une categorie..."
            aria-label="Rechercher une categorie"
          />
        </div>

        <div className="admin-product-toolbar-filters">
          <AdminToolbarMenuButton
            ariaLabel={`Trier les categories, option actuelle ${selectedCategorySort.label}`}
            icon={<FilterIcon />}
            menuAriaLabel="Trier les categories"
            menuId="category-sort"
            menuClassName="admin-product-toolbar-menu-sort"
            openCatalogMenu={openCatalogMenu}
            setOpenCatalogMenu={setOpenCatalogMenu}
            title={`Filtres: ${selectedCategorySort.label}`}
          >
            {({ closeMenu }) => (
              <div className="admin-product-toolbar-menu-options-scroll admin-product-toolbar-menu-options-scroll-five">
                {CATEGORY_SORT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`admin-product-toolbar-option ${categorySort === option.value ? 'is-selected' : ''}`}
                    onClick={() => {
                      setCategorySort(option.value)
                      closeMenu()
                    }}
                  >
                    <span>{option.label}</span>
                    {categorySort === option.value ? <strong>•</strong> : null}
                  </button>
                ))}
              </div>
            )}
          </AdminToolbarMenuButton>

          <AdminToolbarMenuButton
            ariaLabel={`Categories par page, option actuelle ${selectedCategoriesPerPage.label}`}
            icon={<PageSizeIcon />}
            menuAriaLabel="Choisir le nombre de categories par page"
            menuClassName="admin-product-toolbar-menu-sort"
            menuId="category-page-size"
            openCatalogMenu={openCatalogMenu}
            setOpenCatalogMenu={setOpenCatalogMenu}
            title={`Par page: ${selectedCategoriesPerPage.label}`}
          >
            {({ closeMenu }) => (
              <div className="admin-product-toolbar-menu-options-scroll admin-product-toolbar-menu-options-scroll-five">
                {CATEGORY_PAGE_SIZE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`admin-product-toolbar-option ${categoriesPerPage === option.value ? 'is-selected' : ''}`}
                    onClick={() => {
                      setCategoriesPerPage(option.value)
                      closeMenu()
                    }}
                  >
                    <span>{option.label}</span>
                    {categoriesPerPage === option.value ? <strong>•</strong> : null}
                  </button>
                ))}
              </div>
            )}
          </AdminToolbarMenuButton>

          <button
            type="button"
            className={`admin-console-btn admin-console-btn-muted admin-product-toolbar-bulk-btn admin-product-toolbar-bulk-toggle ${hasSelectedCategories ? 'is-active' : ''}`}
            onClick={hasSelectedCategories ? handleClearAllSelectedCategories : handleSelectAllFilteredCategories}
            disabled={filteredCategoryIds.length === 0}
            aria-label={hasSelectedCategories ? 'Tout deselectionner' : 'Tout selectionner'}
            title={hasSelectedCategories ? 'Tout deselectionner' : 'Tout selectionner'}
          >
            <span className="admin-toolbar-icon" aria-hidden="true"><CheckSquareIcon checked={hasSelectedCategories} /></span>
          </button>
        </div>
      </div>

      {!loading ? (
        <div className="admin-category-management-grid" aria-live="polite">
          {resolvedCategories.length > 0 ? (
            <ul className="admin-console-list admin-catalog-list admin-category-list">
              {resolvedCategories.map((category) => {
                const isActive = Number(activeCategoryId) === Number(category.id)
                const isSelected = selectedCategoryIds.includes(Number(category.id))
                const categoryPresentation = presentation?.categoryCards?.find((entry) => Number(entry?.id) === Number(category.id))
                const densityTone = categoryPresentation?.densityTone || 'is-empty'

                return (
                  <li key={category.id}>
                    <div
                      className={`admin-category-list-item admin-catalog-list-item ${isActive ? 'is-active' : ''} ${densityTone}`}
                      onClick={() => {
                        handleToggleSelectedCategoryId(category)
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          handleToggleSelectedCategoryId(category)
                        }
                      }}
                      aria-pressed={isActive}
                      role="button"
                      tabIndex={0}
                    >
                      <label
                        className="admin-product-select-checkbox"
                        aria-label={`Sélectionner ${category.libelle}`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectedCategoryId(category)}
                          onClick={(event) => event.stopPropagation()}
                        />
                        <span aria-hidden="true" />
                      </label>
                      <div className="admin-category-list-copy admin-catalog-list-copy">
                        <strong>{categoryPresentation?.label || category.libelle}</strong>
                        <span>{categoryPresentation?.selectionMetaLabel || `Identifiant #${category.id}`}</span>
                      </div>
                      <button
                        type="button"
                        className="admin-category-products-button admin-catalog-list-action"
                        onClick={(event) => {
                          event.stopPropagation()
                          handleOpenCategoryProducts(category)
                        }}
                        aria-label={`Voir les produits de la categorie ${categoryPresentation?.label || category.libelle}`}
                        title={`Voir les produits de la categorie ${categoryPresentation?.label || category.libelle}`}
                      >
                        {categoryPresentation?.usageLabel || '0 produit'}
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : (
            <div className="admin-catalog-empty-state" role="status">
              Aucune categorie a afficher pour les filtres actuels.
            </div>
          )}

          <AdminCatalogPagination
            className="admin-category-list-pagination"
            currentPage={categoryPage}
            menuId="category-page"
            onChangePage={setCategoryPage}
            openCatalogMenu={openCatalogMenu}
            setOpenCatalogMenu={setOpenCatalogMenu}
            summaryLabel={`Page ${Math.max(1, categoryPage)} sur ${Math.max(1, categoryCatalogTotalPages)}`}
            totalPages={Math.max(1, categoryCatalogTotalPages)}
          />
        </div>
      ) : null}
    </section>
  )
}
