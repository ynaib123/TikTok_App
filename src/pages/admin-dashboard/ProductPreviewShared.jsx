import { memo, useMemo, useState } from 'react'
import { formatMoney, normalizeProductRating } from './utils'

function useSelectablePreviewImage(imageUrls = [], fallbackImage = '') {
  const [selectedImage, setSelectedImage] = useState('')
  const resolvedImage = useMemo(() => {
    if (selectedImage && imageUrls.includes(selectedImage)) {
      return selectedImage
    }

    return imageUrls[0] || String(fallbackImage || '').trim()
  }, [fallbackImage, imageUrls, selectedImage])

  return [resolvedImage, setSelectedImage]
}

export const ActionIcon = memo(function ActionIcon({ children }) {
  return (
    <span className="admin-product-action-icon" aria-hidden="true">
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </svg>
    </span>
  )
})

export const ProductRatingStars = memo(function ProductRatingStars({
  rating,
  size = 'md',
  showValue = true,
}) {
  const normalizedRating = normalizeProductRating(rating)
  const fillPercent = `${(normalizedRating / 5) * 100}%`

  return (
    <div className={`admin-product-rating admin-product-rating-${size}`} aria-label={`Note ${normalizedRating} sur 5`}>
      <span className="admin-product-rating-stars" aria-hidden="true">
        <span className="admin-product-rating-stars-base">★★★★★</span>
        <span className="admin-product-rating-stars-fill" style={{ width: fillPercent }}>★★★★★</span>
      </span>
      {showValue ? <strong>{normalizedRating.toFixed(1)}</strong> : null}
    </div>
  )
})

function getPreviewImageUrls(imageUrls, fallbackImage) {
  const normalizedUrls = Array.isArray(imageUrls)
    ? imageUrls.map((value) => String(value || '').trim()).filter(Boolean)
    : []
  const primaryImage = String(fallbackImage || '').trim()

  if (!primaryImage) {
    return normalizedUrls
  }

  return [primaryImage, ...normalizedUrls.filter((url) => url !== primaryImage)]
}

export const ProductEditLivePreview = memo(function ProductEditLivePreview({
  beforeProduct = null,
  productId = null,
  previewImage,
  previewImageStyle,
  productName,
  categoryLabel,
  priceValue,
  originalPriceValue,
  promotionActive,
  rating,
  stockValue,
  isPublished = true,
  isDirty,
  isSaving,
  onReset,
  previewImageUrls = [],
  formId = 'product-edit-form',
  submitLabel = 'Enregistrer',
  submitBusyLabel = 'Enregistrement en cours',
}) {
  const beforeStock = Number(beforeProduct?.stockValue || 0)
  const beforeStockTone = beforeStock === 0 ? 'stock-out' : beforeStock <= 5 ? 'stock-low' : 'stock-ok'
  const afterStock = Number(stockValue || 0)
  const afterStockTone = afterStock === 0 ? 'stock-out' : afterStock <= 5 ? 'stock-low' : 'stock-ok'
  const beforeImageUrls = useMemo(
    () => getPreviewImageUrls(beforeProduct?.imageUrls, beforeProduct?.image),
    [beforeProduct?.image, beforeProduct?.imageUrls]
  )
  const afterImageUrls = useMemo(
    () => getPreviewImageUrls(previewImageUrls, previewImage),
    [previewImage, previewImageUrls]
  )
  const [selectedBeforeImage, setSelectedBeforeImage] = useSelectablePreviewImage(beforeImageUrls, beforeProduct?.image)
  const [selectedAfterImage, setSelectedAfterImage] = useSelectablePreviewImage(afterImageUrls, previewImage)
  const previewHeadActionsStyle = {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '8px',
    marginLeft: 'auto',
    flexWrap: 'nowrap',
    whiteSpace: 'nowrap',
    flex: '0 0 auto',
  }
  const previewHeadButtonStyle = {
    width: '52px',
    minWidth: '52px',
    maxWidth: '52px',
    height: '46px',
    minHeight: '46px',
    padding: '0',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '14px',
    border: '1px solid rgba(255, 255, 255, 0.14)',
    background: 'linear-gradient(180deg, rgba(62, 62, 62, 0.98) 0%, rgba(40, 40, 40, 0.98) 100%)',
    boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 10px 22px rgba(0, 0, 0, 0.2)',
    color: '#fafafa',
    fontWeight: 800,
    letterSpacing: '0',
  }
  const previewHeadPrimaryButtonStyle = {
    ...previewHeadButtonStyle,
    width: 'auto',
    minWidth: '144px',
    maxWidth: 'none',
    padding: '0 24px',
    gap: '8px',
    border: '1px solid rgba(255, 92, 102, 0.32)',
    background: 'linear-gradient(180deg, rgba(255, 92, 102, 0.24) 0%, rgba(92, 26, 31, 0.98) 100%)',
    color: '#ffeef0',
    boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 10px 22px rgba(52, 10, 16, 0.24)',
  }
  const previewHeadResetButtonStyle = {
    width: previewHeadButtonStyle.width,
    minWidth: previewHeadButtonStyle.minWidth,
    maxWidth: previewHeadButtonStyle.maxWidth,
    height: previewHeadButtonStyle.height,
    minHeight: previewHeadButtonStyle.minHeight,
    padding: previewHeadButtonStyle.padding,
    display: previewHeadButtonStyle.display,
    alignItems: previewHeadButtonStyle.alignItems,
    justifyContent: previewHeadButtonStyle.justifyContent,
    borderRadius: previewHeadButtonStyle.borderRadius,
  }
  const previewHeadIconStyle = {
    width: '18px',
    height: '18px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto',
  }

  const previewHeaderActions = (
    <div className="admin-product-preview-head-actions" style={previewHeadActionsStyle}>
      <button
        type="button"
        className="admin-product-preview-action-btn admin-product-preview-action-btn-reset"
        style={previewHeadResetButtonStyle}
        onClick={onReset}
        disabled={!isDirty}
        aria-label="Reinitialiser"
        title="Reinitialiser"
      >
        <span className="admin-product-preview-action-icon" style={previewHeadIconStyle} aria-hidden="true">
          <ActionIcon>
            <path d="M16.5 10a6.5 6.5 0 1 1-2.3-4.98" />
            <path d="M16.5 4.75v5h-5" />
          </ActionIcon>
        </span>
      </button>
      <button
        type="submit"
        form={formId}
        className="admin-product-preview-action-btn admin-product-preview-action-btn-save"
        style={previewHeadPrimaryButtonStyle}
        aria-label={isSaving ? submitBusyLabel : submitLabel}
        title={isSaving ? submitBusyLabel : submitLabel}
        disabled={isSaving || !isDirty}
      >
        <span>{isSaving ? 'Enregistrement...' : submitLabel}</span>
      </button>
    </div>
  )

  const renderPreviewCard = ({
    image,
    imageStyle,
    imageUrls = [],
    name,
    category,
    currentPrice,
    strikePrice,
    hasPromotion,
    currentRating,
    currentStock,
    stockTone,
    isPublished = true,
    referenceLabel = '',
    footerActions = null,
    onSelectImage = null,
  }) => (
    <div className={`admin-product-preview-compare-item ${referenceLabel ? 'is-before' : 'is-after'}`}>
      <article className={`admin-product-card admin-product-preview-catalog-card ${isPublished ? '' : 'is-unpublished'}`}>
        <span
          className={`admin-product-card-status-indicator ${isPublished ? 'is-online' : 'is-offline'}`}
          aria-label={isPublished ? 'Produit en ligne' : 'Produit hors ligne'}
          title={isPublished ? 'Produit en ligne' : 'Produit hors ligne'}
        ></span>
        <div className="admin-product-card-button admin-product-preview-card-shell">
          <div className="admin-product-card-media">
            {!isPublished ? (
              <span className="admin-product-card-offline-tag">Hors ligne</span>
            ) : null}
            <img src={image} alt={name || 'Produit'} style={imageStyle} />
          </div>
          {imageUrls.length > 0 ? (
            <div className="admin-product-preview-thumb-row admin-product-card-thumb-row" aria-label="Miniatures des photos du produit">
              {imageUrls.slice(0, 4).map((url, index) => {
                const isActive = url === image
                return (
                  <button
                    key={`${url}-${index}`}
                    type="button"
                    className={`admin-product-preview-inline-thumb admin-product-card-inline-thumb ${isActive ? 'is-active' : ''}`}
                    onClick={() => onSelectImage?.(url)}
                    aria-label={`Afficher la photo ${index + 1}`}
                    title={`Afficher la photo ${index + 1}`}
                  >
                    <img src={url} alt="" />
                  </button>
                )
              })}
            </div>
          ) : null}
          <div className="admin-product-card-body">
            <h3>{name || 'Produit sans nom'}</h3>
            <div className="admin-product-card-submeta">
              <span className="admin-product-category-line">
                Categorie: {category || 'Sans categorie'}
              </span>
              <span className={`admin-product-stock admin-product-stock-inline ${stockTone}`}>
                <span className="admin-product-stock-label">Stock</span>
                <strong className="admin-product-stock-count">{currentStock}</strong>
              </span>
            </div>
            <ProductRatingStars rating={currentRating} size="sm" />
            <div className="admin-product-card-footer">
              <div className="admin-product-price-stack admin-product-price-stack-inline-start">
                <strong>{formatMoney(currentPrice || 0)}</strong>
                {hasPromotion ? <span className="admin-product-price-strike">{formatMoney(strikePrice || 0)}</span> : null}
              </div>
              {referenceLabel ? <span>{referenceLabel}</span> : null}
              {footerActions}
            </div>
          </div>
        </div>
      </article>
    </div>
  )

  return (
    <article className="admin-console-panel admin-product-preview-panel">
      <div className="admin-console-panel-head admin-product-preview-head">
        <div>
          <p className="admin-console-panel-kicker">Apercu</p>
        </div>
        {previewHeaderActions}
      </div>
      <div className={`admin-product-preview-compare ${beforeProduct ? '' : 'is-single'}`}>
        {beforeProduct ? renderPreviewCard({
          image: selectedBeforeImage || beforeProduct.image,
          imageStyle: beforeProduct.imageStyle,
          imageUrls: beforeImageUrls,
          name: beforeProduct.name,
          category: beforeProduct.category,
          currentPrice: beforeProduct.priceValue,
          strikePrice: beforeProduct.originalPriceValue,
          hasPromotion: beforeProduct.promotionActive,
          currentRating: beforeProduct.rating,
          currentStock: beforeStock,
          stockTone: beforeStockTone,
          isPublished: beforeProduct.isPublished,
          referenceLabel: beforeProduct.id ? `ID #${beforeProduct.id}` : '',
          onSelectImage: setSelectedBeforeImage,
        }) : null}
        {beforeProduct ? (
          <div className="admin-product-preview-compare-bridge" aria-hidden="true">
            <span className="admin-product-preview-compare-bridge-line"></span>
            <div className="admin-product-preview-compare-bridge-core">
              <div className="admin-product-preview-compare-flow">
                <span className="admin-product-preview-compare-side is-before">Avant</span>
                <span className="admin-product-preview-compare-arrow">→</span>
                <span className="admin-product-preview-compare-side is-after">Apres</span>
              </div>
            </div>
            <span className="admin-product-preview-compare-bridge-line"></span>
          </div>
        ) : null}
        {renderPreviewCard({
          image: selectedAfterImage || previewImage,
          imageStyle: previewImageStyle,
          imageUrls: afterImageUrls,
          name: productName,
          category: categoryLabel,
          currentPrice: priceValue,
          strikePrice: originalPriceValue,
          hasPromotion: promotionActive,
          currentRating: rating,
          currentStock: afterStock,
          stockTone: afterStockTone,
          isPublished,
          referenceLabel: productId ? `ID #${productId}` : '',
          footerActions: null,
          onSelectImage: setSelectedAfterImage,
        })}
      </div>
    </article>
  )
})
