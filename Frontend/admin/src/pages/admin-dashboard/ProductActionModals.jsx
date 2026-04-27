import { Fragment, memo, useEffect, useMemo, useRef, useState } from 'react'
import AdminModal from '../../components/AdminModal'
import AdminToolbarMenuButton from './AdminToolbarMenuButton'
import { getProductImage } from './utils.js'

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

const IMPORT_FILTER_OPTIONS = [
  { value: 'all', label: 'Tous' },
  { value: 'selected', label: 'Selectionnes' },
  { value: 'unselected', label: 'Non selectionnes' },
  { value: 'with-image', label: 'Avec photo' },
  { value: 'without-image', label: 'Sans photo' },
]

const IMPORT_SORT_OPTIONS = [
  { value: 'recent', label: 'Ordre d import' },
  { value: 'name_asc', label: 'Nom A-Z' },
  { value: 'name_desc', label: 'Nom Z-A' },
]

function ProductActionModalsComponent({
  closeDeleteModal,
  closeProductImportModal,
  closeUnsavedSelectionModal,
  confirmUnsavedSelectionReset,
  deleteModalProducts,
  deleteModalState,
  handlePersistImportedProducts,
  handleProductImportFileChange,
  handleProductImportSubmit,
  handleSendImportedProductsToDrafts,
  handleSetImportedRowSelection,
  handleToggleImportedRowSelection,
  handleBulkProductDelete,
  importedPreviewRows,
  importedSelectedKeys,
  isDeletingProducts,
  isImportingProductFile,
  isPersistingImportedProducts,
  productImportModalState,
  unsavedSelectionModalProducts,
  unsavedSelectionModalState,
}) {
  const isImportActionInProgress = isImportingProductFile || isPersistingImportedProducts
  const hasImportedPreview = importedPreviewRows.length > 0
  const hasSelectedImportedRows = importedSelectedKeys.length > 0
  const selectedImportFiles = Array.isArray(productImportModalState.files) ? productImportModalState.files : []
  const selectedImportFileCount = selectedImportFiles.length
  const selectedImportFileNames = selectedImportFiles.map((file) => file?.name).filter(Boolean)
  const selectedImportFileSize = selectedImportFiles.reduce((total, file) => (
    total + Number(file?.size || 0)
  ), 0)
  const selectedImportFileTypes = Array.from(new Set(
    selectedImportFiles.map((file) => String(file?.type || '').trim()).filter(Boolean)
  ))
  const [importSearch, setImportSearch] = useState('')
  const [importFilter, setImportFilter] = useState('all')
  const [importSort, setImportSort] = useState('recent')
  const [openImportToolbarMenu, setOpenImportToolbarMenu] = useState(null)
  const importErrorRef = useRef(null)

  useEffect(() => {
    if (!productImportModalState.error) return
    importErrorRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [productImportModalState.error])

  const visibleImportedRows = useMemo(() => {
    const normalizedSearch = String(importSearch || '').trim().toLowerCase()
    const selectedKeySet = new Set(importedSelectedKeys)
    const filteredRows = importedPreviewRows.filter((row) => {
      const matchesSearch = !normalizedSearch || [row.name, row.meta]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedSearch))

      if (!matchesSearch) return false

      if (importFilter === 'selected') return selectedKeySet.has(row.key)
      if (importFilter === 'unselected') return !selectedKeySet.has(row.key)
      if (importFilter === 'with-image') return Boolean(row.imageUrl)
      if (importFilter === 'without-image') return !row.imageUrl
      return true
    })

    if (importSort === 'name_asc') {
      return [...filteredRows].sort((leftRow, rightRow) => leftRow.name.localeCompare(rightRow.name, 'fr', { sensitivity: 'base' }))
    }

    if (importSort === 'name_desc') {
      return [...filteredRows].sort((leftRow, rightRow) => rightRow.name.localeCompare(leftRow.name, 'fr', { sensitivity: 'base' }))
    }

    return filteredRows
  }, [importFilter, importSearch, importSort, importedPreviewRows, importedSelectedKeys])

  const visibleImportedRowKeys = visibleImportedRows.map((row) => row.key)
  const areAllVisibleRowsSelected = visibleImportedRowKeys.length > 0
    && visibleImportedRowKeys.every((rowKey) => importedSelectedKeys.includes(rowKey))
  const selectedImportFilterLabel = IMPORT_FILTER_OPTIONS.find((option) => option.value === importFilter)?.label || 'Tous'
  const selectedImportSortLabel = IMPORT_SORT_OPTIONS.find((option) => option.value === importSort)?.label || 'Ordre d import'

  return (
    <Fragment>
      <AdminModal
        isOpen={deleteModalState.isOpen}
        onClose={closeDeleteModal}
        className="admin-modal-tone-danger"
        kicker="Confirmation"
        title={deleteModalState.productIds.length > 1 ? 'Supprimer ces produits' : 'Supprimer ce produit'}
        description={
          <span className="admin-modal-description-inline">
            {deleteModalState.productIds.length > 1
              ? `Cette action supprimera definitivement ${deleteModalState.productIds.length} produits de la base de donnees de facons irreversible.`
              : 'Cette action supprimera definitivement ce produit de la base de donnees de facons irreversible.'}
          </span>
        }
        size="md"
        closeOnOverlay={false}
        closeOnEscape={false}
        showCloseButton={false}
        footer={(
          <Fragment>
            <button
              type="button"
              className="admin-console-btn admin-console-btn-muted"
              onClick={closeDeleteModal}
              disabled={isDeletingProducts}
            >
              Annuler
            </button>
            <button
              type="button"
              className="admin-console-btn admin-console-btn-danger"
              onClick={() => void handleBulkProductDelete()}
              disabled={isDeletingProducts || deleteModalState.productIds.length === 0}
            >
              {isDeletingProducts ? 'Suppression...' : 'Supprimer'}
            </button>
          </Fragment>
        )}
      >
        <div className="admin-console-stack">
          <div className="admin-product-selection-summary admin-product-selection-summary-column admin-modal-selection-list">
            {deleteModalProducts.map((product) => (
              <span key={product.id} className="admin-product-selection-pill">
                <span className="admin-product-selection-thumb" aria-hidden="true">
                  {getProductImage(product) ? <img src={getProductImage(product)} alt="" /> : null}
                </span>
                <span className="admin-product-selection-copy">
                  <strong>{product.nom || 'Produit sans nom'}</strong>
                </span>
                <small className="admin-modal-selection-ref">Ref #{product.id}</small>
              </span>
            ))}
          </div>
        </div>
      </AdminModal>

      <AdminModal
        isOpen={productImportModalState.isOpen}
        onClose={closeProductImportModal}
        className="admin-modal-tone-danger admin-modal-import"
        kicker="Import"
        title="Ajout automatique de produits"
        description={(
          <span className="admin-modal-description-inline">
            Importez un fichier CSV, XLSX ou XLS pour preparer automatiquement des brouillons produits dans l&apos;atelier d&apos;ajout.
          </span>
        )}
        size="lg"
        closeOnOverlay={false}
        closeOnEscape={false}
        showCloseButton={false}
        footer={(
          <Fragment>
            <button
              type="button"
              className="admin-console-btn admin-console-btn-muted"
              onClick={closeProductImportModal}
              disabled={isImportActionInProgress}
            >
              Annuler
            </button>
            {hasImportedPreview ? (
              <span className="admin-modal-import-actions">
                <button
                  type="button"
                  className="admin-console-btn admin-console-btn-muted"
                  onClick={() => handleSendImportedProductsToDrafts()}
                  disabled={isImportActionInProgress || !hasSelectedImportedRows}
                >
                  Brouillon
                </button>
                <button
                  type="button"
                  className="admin-console-btn admin-console-btn-muted"
                  onClick={() => void handlePersistImportedProducts(false)}
                  disabled={isImportActionInProgress || !hasSelectedImportedRows}
                >
                  Enregistrer
                </button>
                <button
                  type="button"
                  className="admin-console-btn admin-console-btn-danger"
                  onClick={() => void handlePersistImportedProducts(true)}
                  disabled={isImportActionInProgress || !hasSelectedImportedRows}
                >
                  {isImportActionInProgress ? 'Traitement...' : 'Publier'}
                </button>
              </span>
            ) : (
              <button
                type="button"
                className="admin-console-btn admin-console-btn-danger"
                onClick={() => void handleProductImportSubmit()}
                disabled={isImportActionInProgress || selectedImportFileCount === 0}
              >
                Importer le fichier
              </button>
            )}
          </Fragment>
        )}
      >
        <div className={`admin-console-stack admin-modal-import-stack ${hasImportedPreview ? 'is-previewing' : ''}`}>
          {productImportModalState.error ? (
            <p ref={importErrorRef} className="admin-import-error" role="alert">{productImportModalState.error}</p>
          ) : null}

          {!hasImportedPreview ? (
            <label className="admin-import-dropzone" htmlFor="product-import-file">
              <input
                className="admin-import-dropzone-input"
                id="product-import-file"
                name="productImportFile"
                type="file"
                multiple
                accept=".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={handleProductImportFileChange}
                disabled={isImportActionInProgress}
              />
              <span className="admin-import-dropzone-fileline" aria-hidden="true">
                <span className="admin-import-dropzone-button">Choisir jusqu&apos;a 3 fichiers</span>
                <span className="admin-import-dropzone-filename">
                  {selectedImportFileCount > 0
                    ? `${selectedImportFileNames.join(', ')} • ${selectedImportFileCount} fichier(s) pret(s) pour l import`
                    : 'Aucun fichier choisi • Formats acceptes: CSV, XLSX, XLS • Maximum 3 fichiers'}
                </span>
                {selectedImportFileCount > 0 ? (
                  <span className="admin-import-dropzone-meta">
                    <span>{Math.max(1, Math.round(selectedImportFileSize / 1024))} Ko</span>
                    <span>{selectedImportFileTypes.join(' • ') || 'Type detecte automatiquement'}</span>
                  </span>
                ) : null}
              </span>
            </label>
          ) : null}

          {importedPreviewRows.length > 0 ? (
            <Fragment>
              <div className="admin-product-toolbar admin-modal-import-toolbar">
                <div className="admin-product-toolbar-search admin-modal-import-toolbar-search">
                  <input
                    type="search"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    value={importSearch}
                    onChange={(event) => setImportSearch(event.target.value)}
                    placeholder="Rechercher un produit importe..."
                    aria-label="Rechercher dans les produits importes"
                  />
                </div>

                <div className="admin-product-toolbar-filters admin-modal-import-toolbar-filters">
                  <AdminToolbarMenuButton
                    ariaLabel={`Filtrer les produits importes, filtre actuel ${selectedImportFilterLabel}`}
                    icon={<FilterIcon />}
                    menuAriaLabel="Filtres des produits importes"
                    menuId="import-filter"
                    openCatalogMenu={openImportToolbarMenu}
                    setOpenCatalogMenu={setOpenImportToolbarMenu}
                    title={`Filtre: ${selectedImportFilterLabel}`}
                  >
                    {({ closeMenu }) => (
                      <div className="admin-product-toolbar-menu-options-scroll admin-product-toolbar-menu-options-scroll-five">
                        {IMPORT_FILTER_OPTIONS.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            className={`admin-product-toolbar-option ${importFilter === option.value ? 'is-selected' : ''}`}
                            onClick={() => {
                              setImportFilter(option.value)
                              closeMenu()
                            }}
                          >
                            <span>{option.label}</span>
                            {importFilter === option.value ? <strong>•</strong> : null}
                          </button>
                        ))}
                      </div>
                    )}
                  </AdminToolbarMenuButton>

                  <AdminToolbarMenuButton
                    ariaLabel={`Trier les produits importes, tri actuel ${selectedImportSortLabel}`}
                    icon={<SortIcon />}
                    menuAriaLabel="Tri des produits importes"
                    menuClassName="admin-product-toolbar-menu-sort"
                    menuId="import-sort"
                    openCatalogMenu={openImportToolbarMenu}
                    setOpenCatalogMenu={setOpenImportToolbarMenu}
                    title={`Tri: ${selectedImportSortLabel}`}
                  >
                    {({ closeMenu }) => (
                      <div className="admin-product-toolbar-menu-options-scroll admin-product-toolbar-menu-options-scroll-five">
                        {IMPORT_SORT_OPTIONS.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            className={`admin-product-toolbar-option ${importSort === option.value ? 'is-selected' : ''}`}
                            onClick={() => {
                              setImportSort(option.value)
                              closeMenu()
                            }}
                          >
                            <span>{option.label}</span>
                            {importSort === option.value ? <strong>•</strong> : null}
                          </button>
                        ))}
                      </div>
                    )}
                  </AdminToolbarMenuButton>

                  <button
                    type="button"
                    className={`admin-console-btn admin-console-btn-muted admin-product-toolbar-bulk-btn admin-product-toolbar-bulk-toggle ${areAllVisibleRowsSelected ? 'is-active' : ''}`}
                    onClick={() => handleSetImportedRowSelection(visibleImportedRowKeys, !areAllVisibleRowsSelected)}
                    disabled={visibleImportedRowKeys.length === 0}
                    aria-label={areAllVisibleRowsSelected ? 'Tout deselectionner' : 'Tout selectionner'}
                    title={areAllVisibleRowsSelected ? 'Tout deselectionner' : 'Tout selectionner'}
                  >
                    <span className="admin-toolbar-icon" aria-hidden="true"><CheckSquareIcon checked={areAllVisibleRowsSelected} /></span>
                  </button>
                </div>
              </div>

              <div className="admin-modal-import-toolbar-summary">
                <span>{visibleImportedRows.length} produit(s) affiche(s)</span>
                <span>{importedSelectedKeys.length} selectionne(s)</span>
              </div>

              {visibleImportedRows.length > 0 ? (
                <div className="admin-modal-import-list">
                  {visibleImportedRows.map((row) => (
                    <label key={row.key} className="admin-modal-import-list-item">
                      <span className="admin-product-select-checkbox" aria-hidden="true">
                        <input
                          type="checkbox"
                          checked={importedSelectedKeys.includes(row.key)}
                          onChange={() => handleToggleImportedRowSelection(row.key)}
                        />
                        <span />
                      </span>
                      <span className="admin-product-table-media admin-modal-import-list-thumb" aria-hidden="true">
                        {row.imageUrl ? <img src={row.imageUrl} alt="" /> : null}
                      </span>
                      <span className="admin-product-table-main admin-modal-import-list-copy">
                        <strong>{row.name}</strong>
                        {row.meta ? <p>{row.meta}</p> : null}
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="admin-modal-import-empty">
                  Aucun produit importe ne correspond a cette recherche.
                </div>
              )}
            </Fragment>
          ) : null}

        </div>
      </AdminModal>

      <AdminModal
        isOpen={unsavedSelectionModalState.isOpen}
        onClose={closeUnsavedSelectionModal}
        className="admin-modal-tone-danger"
        kicker="Attention"
        title="Modifications non sauvegardees"
        description={(
          <span className="admin-modal-description-inline">
            Si vous continuez, les modifications non sauvegardees seront reinitialisees.
          </span>
        )}
        size="md"
        closeOnOverlay={false}
        closeOnEscape={false}
        showCloseButton={false}
        footer={(
          <Fragment>
            <button
              type="button"
              className="admin-console-btn admin-console-btn-muted"
              onClick={closeUnsavedSelectionModal}
            >
              Annuler
            </button>
            <button
              type="button"
              className="admin-console-btn admin-console-btn-danger"
              onClick={confirmUnsavedSelectionReset}
            >
              Continuer
            </button>
          </Fragment>
        )}
      >
        <div className="admin-console-stack">
          <div className="admin-product-selection-summary admin-product-selection-summary-column admin-modal-selection-list">
            {unsavedSelectionModalProducts.map((product) => (
              <span key={product.key} className="admin-product-selection-pill">
                <span>{product.badge}</span>
                <strong>{product.name || 'Produit non enregistre'}</strong>
                {product.meta ? <small>{product.meta}</small> : null}
              </span>
            ))}
          </div>
        </div>
      </AdminModal>
    </Fragment>
  )
}

export default memo(ProductActionModalsComponent)
