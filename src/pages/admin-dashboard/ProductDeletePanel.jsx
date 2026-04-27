import { memo } from 'react'

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
        <span>
          {selectedProductIds.length} selectionne
          {selectedProductIds.length > 1 ? 's' : ''}
        </span>
      </div>

      {selectedProductIds.length === 0 ? (
        <div className="admin-console-empty">
          Selectionnez au moins un produit depuis la gestion pour activer la
          suppression.
        </div>
      ) : (
        <div className="admin-console-stack">
          <p className="admin-console-copy">
            Cette action supprimera definitivement les produits selectionnes de
            la base de donnees.
          </p>
          <div className="admin-product-selection-summary">
            {selectedProductIds
              .map((selectedId) => productsById.get(Number(selectedId)))
              .filter(Boolean)
              .map((product) => (
                <span key={product.id} className="admin-product-selection-pill">
                  <span>#{product.id}</span>
                  <strong>
                    {truncateLabel(product.nom || 'Produit sans nom', 24)}
                  </strong>
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
              {isDeletingProducts
                ? 'Suppression...'
                : `Supprimer ${selectedProductIds.length} produit${selectedProductIds.length > 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

export default memo(ProductDeletePanelComponent)
