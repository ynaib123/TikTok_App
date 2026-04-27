import { Fragment, memo, useState } from 'react'
import { buildProductCardPresentation } from './productPresentationState.js'
import { ProductRatingStars } from './ProductShared'

function ProductCatalogSkeleton({ productViewMode }) {
  if (productViewMode === 'details') {
    return (
      <div className="admin-product-details-table-wrap is-skeleton" aria-hidden="true">
        <table className="admin-product-details-table">
          <colgroup>
            <col className="admin-product-details-col admin-product-details-col-select" />
            <col className="admin-product-details-col admin-product-details-col-product" />
            <col className="admin-product-details-col admin-product-details-col-category" />
            <col className="admin-product-details-col admin-product-details-col-price" />
            <col className="admin-product-details-col admin-product-details-col-stock" />
            <col className="admin-product-details-col admin-product-details-col-status" />
            <col className="admin-product-details-col admin-product-details-col-rating" />
          </colgroup>
          <thead>
            <tr>
              <th scope="col" className="admin-product-details-col admin-product-details-col-select"></th>
              <th scope="col" className="admin-product-details-col admin-product-details-col-product">Produit</th>
              <th scope="col" className="admin-product-details-col admin-product-details-col-category">Categorie</th>
              <th scope="col" className="admin-product-details-col admin-product-details-col-price">Prix</th>
              <th scope="col" className="admin-product-details-col admin-product-details-col-stock">Stock</th>
              <th scope="col" className="admin-product-details-col admin-product-details-col-status">Etat</th>
              <th scope="col" className="admin-product-details-col admin-product-details-col-rating">Note</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 6 }).map((_, index) => (
              <tr key={`product-details-skeleton-${index}`} className="admin-product-details-row is-loading">
                <td className="admin-product-details-cell admin-product-details-cell-select"><span className="admin-skeleton admin-skeleton-checkbox"></span></td>
                <td className="admin-product-details-cell admin-product-details-cell-product">
                  <div className="admin-product-table-product">
                    <div className="admin-product-table-media admin-skeleton-block"></div>
                    <div className="admin-product-table-main admin-skeleton-stack">
                      <span className="admin-skeleton admin-skeleton-line is-title"></span>
                      <span className="admin-skeleton admin-skeleton-line"></span>
                    </div>
                  </div>
                </td>
                <td className="admin-product-details-cell admin-product-details-cell-category"><span className="admin-skeleton admin-skeleton-pill"></span></td>
                <td className="admin-product-details-cell admin-product-details-cell-price"><span className="admin-skeleton admin-skeleton-line is-short"></span></td>
                <td className="admin-product-details-cell admin-product-details-cell-stock"><span className="admin-skeleton admin-skeleton-line is-short"></span></td>
                <td className="admin-product-details-cell admin-product-details-cell-status"><span className="admin-skeleton admin-skeleton-pill"></span></td>
                <td className="admin-product-details-cell admin-product-details-cell-rating"><span className="admin-skeleton admin-skeleton-line is-short"></span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="admin-product-catalog-grid is-skeleton" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, index) => (
        <article key={`product-card-skeleton-${index}`} className="admin-product-card is-loading">
          <div className="admin-product-card-media admin-skeleton-block"></div>
          <div className="admin-product-card-body">
            <div className="admin-product-card-topline">
              <span className="admin-skeleton admin-skeleton-pill"></span>
              <span className="admin-skeleton admin-skeleton-pill is-short"></span>
            </div>
            <span className="admin-skeleton admin-skeleton-line is-title"></span>
            <span className="admin-skeleton admin-skeleton-line"></span>
            <span className="admin-skeleton admin-skeleton-line is-medium"></span>
            <div className="admin-product-card-footer">
              <div className="admin-product-price-stack admin-product-price-stack-inline-start">
                <span className="admin-skeleton admin-skeleton-line is-short"></span>
              </div>
              <span className="admin-skeleton admin-skeleton-line is-short"></span>
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}

function MainStatCardsComponent({ cards, isLoading }) {
  if (isLoading) {
    return (
      <Fragment>
        <article className="admin-console-stat-card is-sky"><span>Clients actifs</span><strong>—</strong></article>
        <article className="admin-console-stat-card is-mint"><span>Produits</span><strong>—</strong></article>
        <article className="admin-console-stat-card is-amber"><span>Commandes</span><strong>—</strong></article>
        <article className="admin-console-stat-card is-indigo"><span>CA total</span><strong>—</strong></article>
      </Fragment>
    )
  }

  return (
    <Fragment>
      {cards.map((card) => (
        <article key={card.label} className={`admin-console-stat-card is-${card.tone}`}>
          <span>{card.label}</span>
          <strong>{card.value}</strong>
          <small>{card.hint}</small>
        </article>
      ))}
    </Fragment>
  )
}

function HealthCardsComponent({ cards }) {
  return (
    <section className="admin-console-health-grid">
      {cards.map((card) => (
        <article key={card.label} className={`admin-console-health-card is-${card.tone}`}>
          <span>{card.label}</span>
          <strong>{card.value}</strong>
        </article>
      ))}
    </section>
  )
}

function LowStockPanelComponent({ isLoading, products }) {
  if (isLoading) {
    return <div className="admin-console-empty">Chargement des indicateurs...</div>
  }
  if (products.length === 0) {
    return <div className="admin-console-empty">Aucun produit en seuil critique.</div>
  }

  return (
    <ul className="admin-console-list admin-catalog-list">
      {products.map((product) => (
        <li key={product.id}>
          <div>
            <strong>{product.nom}</strong>
            <span>{product?.categorie?.libelle || 'Categorie non definie'}</span>
          </div>
          <span className="admin-console-badge admin-console-badge-alert">
            {Number(product?.stock || 0)} en stock
          </span>
        </li>
      ))}
    </ul>
  )
}

function RecentOrdersPanelComponent({ formatMoney, formatOrderDate, getOrderAmount, isLoading, normalizeStatus, orders }) {
  if (isLoading) {
    return <div className="admin-console-empty">Chargement des commandes...</div>
  }
  if (orders.length === 0) {
    return <div className="admin-console-empty">Aucune commande trouvee.</div>
  }

  return (
    <ul className="admin-console-list">
      {orders.map((order) => {
        const status = normalizeStatus(order?.statut || 'INCONNU')
        return (
          <li key={order.id} className="admin-catalog-feed-item">
            <div className="admin-catalog-feed-main">
              <strong>Commande #{order.id}</strong>
              <span>{formatOrderDate(order?.dateCommande)}</span>
            </div>
            <div className="admin-console-order-meta admin-catalog-feed-aside">
              <span className={`admin-console-badge admin-console-status-${status.toLowerCase()}`}>
                {status}
              </span>
              <strong>{formatMoney(getOrderAmount(order))}</strong>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

const ProductCatalogCard = memo(function ProductCatalogCard({
  isSelected,
  openProductDetails,
  product,
  toggleSelectedProductId,
}) {
  const presentation = buildProductCardPresentation(product)
  const previewImages = (
    [presentation.image, ...presentation.galleryImages].filter((value, index, array) => (
      Boolean(value) && array.indexOf(value) === index
    ))
  )
  const [activeImage, setActiveImage] = useState(previewImages[0] || presentation.image)
  const displayedActiveImage = previewImages.includes(activeImage)
    ? activeImage
    : (previewImages[0] || presentation.image)

  return (
    <article className={`admin-product-card ${isSelected ? 'is-selected' : ''} ${presentation.isPublished ? '' : 'is-unpublished'}`}>
      <label className="admin-product-card-checkbox" aria-label={`Selectionner ${product?.nom || `le produit ${product.id}`}`}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => toggleSelectedProductId(product.id)}
          onClick={(event) => event.stopPropagation()}
        />
        <span aria-hidden="true"></span>
      </label>
      <span
        className={`admin-product-card-status-indicator ${presentation.publishTone}`}
        aria-label={presentation.isPublished ? 'Produit en ligne' : 'Produit hors ligne'}
        title={presentation.isPublished ? 'Produit en ligne' : 'Produit hors ligne'}
      ></span>
      <div
        className="admin-product-card-button"
        role="button"
        tabIndex={0}
        onClick={() => openProductDetails(product.id)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            openProductDetails(product.id)
          }
        }}
        aria-label={`Ouvrir la fiche du produit ${product?.nom || product.id}`}
      >
        <div className="admin-product-card-media">
          {!presentation.isPublished ? (
            <span className="admin-product-card-offline-tag">Hors ligne</span>
          ) : null}
          <img src={displayedActiveImage} alt={presentation.name} />
        </div>
        {previewImages.length > 0 ? (
          <div className="admin-product-preview-thumb-row admin-product-card-thumb-row" aria-label="Autres photos du produit">
            {previewImages.slice(0, 4).map((url, index) => (
              <button
                key={`${product.id}-thumb-${index}`}
                type="button"
                className={`admin-product-preview-inline-thumb admin-product-card-inline-thumb ${displayedActiveImage === url ? 'is-active' : ''}`}
                onClick={(event) => {
                  event.stopPropagation()
                  setActiveImage(url)
                }}
                aria-label={`Afficher la photo ${index + 1}`}
                title={`Afficher la photo ${index + 1}`}
              >
                <img src={url} alt="" />
              </button>
            ))}
          </div>
        ) : null}
        <div className="admin-product-card-body">
          <h3>{presentation.name}</h3>
          <div className="admin-product-card-submeta">
            <span className="admin-product-category-line">
              Categorie: {presentation.categoryLabel}
            </span>
            <span className={`admin-product-stock admin-product-stock-inline ${presentation.stockTone}`}>
              <span className="admin-product-stock-label">Stock</span>
              <strong className="admin-product-stock-count">{presentation.stockValue}</strong>
            </span>
          </div>
          <ProductRatingStars rating={presentation.rating} size="sm" />
          <div className="admin-product-card-footer">
            <div className="admin-product-price-stack admin-product-price-stack-inline-start">
              <strong>{presentation.priceLabel}</strong>
              {presentation.promotionActive ? <span className="admin-product-price-strike">{presentation.rawPriceLabel}</span> : null}
            </div>
            <span>ID {presentation.idLabel}</span>
          </div>
        </div>
      </div>
    </article>
  )
})

function ProductCatalogPanelComponent({
  filteredProductCount,
  loading,
  openProductDetails,
  paginatedProducts,
  productSort,
  productViewMode,
  selectedProductIdSet,
  setProductSort,
  toggleSelectedProductId,
}) {
  const getHeaderSortState = (field) => {
    if (field === 'name') {
      if (productSort === 'name_asc') return { active: true, direction: 'asc', nextSort: 'name_desc' }
      if (productSort === 'name_desc') return { active: true, direction: 'desc', nextSort: 'name_asc' }
      return { active: false, direction: null, nextSort: 'name_asc' }
    }

    if (field === 'price') {
      if (productSort === 'price_asc') return { active: true, direction: 'asc', nextSort: 'price_desc' }
      if (productSort === 'price_desc') return { active: true, direction: 'desc', nextSort: 'price_asc' }
      return { active: false, direction: null, nextSort: 'price_desc' }
    }

    if (field === 'stock') {
      if (productSort === 'stock_asc') return { active: true, direction: 'asc', nextSort: 'stock_desc' }
      if (productSort === 'stock_desc') return { active: true, direction: 'desc', nextSort: 'stock_asc' }
      return { active: false, direction: null, nextSort: 'stock_desc' }
    }

    if (field === 'rating') {
      if (productSort === 'rating_asc') return { active: true, direction: 'asc', nextSort: 'rating_desc' }
      if (productSort === 'rating_desc') return { active: true, direction: 'desc', nextSort: 'rating_asc' }
      return { active: false, direction: null, nextSort: 'rating_desc' }
    }

    if (field === 'status') {
      if (productSort === 'status_online') return { active: true, direction: 'asc', nextSort: 'status_offline' }
      if (productSort === 'status_offline') return { active: true, direction: 'desc', nextSort: 'status_online' }
      return { active: false, direction: null, nextSort: 'status_online' }
    }

    return { active: false, direction: null, nextSort: 'recent' }
  }

  const renderSortableHeader = (label, field) => {
    const state = getHeaderSortState(field)
    const indicator = state.direction === 'asc' ? '↑' : state.direction === 'desc' ? '↓' : '⇅'

    return (
      <button
        type="button"
        className={`admin-product-table-sort ${state.active ? 'is-active' : ''}`}
        onClick={() => setProductSort(state.nextSort)}
        aria-label={`Trier par ${label.toLowerCase()} ${state.direction === 'desc' ? 'ordre inverse' : 'ordre direct'}`}
        title={`Trier par ${label.toLowerCase()}`}
      >
        <span>{label}</span>
        <span aria-hidden="true">{indicator}</span>
      </button>
    )
  }

  if (loading) {
    return <ProductCatalogSkeleton productViewMode={productViewMode} />
  }

  if (filteredProductCount === 0) {
    return (
      <div className="admin-catalog-empty-state" role="status" aria-live="polite">
        Aucun produit a afficher pour les filtres actuels.
      </div>
    )
  }

  if (productViewMode === 'details') {
    return (
      <div className="admin-product-details-table-wrap">
        <table className="admin-product-details-table">
          <colgroup>
            <col className="admin-product-details-col admin-product-details-col-select" />
            <col className="admin-product-details-col admin-product-details-col-id" />
            <col className="admin-product-details-col admin-product-details-col-media" />
            <col className="admin-product-details-col admin-product-details-col-product" />
            <col className="admin-product-details-col admin-product-details-col-category" />
            <col className="admin-product-details-col admin-product-details-col-price" />
            <col className="admin-product-details-col admin-product-details-col-stock" />
            <col className="admin-product-details-col admin-product-details-col-status" />
            <col className="admin-product-details-col admin-product-details-col-rating" />
          </colgroup>
          <thead>
            <tr>
              <th scope="col" className="admin-product-details-col admin-product-details-col-select" aria-label="Selection"></th>
              <th scope="col" className="admin-product-details-col admin-product-details-col-id">ID</th>
              <th scope="col" className="admin-product-details-col admin-product-details-col-media">Photo</th>
              <th scope="col" className="admin-product-details-col admin-product-details-col-product">{renderSortableHeader('Produit', 'name')}</th>
              <th scope="col" className="admin-product-details-col admin-product-details-col-category">Categorie</th>
              <th scope="col" className="admin-product-details-col admin-product-details-col-price">{renderSortableHeader('Prix', 'price')}</th>
              <th scope="col" className="admin-product-details-col admin-product-details-col-stock">{renderSortableHeader('Stock', 'stock')}</th>
              <th scope="col" className="admin-product-details-col admin-product-details-col-status">{renderSortableHeader('Etat', 'status')}</th>
              <th scope="col" className="admin-product-details-col admin-product-details-col-rating">{renderSortableHeader('Note', 'rating')}</th>
            </tr>
          </thead>
          <tbody>
            {paginatedProducts.map((product) => {
              const presentation = buildProductCardPresentation(product)
              const isSelected = selectedProductIdSet.has(Number(product.id))

              return (
                <tr
                  key={product.id}
                  className={`admin-product-details-row ${isSelected ? 'is-selected' : ''} ${presentation.isPublished ? '' : 'is-unpublished'}`}
                  onClick={() => openProductDetails(product.id)}
                  tabIndex={0}
                  role="button"
                  aria-pressed={isSelected}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      openProductDetails(product.id)
                    }
                  }}
                  aria-label={`Ouvrir la fiche du produit ${product?.nom || product.id}`}
                >
                  <td className="admin-product-details-cell admin-product-details-cell-select" onClick={(event) => event.stopPropagation()}>
                    <label
                      className="admin-product-select-checkbox"
                      aria-label={`Selectionner ${product?.nom || `le produit ${product.id}`}`}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectedProductId(product.id)}
                        onClick={(event) => event.stopPropagation()}
                      />
                      <span aria-hidden="true"></span>
                    </label>
                  </td>
                  <td className="admin-product-details-cell admin-product-details-cell-id">
                    <span className="admin-product-table-id">{presentation.idLabel}</span>
                  </td>
                  <td className="admin-product-details-cell admin-product-details-cell-media">
                    <div className="admin-product-table-media">
                      <img src={presentation.image} alt={presentation.name} />
                    </div>
                  </td>
                  <td className="admin-product-details-cell admin-product-details-cell-product">
                    <div className="admin-product-table-main">
                      <strong>{presentation.name}</strong>
                      {presentation.promotionActive ? (
                        <span className="admin-product-table-subline">Promo active</span>
                      ) : null}
                    </div>
                  </td>
                  <td className="admin-product-details-cell admin-product-details-cell-category">
                    <span className="admin-product-category admin-product-category-compact">
                      {presentation.categoryLabel}
                    </span>
                  </td>
                  <td className="admin-product-details-cell admin-product-details-cell-price">
                    <div className="admin-product-price-stack admin-product-price-stack-inline-start">
                      <strong className="admin-product-table-price">{presentation.priceLabel}</strong>
                      {presentation.promotionActive ? <span className="admin-product-price-strike">{presentation.rawPriceLabel}</span> : null}
                    </div>
                  </td>
                  <td className="admin-product-details-cell admin-product-details-cell-stock">
                    <span className={`admin-product-stock admin-product-stock-compact ${presentation.stockTone}`}>
                      <span className="admin-product-stock-label">Stock</span>
                      <strong className="admin-product-stock-count">{presentation.stockValue}</strong>
                    </span>
                  </td>
                  <td className="admin-product-details-cell admin-product-details-cell-status">
                    <span className={`admin-product-publish-pill ${presentation.publishTone}`}>
                      {presentation.publishLabel}
                    </span>
                  </td>
                  <td className="admin-product-details-cell admin-product-details-cell-rating">
                    <ProductRatingStars rating={presentation.rating} size="sm" />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="admin-product-catalog-grid">
      {paginatedProducts.map((product) => {
        const isSelected = selectedProductIdSet.has(Number(product.id))

        return (
          <ProductCatalogCard
            key={product.id}
            isSelected={isSelected}
            openProductDetails={openProductDetails}
            product={product}
            toggleSelectedProductId={toggleSelectedProductId}
          />
        )
      })}
    </div>
  )
}

export const MainStatCards = memo(MainStatCardsComponent)
export const HealthCards = memo(HealthCardsComponent)
export const LowStockPanel = memo(LowStockPanelComponent)
export const RecentOrdersPanel = memo(RecentOrdersPanelComponent)
export const ProductCatalogPanel = memo(ProductCatalogPanelComponent)
