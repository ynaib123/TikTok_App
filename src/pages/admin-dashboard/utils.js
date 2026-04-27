export function formatMoney(value) {
  return `${Number(value || 0).toLocaleString('fr-FR')} MAD`
}

export function getOrderAmount(order) {
  return Number(order?.totalAmount ?? order?.montantTotal ?? 0)
}

export function formatOrderDate(value) {
  if (!value) return 'Date indisponible'
  const parsedDate = new Date(value)
  if (Number.isNaN(parsedDate.getTime())) return 'Date invalide'
  return parsedDate.toLocaleString('fr-FR')
}

export function formatDateInputValue(value) {
  if (!value) return ''
  const parsedDate = new Date(value)
  if (Number.isNaN(parsedDate.getTime())) return ''
  const year = parsedDate.getFullYear()
  const month = String(parsedDate.getMonth() + 1).padStart(2, '0')
  const day = String(parsedDate.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function createSessionActivityEntry(action, entity, entityType = 'product') {
  const normalizedType = ['category', 'client', 'session'].includes(entityType) ? entityType : 'product'
  const entityId = Number(entity?.id)
  const fallbackName = normalizedType === 'category'
    ? `Categorie #${entity?.id || '—'}`
    : normalizedType === 'client'
      ? `Client #${entity?.id || '—'}`
      : normalizedType === 'session'
        ? String(entity?.label || 'Session admin')
        : `Produit #${entity?.id || '—'}`
  const entityName = normalizedType === 'category'
    ? String(entity?.libelle || fallbackName)
    : normalizedType === 'client'
      ? String(entity?.nomComplet || entity?.fullName || entity?.email || fallbackName)
      : normalizedType === 'session'
        ? String(entity?.label || fallbackName)
        : String(entity?.nom || fallbackName)
  const module = normalizedType === 'category'
    ? 'categories'
    : normalizedType === 'client'
      ? 'clients'
      : normalizedType === 'session'
        ? 'session-history'
        : 'products'

  return {
    id: `activity-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    action,
    actorEmail: entity?.actorEmail ? String(entity.actorEmail) : null,
    actorName: entity?.actorName ? String(entity.actorName) : null,
    batchId: entity?.batchId ? String(entity.batchId) : null,
    details: entity?.details ? String(entity.details) : null,
    entityType: normalizedType,
    entityId,
    entityName,
    module,
    routePath: entity?.routePath ? String(entity.routePath) : null,
    sessionId: entity?.sessionId ? String(entity.sessionId) : null,
    source: entity?.source ? String(entity.source) : 'admin-ui',
    status: entity?.status ? String(entity.status) : 'success',
    timestamp: new Date().toISOString(),
  }
}

export function normalizeSessionActivityEntry(entry) {
  if (!entry || typeof entry !== 'object' || !entry.id) return null

  const entityType = ['category', 'client', 'session'].includes(entry.entityType) ? entry.entityType : 'product'
  const fallbackId = entityType === 'category'
    ? entry.categoryId
    : entityType === 'client'
      ? entry.clientId
      : entityType === 'session'
        ? null
        : entry.productId
  const entityId = Number(entry.entityId ?? fallbackId)
  const fallbackName = entityType === 'category'
    ? entry.categoryName ?? `Categorie #${fallbackId || '—'}`
    : entityType === 'client'
      ? entry.clientName ?? entry.email ?? `Client #${fallbackId || '—'}`
      : entityType === 'session'
        ? entry.sessionName ?? entry.entityName ?? 'Session admin'
        : entry.productName ?? `Produit #${fallbackId || '—'}`

  return {
    ...entry,
    actorEmail: entry.actorEmail ? String(entry.actorEmail) : null,
    actorName: entry.actorName ? String(entry.actorName) : null,
    batchId: entry.batchId ? String(entry.batchId) : null,
    details: entry.details ? String(entry.details) : null,
    entityType,
    entityId,
    entityName: String(entry.entityName || fallbackName),
    module: entry.module ? String(entry.module) : (
      entityType === 'category'
        ? 'categories'
        : entityType === 'client'
          ? 'clients'
          : entityType === 'session'
            ? 'session-history'
            : 'products'
    ),
    routePath: entry.routePath ? String(entry.routePath) : null,
    sessionId: entry.sessionId ? String(entry.sessionId) : null,
    source: entry.source ? String(entry.source) : 'admin-ui',
    status: entry.status ? String(entry.status) : 'success',
  }
}

export function summarizeSessionActivityGroup(group) {
  const productsCount = group.entries.filter((entry) => entry.entityType === 'product').length
  const categoriesCount = group.entries.filter((entry) => entry.entityType === 'category').length
  const clientsCount = group.entries.filter((entry) => entry.entityType === 'client').length
  const details = []

  if (productsCount > 0) {
    details.push(`${productsCount} produit${productsCount > 1 ? 's' : ''}`)
  }

  if (categoriesCount > 0) {
    details.push(`${categoriesCount} categorie${categoriesCount > 1 ? 's' : ''}`)
  }

  if (clientsCount > 0) {
    details.push(`${clientsCount} client${clientsCount > 1 ? 's' : ''}`)
  }

  return details.join(' • ')
}

export function getSessionActivityEntityLabel(entityType) {
  if (entityType === 'category') return 'Categorie'
  if (entityType === 'client') return 'Client'
  if (entityType === 'session') return 'Session'
  return 'Produit'
}

export function formatSessionActivityModule(module) {
  if (module === 'products') return 'Produits'
  if (module === 'categories') return 'Categories'
  if (module === 'clients') return 'Clients'
  if (module === 'session-history') return 'Historique'
  return 'Admin'
}

export function formatSessionActivityStatus(status) {
  return String(status || '').toLowerCase() === 'failed' ? 'Echec' : 'Reussi'
}

export function buildSessionActivityHeadline(entry) {
  const entries = Array.isArray(entry?.entries) ? entry.entries : []
  const primaryEntry = entries[0] || entry || {}
  const action = String(entry?.action || primaryEntry?.action || 'Action')
  const entityLabel = getSessionActivityEntityLabel(primaryEntry?.entityType)
  const entityName = String(primaryEntry?.entityName || `${entityLabel} #${primaryEntry?.entityId || '—'}`)

  if (entries.length > 1) {
    return `${action} sur ${entries.length} elements`
  }

  if (action === 'Consultation') {
    return `Consultation ${entityLabel.toLowerCase()} - ${entityName}`
  }

  return `${action} ${entityLabel.toLowerCase()} - ${entityName}`
}

export function buildSessionActivityContext(entry) {
  const entries = Array.isArray(entry?.entries) ? entry.entries : []
  const primaryEntry = entries[0] || entry || {}
  const entityLabel = getSessionActivityEntityLabel(primaryEntry?.entityType)
  const entityName = String(primaryEntry?.entityName || `${entityLabel} #${primaryEntry?.entityId || '—'}`)

  if (entries.length > 1) {
    return `${formatSessionActivityModule(primaryEntry?.module)} • ${formatSessionActivityStatus(primaryEntry?.status)} • ${entry?.summary || `${entries.length} elements`}`
  }

  if (Number.isFinite(Number(primaryEntry?.entityId))) {
    return `${formatSessionActivityModule(primaryEntry?.module)} • ${formatSessionActivityStatus(primaryEntry?.status)} • ${entityLabel} cible: ${entityName} • ID #${primaryEntry.entityId}`
  }

  return `${formatSessionActivityModule(primaryEntry?.module)} • ${formatSessionActivityStatus(primaryEntry?.status)} • ${entityLabel} cible: ${entityName}`
}

export function buildSessionActivityDetails(entry, limit = 4) {
  const entries = Array.isArray(entry?.entries) ? entry.entries : []
  if (entries.length <= 1) return []

  return entries
    .slice(0, Math.max(1, Number(limit || 4)))
    .map((item) => {
      const entityLabel = getSessionActivityEntityLabel(item?.entityType)
      const entityName = String(item?.entityName || `${entityLabel} #${item?.entityId || '—'}`)
      const entitySuffix = Number.isFinite(Number(item?.entityId)) ? `#${item.entityId}` : entityLabel
      return `${entityName} (${entitySuffix})`
      })
}

export function buildSessionActivityMeta(entry) {
  const entries = Array.isArray(entry?.entries) ? entry.entries : []
  const primaryEntry = entries[0] || entry || {}
  const meta = [
    formatSessionActivityModule(primaryEntry?.module),
    formatSessionActivityStatus(primaryEntry?.status),
    primaryEntry?.actorName || primaryEntry?.actorEmail,
    primaryEntry?.source,
  ]

  return meta.filter(Boolean)
}

export function getSessionActivityIcon(action) {
  if (action === 'Ajout') return '＋'
  if (action === 'Modification') return '✎'
  if (action === 'Suppression') return '🗑'
  if (action === 'Fusion') return '⇄'
  if (action === 'Consultation') return '◉'
  if (action === 'Mise en ligne') return '↑'
  if (action === 'Hors ligne') return '↓'
  if (action === 'Activation du compte') return '↗'
  if (action === 'Desactivation du compte') return '⛔'
  return '•'
}

export function getSessionActivityTone(action) {
  if (action === 'Ajout') return 'is-add'
  if (action === 'Modification') return 'is-edit'
  if (action === 'Suppression') return 'is-delete'
  if (action === 'Fusion') return 'is-edit'
  if (action === 'Consultation') return 'is-edit'
  if (action === 'Mise en ligne') return 'is-add'
  if (action === 'Hors ligne') return 'is-delete'
  if (action === 'Activation du compte') return 'is-add'
  if (action === 'Desactivation du compte') return 'is-delete'
  return ''
}

export function getProductImage(product) {
  const galleryImage = Array.isArray(product?.imageUrls) ? product.imageUrls.find(Boolean) : null
  return product?.imageUrl || galleryImage || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='180' viewBox='0 0 240 180'%3E%3Crect width='240' height='180' fill='%23ffffff'/%3E%3C/svg%3E"
}

export function getProductGalleryImages(product) {
  const primaryImage = String(product?.imageUrl || '').trim()
  const galleryImages = Array.isArray(product?.imageUrls)
    ? product.imageUrls.map((value) => String(value || '').trim()).filter(Boolean)
    : []
  const uniqueImages = galleryImages.filter((value, index, array) => array.indexOf(value) === index)

  if (!primaryImage) {
    return uniqueImages
  }

  return uniqueImages.filter((url) => url !== primaryImage)
}

export function truncateLabel(value, maxLength = 16) {
  const text = String(value || '')
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength)}...`
}

export function normalizeImageUrlsText(value) {
  return String(value || '')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item, index, array) => array.indexOf(item) === index)
    .join('\n')
}

export function getPromotionPrice(basePrice, promotionActive, promotionPercent) {
  const price = Number(basePrice || 0)
  const percent = Number(promotionPercent || 0)
  if (!Number.isFinite(price) || price <= 0) return 0
  if (!promotionActive || !Number.isFinite(percent) || percent <= 0) return Math.round(price * 100) / 100

  const discounted = price * (1 - (percent / 100))
  return Math.max(0, Math.round(discounted * 100) / 100)
}

export function isPromotionEnabled(promotionPercent) {
  const rawValue = String(promotionPercent ?? '').trim()
  if (!rawValue) return false
  const percent = Number(rawValue)
  return Number.isFinite(percent) && percent > 0
}

export function hasActivePromotion(product) {
  return Boolean(product?.promotionActive) && Number(product?.promotionPercent || 0) > 0
}

export function normalizeProductRating(value) {
  const rating = Number(value ?? 0)
  if (!Number.isFinite(rating)) return 0
  return Math.min(5, Math.max(0, Math.round(rating * 10) / 10))
}

export function buildEditFormSnapshot(form) {
  return {
    nom: String(form?.nom || ''),
    description: String(form?.description || ''),
    imageUrl: String(form?.imageUrl || ''),
    imageUrlsText: normalizeImageUrlsText(form?.imageUrlsText || ''),
    prixAchat: String(form?.prixAchat || ''),
    prix: String(form?.prix || ''),
    promotionActive: Boolean(form?.promotionActive),
    promotionPercent: String(form?.promotionPercent || ''),
    stock: String(form?.stock || ''),
    rating: String(form?.rating ?? '0'),
    categorieId: String(form?.categorieId || ''),
  }
}

export function normalizeStatus(value) {
  return String(value || '').toUpperCase()
}

export function isPendingStatus(status) {
  const normalized = normalizeStatus(status)
  return normalized === 'EN_ATTENTE' || normalized === 'EN_COURS'
}

export function isDeliveredStatus(status) {
  const normalized = normalizeStatus(status)
  return normalized === 'LIVREE' || normalized === 'PAYEE'
}

export function isCancelledStatus(status) {
  return normalizeStatus(status) === 'ANNULEE'
}

export function createTemporaryDraftId() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let value = ''

  for (let index = 0; index < 6; index += 1) {
    value += characters.charAt(Math.floor(Math.random() * characters.length))
  }

  return value
}

export function formatTemporaryDraftId(value) {
  const normalizedValue = String(value || '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()

  if (normalizedValue.length >= 6) {
    return normalizedValue.slice(-6)
  }

  return normalizedValue.padStart(6, '0')
}

export function getCurrentOpenProductId({ pageType, productId, managedEditProductId }) {
  const routeProductId = pageType === 'product-edit' && productId
    ? Number(productId)
    : Number(managedEditProductId)

  return Number.isFinite(routeProductId) ? routeProductId : null
}

export function isProductDraftDirty(editDraftsByProductId, candidateId) {
  const productDraft = editDraftsByProductId?.[String(candidateId)]
  if (!productDraft?.initialForm || !productDraft?.form) return false

  const currentSnapshot = JSON.stringify(buildEditFormSnapshot({
    ...(productDraft.form || {}),
    description: productDraft.descriptionInputValue ?? productDraft.form?.description ?? '',
  }))
  const initialSnapshot = JSON.stringify(buildEditFormSnapshot(productDraft.initialForm))
  return currentSnapshot !== initialSnapshot
}

export function getProductSelectionBuckets({
  editDraftsByProductId,
  excludedProductIds = [],
  products,
  selectedProductIds = [],
}) {
  const excludedIds = new Set(
    excludedProductIds
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id))
  )
  const mapIdsToProducts = (ids) => ids
    .map((id) => products.find((product) => Number(product?.id) === Number(id)))
    .filter(Boolean)
    .filter((product, index, array) => (
      Number.isFinite(Number(product?.id))
      && !excludedIds.has(Number(product.id))
      && array.findIndex((candidate) => Number(candidate?.id) === Number(product?.id)) === index
    ))

  const selectedProducts = mapIdsToProducts(selectedProductIds)
  const dirtyProducts = selectedProducts.filter((product) => isProductDraftDirty(editDraftsByProductId, product.id))
  const pendingProducts = selectedProducts.filter((product) => !isProductDraftDirty(editDraftsByProductId, product.id))

  return {
    dirtyProducts,
    pendingProducts,
    selectedProducts,
  }
}

export function resolveNextProductNavigation({
  editDraftsByProductId,
  excludedProductIds = [],
  products,
  priority = ['dirty', 'pending'],
  selectedProductIds = [],
}) {
  const buckets = getProductSelectionBuckets({
    editDraftsByProductId,
    excludedProductIds,
    products,
    selectedProductIds,
  })

  for (const bucketName of priority) {
    const nextProduct = buckets[`${bucketName}Products`]?.[0]
    if (nextProduct?.id) {
      return {
        product: nextProduct,
        targetPath: `/products/${nextProduct.id}/edit#product-details`,
      }
    }
  }

  return {
    product: null,
    targetPath: '/products',
  }
}
