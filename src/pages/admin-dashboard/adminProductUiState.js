import { PRODUCT_MANAGEMENT_SUBSECTION_IDS } from './constants.js'
import { getProductSelectionBuckets } from './utils.js'

export function buildPendingProductIdsForActions({
  editDraftsByProductId,
  products,
  selectedProductIds,
}) {
  return getProductSelectionBuckets({
    editDraftsByProductId,
    products,
    selectedProductIds,
  }).pendingProducts
    .map((product) => Number(product.id))
    .filter((id) => Number.isFinite(id))
}

export function resolveSectionSelectAction({
  pageType,
  productId,
  sectionId,
  pendingProductIdsForActions,
}) {
  if (sectionId === 'product-management') {
    return { type: 'navigate', to: '/products', guarded: true }
  }

  if (pageType === 'products' && sectionId === 'delete-products') {
    return { type: 'open-delete', productIds: pendingProductIdsForActions }
  }

  if (sectionId === 'add-products') {
    return { type: 'navigate', to: '/products/add', guarded: false }
  }

  if (sectionId === 'edit-products') {
    return { type: 'navigate', to: '/products', guarded: true }
  }

  if (pageType === 'products' && PRODUCT_MANAGEMENT_SUBSECTION_IDS.includes(sectionId)) {
    return {
      type: 'open-subsection',
      sectionId,
      openDelete: sectionId === 'delete-products',
      productIds: sectionId === 'delete-products' ? pendingProductIdsForActions : [],
    }
  }

  if (pageType === 'product-edit') {
    if (sectionId === 'product-details' && productId) {
      return { type: 'navigate', to: `/products/${productId}/edit#product-details`, guarded: true }
    }

    if (sectionId === 'product-delete-action' && productId) {
      return { type: 'open-delete', productIds: [productId], redirectTo: '/products' }
    }

    return {
      type: 'navigate',
      to: sectionId === 'product-details' ? `/products/${productId}/edit#product-details` : '/products',
      guarded: true,
    }
  }

  return { type: 'noop' }
}
