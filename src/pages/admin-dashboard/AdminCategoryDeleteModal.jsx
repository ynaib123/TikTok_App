import { Fragment } from 'react'
import AdminModal from '../../components/AdminModal'

function buildDeleteDescription(categoryDeletePreview, isDeletePreviewLoading, categoryCount) {
  if (isDeletePreviewLoading) {
    return 'Analyse de la suppression en cours...'
  }

  if (!categoryDeletePreview) {
    return categoryCount > 1
      ? `Cette action supprimera definitivement ${categoryCount} categories ainsi que leurs produits. L historique des commandes sera conserve.`
      : 'Cette action supprimera definitivement cette categorie ainsi que ses produits. L historique des commandes sera conserve.'
  }

  return `Cette action supprimera definitivement ${categoryDeletePreview.categoryCount} categories et ${categoryDeletePreview.productCount} produits de la base de donnees.`
}

export default function AdminCategoryDeleteModal({
  categoryDeleteModalState,
  categoryDeletePreview,
  closeCategoryDeleteModal,
  deleteModalCategories,
  handleDeleteSelectedCategories,
  isDeletePreviewLoading,
  isDeletingCategory,
}) {
  return (
    <AdminModal
      isOpen={categoryDeleteModalState.isOpen}
      onClose={closeCategoryDeleteModal}
      className="admin-modal-tone-danger"
      kicker="Confirmation"
      title={categoryDeleteModalState.categoryIds.length > 1 ? 'Supprimer ces categories' : 'Supprimer cette categorie'}
      description={(
        <span className="admin-modal-description-inline">
          {buildDeleteDescription(
            categoryDeletePreview,
            isDeletePreviewLoading,
            categoryDeleteModalState.categoryIds.length
          )}
        </span>
      )}
      size="md"
      closeOnOverlay={false}
      closeOnEscape={false}
      showCloseButton={false}
      footer={(
        <Fragment>
          <button type="button" className="admin-console-btn admin-console-btn-muted" onClick={closeCategoryDeleteModal} disabled={isDeletingCategory}>Annuler</button>
          <button type="button" className="admin-console-btn admin-console-btn-danger" onClick={() => void handleDeleteSelectedCategories()} disabled={isDeletingCategory || categoryDeleteModalState.categoryIds.length === 0}>
            {isDeletingCategory ? 'Suppression...' : 'Supprimer'}
          </button>
        </Fragment>
      )}
    >
      <div className="admin-console-stack">
        <div className="admin-product-selection-summary admin-product-selection-summary-column admin-modal-selection-list">
          {(categoryDeletePreview?.categories?.length ? categoryDeletePreview.categories : deleteModalCategories).map((category) => {
            const products = Array.isArray(category?.products) ? category.products : []
            const productCount = Number(category?.productCount || products.length || 0)
            return (
              <span key={category.id} className="admin-product-selection-pill admin-modal-category-pill">
                <span className="admin-modal-category-row">
                  <span className="admin-product-selection-thumb admin-modal-selection-badge" aria-hidden="true">
                    #{category.id}
                  </span>
                  <span className="admin-product-selection-copy">
                    <strong>{category.libelle || 'Categorie sans nom'}</strong>
                  </span>
                  <small>{productCount} produit{productCount > 1 ? 's' : ''}</small>
                </span>
                {products.length > 0 ? (
                  <span className="admin-modal-category-products">
                    {products.map((product) => (
                      <span key={product.id} className="admin-modal-category-product">
                        <span className="admin-product-selection-thumb admin-modal-category-product-thumb" aria-hidden="true">
                          {product.imageUrl ? <img src={product.imageUrl} alt="" /> : <span className="admin-modal-category-product-thumb-fallback">#{product.id}</span>}
                        </span>
                        <span className="admin-modal-category-product-name">{product.nom || 'Produit sans nom'}</span>
                        <small>Ref #{product.id}</small>
                      </span>
                    ))}
                  </span>
                ) : null}
              </span>
            )
          })}
        </div>
      </div>
    </AdminModal>
  )
}
