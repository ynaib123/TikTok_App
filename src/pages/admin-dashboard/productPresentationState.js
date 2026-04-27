import {
  formatMoney,
  getProductGalleryImages,
  getProductImage,
  getPromotionPrice,
  hasActivePromotion,
  isPromotionEnabled,
} from './utils.js'

export function getStockTone(stockValue) {
  const stock = Number(stockValue || 0)
  if (stock === 0) return 'stock-out'
  if (stock <= 5) return 'stock-low'
  return 'stock-ok'
}

export function getPublishState(product) {
  return product?.published !== false
    ? { isPublished: true, label: 'En ligne', tone: 'is-online' }
    : { isPublished: false, label: 'Hors ligne', tone: 'is-offline' }
}

export function buildProductCommerceMetrics({
  price,
  promotionActive,
  promotionPercent,
  purchasePrice = 0,
  stock = 0,
}) {
  const currentPrice = getPromotionPrice(price, promotionActive, promotionPercent)
  const purchaseValue = Number(purchasePrice || 0)
  const stockValue = Number(stock || 0)

  return {
    currentPrice,
    currentPriceLabel: formatMoney(currentPrice),
    marginValue: currentPrice - purchaseValue,
    purchasePriceLabel: formatMoney(purchaseValue),
    stockCostValue: purchaseValue * stockValue,
    stockSaleValue: Number(price || 0) * stockValue,
    stockTone: getStockTone(stockValue),
  }
}

export function buildProductCardPresentation(product) {
  const promoActive = hasActivePromotion(product)
  const publishState = getPublishState(product)
  const commerceMetrics = buildProductCommerceMetrics({
    price: product?.prix,
    promotionActive: promoActive,
    promotionPercent: product?.promotionPercent,
    purchasePrice: product?.prixAchat,
    stock: product?.stock,
  })

  return {
    categoryLabel: product?.categorie?.libelle || 'Sans categorie',
    galleryImages: getProductGalleryImages(product),
    idLabel: `#${product?.id}`,
    image: getProductImage(product),
    isPublished: publishState.isPublished,
    name: product?.nom || 'Produit sans nom',
    priceLabel: commerceMetrics.currentPriceLabel,
    promotionActive: promoActive,
    publishLabel: publishState.label,
    publishTone: publishState.tone,
    rating: product?.rating,
    rawPriceLabel: formatMoney(product?.prix || 0),
    stockTone: commerceMetrics.stockTone,
    stockValue: Number(product?.stock || 0),
  }
}

export function buildCreateFormPresentation(form) {
  const promotionActive = isPromotionEnabled(form?.promotionPercent)
  const commerceMetrics = buildProductCommerceMetrics({
    price: form?.prix,
    promotionActive,
    promotionPercent: form?.promotionPercent,
    purchasePrice: form?.prixAchat,
    stock: form?.stock,
  })

  return {
    ...commerceMetrics,
    promotionActive,
  }
}
