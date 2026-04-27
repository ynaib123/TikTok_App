import { isPromotionEnabled, normalizeProductRating } from './utils.js'

export function getNormalizedImageUrls(value, primaryImageUrl = '') {
  return [
    primaryImageUrl,
    ...(Array.isArray(value)
      ? value.map((item) => String(item || '').trim())
      : String(value || '')
          .split('\n')
          .map((item) => item.trim())),
  ]
    .filter(Boolean)
    .filter((item, index, array) => array.indexOf(item) === index)
}

export function applyImageListMutation(imageUrlsText, updater, currentPrimaryImageUrl = '') {
  const nextUrls = updater(getNormalizedImageUrls(imageUrlsText))
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .filter((value, index, array) => array.indexOf(value) === index)

  const normalizedPrimaryImageUrl = String(currentPrimaryImageUrl || '').trim()
  const resolvedPrimaryImageUrl = nextUrls.includes(normalizedPrimaryImageUrl)
    ? normalizedPrimaryImageUrl
    : (nextUrls[0] || '')

  return {
    imageUrl: resolvedPrimaryImageUrl,
    imageUrls: nextUrls,
    imageUrlsText: nextUrls.join('\n'),
  }
}

export function normalizePersistedProduct(product, fallback = {}) {
  const promotionPercent = product?.promotionPercent ?? fallback.promotionPercent ?? 0
  const promotionActive = typeof product?.promotionActive === 'boolean'
    ? product.promotionActive
    : (typeof fallback.promotionActive === 'boolean' ? fallback.promotionActive : isPromotionEnabled(promotionPercent))

  return {
    ...product,
    prixAchat: product?.prixAchat ?? fallback.prixAchat ?? 0,
    prix: product?.prix ?? fallback.prix ?? 0,
    published: typeof product?.published === 'boolean'
      ? product.published
      : (typeof fallback.published === 'boolean' ? fallback.published : true),
    promotionActive,
    promotionPercent,
    stock: product?.stock ?? fallback.stock ?? 0,
    rating: normalizeProductRating(product?.rating ?? fallback.rating ?? 0),
  }
}

export function buildProductMutationPayload({ form, category = null, description = form?.description, productId = undefined }) {
  const imageUrls = getNormalizedImageUrls(form?.imageUrlsText, form?.imageUrl)
  const payload = {
    nom: String(form?.nom || '').trim(),
    description: String(description || '').trim(),
    imageUrl: imageUrls[0] || '',
    imageUrls,
    prixAchat: Number(form?.prixAchat || 0),
    prix: Number(form?.prix || 0),
    promotionActive: isPromotionEnabled(form?.promotionPercent),
    promotionPercent: Number(form?.promotionPercent || 0),
    stock: Number(form?.stock || 0),
    categorieId: category?.id ?? (form?.categorieId ? Number(form.categorieId) : null),
    categorie: category ? {
      id: category.id,
      libelle: category.libelle,
    } : null,
  }

  if (productId !== undefined) {
    payload.id = productId
  }

  return payload
}

export function buildProductFormState(product) {
  const imageUrls = getNormalizedImageUrls(product?.imageUrls, product?.imageUrl)

  return {
    nom: String(product?.nom || ''),
    description: String(product?.description || ''),
    imageUrl: imageUrls[0] || '',
    imageUrlsText: imageUrls.join('\n'),
    prixAchat: product?.prixAchat != null ? String(product.prixAchat) : '',
    prix: product?.prix != null ? String(product.prix) : '',
    promotionActive: isPromotionEnabled(product?.promotionPercent),
    promotionPercent: product?.promotionPercent != null ? String(product.promotionPercent) : '',
    stock: product?.stock != null ? String(product.stock) : '',
    rating: product?.rating != null ? String(product.rating) : '0',
    categorieId: product?.categorie?.id != null ? String(product.categorie.id) : '',
  }
}
