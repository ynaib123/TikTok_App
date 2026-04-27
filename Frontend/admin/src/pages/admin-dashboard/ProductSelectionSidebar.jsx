import { memo } from 'react'

function ProductSelectionSidebarComponent({
  activeSidebarItemKey,
  dirtyCreateDrafts,
  dirtySelectedProductsForSidebar,
  getProductImage,
  handleClearPendingSelection,
  handleRemoveCreateDraft,
  handleRemovePendingSelectedProduct,
  handleSaveDirtySelection,
  handleSelectCreateDraft,
  isSavingDirtySelection,
  navigate,
  openUnsavedSelectionModal,
  selectionSummary,
  truncateLabel,
  untouchedCreateDrafts,
  untouchedSelectedProductsForSidebar,
}) {
  return (
    <aside className="admin-selection-sidebar admin-product-selection-sidebar" aria-labelledby="product-selection-title">
      <div className="admin-selection-sidebar-body">
        <section className="admin-selection-group-block admin-selection-group-block-pending" aria-labelledby="selection-pending-title">
          <div className="admin-selection-saved-head is-pending">
            <strong id="selection-pending-title" className="admin-product-selection-group-title">Selections</strong>
            <div className="admin-selection-saved-actions">
              <span aria-live="polite" aria-atomic="true">{selectionSummary.pendingCount}</span>
              <button
                type="button"
                className="admin-selection-saved-clear is-pending"
                onClick={handleClearPendingSelection}
                aria-label="Vider les elements en cours"
                title="Vider"
              >
                −
              </button>
            </div>
          </div>
          <div className="admin-product-selection-summary admin-product-selection-summary-column admin-selection-list-scroll is-three">
            {untouchedCreateDrafts.map((draft, index) => {
              const isActiveDraft = activeSidebarItemKey === `draft:${draft.id}`
              const draftLabel = String(draft.form?.nom || '').trim() || `Nouveau produit ${index + 1}`

              return (
                <div
                  key={`untouched-draft-${draft.id}`}
                  className={`admin-product-selection-pill admin-product-selection-pill-button ${isActiveDraft ? 'is-active' : ''}`}
                >
                  <button
                    type="button"
                    className="admin-product-selection-pill-main"
                    onClick={() => handleSelectCreateDraft(draft.id)}
                  >
                    <span className="admin-product-selection-thumb" aria-hidden="true">
                      <img src={draft.selectedPreviewImage || getProductImage(null)} alt="" />
                    </span>
                    <span className="admin-product-selection-copy">
                      <strong>{truncateLabel(draftLabel, 24)}</strong>
                      <small>Brouillon d'ajout</small>
                    </span>
                  </button>
                  <button
                    type="button"
                    className="admin-product-selection-remove"
                    onClick={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      handleRemoveCreateDraft(draft.id)
                    }}
                    aria-label={`Retirer le brouillon ${draftLabel}`}
                    title="Retirer"
                  >
                    ×
                  </button>
                </div>
              )
            })}
            {untouchedSelectedProductsForSidebar.map((product) => {
              const isActiveSelection = activeSidebarItemKey === `product:${Number(product?.id)}`
              return (
                <div
                  key={`untouched-product-${product.id}`}
                  className={`admin-product-selection-pill admin-product-selection-pill-button ${isActiveSelection ? 'is-active' : ''}`}
                >
                  <button
                    type="button"
                    className="admin-product-selection-pill-main"
                    onClick={() => navigate(`/products/${product.id}/edit#product-details`)}
                  >
                    <span className="admin-product-selection-thumb" aria-hidden="true">
                      <img src={getProductImage(product)} alt="" />
                    </span>
                    <span className="admin-product-selection-copy">
                      <strong>{truncateLabel(product.nom || 'Produit sans nom', 24)}</strong>
                      <small>#{product.id} · A modifier</small>
                    </span>
                  </button>
                  <button
                    type="button"
                    className="admin-product-selection-remove"
                    onClick={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      handleRemovePendingSelectedProduct(product.id)
                    }}
                    aria-label={`Deselectionner ${product.nom || `le produit ${product.id}`}`}
                    title="Deselectionner"
                  >
                    ×
                  </button>
                </div>
              )
            })}
          </div>
        </section>

        <section className="admin-selection-group-block admin-selection-group-block-dirty" aria-labelledby="selection-dirty-title">
          <div className="admin-selection-saved-head is-dirty">
            <strong id="selection-dirty-title" className="admin-product-selection-group-title">Brouillons</strong>
            <div className="admin-selection-saved-actions">
              <span aria-live="polite" aria-atomic="true">{selectionSummary.dirtyCount}</span>
              <button
                type="button"
                className="admin-selection-saved-clear is-save"
                onClick={() => void handleSaveDirtySelection()}
                disabled={selectionSummary.dirtyCount === 0 || isSavingDirtySelection}
                aria-label="Enregistrer tous les elements valides non sauvegardes"
                title={isSavingDirtySelection ? 'Enregistrement en cours' : 'Enregistrer les elements valides'}
              >
                <span aria-hidden="true">✓</span>
              </button>
              <button
                type="button"
                className="admin-selection-saved-clear is-dirty"
                onClick={() => {
                  openUnsavedSelectionModal({
                    draftIds: dirtyCreateDrafts.map((draft) => draft.id),
                    productIds: dirtySelectedProductsForSidebar.map((product) => Number(product.id)),
                    label: 'ces elements non sauvegardes',
                  })
                }}
                aria-label="Vider les elements non sauvegardes"
                title="Vider"
              >
                −
              </button>
            </div>
          </div>
          <div className="admin-product-selection-summary admin-product-selection-summary-column admin-selection-list-scroll is-two">
            {dirtyCreateDrafts.map((draft, index) => {
              const isActiveDraft = activeSidebarItemKey === `draft:${draft.id}`
              const draftLabel = String(draft.form?.nom || '').trim() || `Nouveau produit ${index + 1}`

              return (
                <div
                  key={`dirty-draft-${draft.id}`}
                  className={`admin-product-selection-pill admin-product-selection-pill-button ${isActiveDraft ? 'is-active' : ''} is-dirty`}
                >
                  <button
                    type="button"
                    className="admin-product-selection-pill-main"
                    onClick={() => handleSelectCreateDraft(draft.id)}
                  >
                    <span className="admin-product-selection-thumb" aria-hidden="true">
                      <img src={draft.selectedPreviewImage || getProductImage(null)} alt="" />
                    </span>
                    <span className="admin-product-selection-copy">
                      <strong>{truncateLabel(draftLabel, 24)}</strong>
                      <small>Modifications non enregistrees</small>
                    </span>
                  </button>
                  <button
                    type="button"
                    className="admin-product-selection-remove"
                    onClick={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      openUnsavedSelectionModal({
                        draftIds: [draft.id],
                        label: `le brouillon ${draftLabel}`,
                      })
                    }}
                    aria-label={`Retirer le brouillon ${draftLabel}`}
                    title="Retirer"
                  >
                    ×
                  </button>
                </div>
              )
            })}
            {dirtySelectedProductsForSidebar.map((product) => {
              const isActiveSelection = activeSidebarItemKey === `product:${Number(product?.id)}`
              return (
                <div
                  key={`dirty-product-${product.id}`}
                  className={`admin-product-selection-pill admin-product-selection-pill-button ${isActiveSelection ? 'is-active' : ''} is-dirty`}
                >
                  <button
                    type="button"
                    className="admin-product-selection-pill-main"
                    onClick={() => navigate(`/products/${product.id}/edit#product-details`)}
                  >
                    <span className="admin-product-selection-thumb" aria-hidden="true">
                      <img src={getProductImage(product)} alt="" />
                    </span>
                    <span className="admin-product-selection-copy">
                      <strong>{truncateLabel(product.nom || 'Produit sans nom', 24)}</strong>
                      <small>Modifications non enregistrees</small>
                    </span>
                  </button>
                  <button
                    type="button"
                    className="admin-product-selection-remove"
                    onClick={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      openUnsavedSelectionModal({
                        productIds: [Number(product.id)],
                        label: product.nom || `le produit ${product.id}`,
                      })
                    }}
                    aria-label={`Deselectionner ${product.nom || `le produit ${product.id}`}`}
                    title="Deselectionner"
                  >
                    ×
                  </button>
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </aside>
  )
}

export default memo(ProductSelectionSidebarComponent)
