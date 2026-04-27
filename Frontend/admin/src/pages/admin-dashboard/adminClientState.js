import {
  normalizeSharedAddresses,
} from '../../../../shared/contracts/addressContract.js'
import {
  buildSharedPaymentMethodView,
  normalizeSharedPaymentMethodType,
} from '../../../../shared/contracts/paymentMethodContract.js'

export function buildClientFullName(client) {
  const firstName = String(client?.prenom || '').trim()
  const lastName = String(client?.nom || '').trim()
  return `${firstName} ${lastName}`.trim() || client?.email || `Client #${client?.id || '—'}`
}

export function getClientStatusLabel(client) {
  if (client?.compteActif === false) return 'Compte desactive'
  return 'Compte active'
}

export function getClientHealthTone(client) {
  if (client?.compteActif === false) return 'risk'
  return 'good'
}

export function buildClientTagList(client) {
  return [client?.online ? 'En ligne' : 'Hors ligne']
}

export function filterClientCatalogItems(items, {
  connectionFilter,
  verificationFilter,
} = {}) {
  return (Array.isArray(items) ? items : []).filter((client) => {
    const isOnline = Boolean(client?.online)
    const isVerified = Boolean(client?.emailVerifie)

    if (connectionFilter === 'online' && !isOnline) return false
    if (connectionFilter === 'offline' && isOnline) return false
    if (verificationFilter === 'verified' && !isVerified) return false
    if (verificationFilter === 'pending' && isVerified) return false

    return true
  })
}

export function buildClientCatalogInsights(clients = [], onlineClientIdSet = new Set()) {
  const normalizedClients = Array.isArray(clients) ? clients : []

  return normalizedClients.reduce((summary, client) => {
    const clientId = Number(client?.id)
    const isOnline = onlineClientIdSet.has(clientId)

    if (client?.compteActif !== false) summary.activeCount += 1
    if (isOnline) summary.onlineCount += 1
    if (client?.emailVerifie) summary.verifiedCount += 1
    if (Number(client?.pendingOrders || 0) > 0) summary.followUpCount += 1
    if (Number(client?.orderCount || 0) >= 5 || Number(client?.totalSpent || 0) >= 2000) summary.vipCount += 1

    return summary
  }, {
    activeCount: 0,
    followUpCount: 0,
    onlineCount: 0,
    verifiedCount: 0,
    vipCount: 0,
  })
}

export function buildClientFilterSummary({
  clientStatusFilter,
  connectionFilter,
  verificationFilter,
  selectedClientStatusFilter,
  selectedClientConnectionFilter,
  selectedClientVerificationFilter,
}) {
  const parts = []
  if (clientStatusFilter && clientStatusFilter !== 'all') parts.push(selectedClientStatusFilter?.label)
  if (connectionFilter && connectionFilter !== 'all') parts.push(selectedClientConnectionFilter?.label)
  if (verificationFilter && verificationFilter !== 'all') parts.push(selectedClientVerificationFilter?.label)
  return parts.length > 0 ? parts.join(' • ') : 'Aucun filtre'
}

export function normalizeDeliveryAddresses(addresses) {
  return normalizeSharedAddresses(addresses)
    .map((address) => ({
      id: address.id,
      label: address.label,
      address: address.addressLine,
      city: address.city,
      postalCode: address.postalCode,
      phone: address.phone,
      isPrimary: Boolean(address.isDefault),
    }))
    .filter(Boolean)
    .sort((left, right) => Number(Boolean(right?.isPrimary)) - Number(Boolean(left?.isPrimary)))
}

export function normalizePaymentMethods(paymentMethods) {
  if (!Array.isArray(paymentMethods)) return []

  return paymentMethods
    .map((method, index) => {
      if (!method || typeof method !== 'object') return null

      const sharedView = buildSharedPaymentMethodView(method, index)
      const normalizedMethod = normalizeSharedPaymentMethodType(method)
      const cardBrand = String(sharedView.cardBrand || '').trim().toUpperCase()
      const holder = String(sharedView.holder || '').trim()
      const expiry = String(sharedView.expiry || '').trim()
      const cardLast4 = String(sharedView.cardLast4 || '').trim()
      const paypalEmail = String(sharedView.paypalEmail || '').trim()

      return {
        id: sharedView.id || `payment-${index}`,
        typeLabel: normalizedMethod === 'paypal'
          ? 'PayPal'
          : cardBrand === 'VISA'
            ? 'Visa'
            : cardBrand === 'MASTERCARD'
              ? 'Mastercard'
              : 'Carte bancaire',
        holder: holder || 'Titulaire non renseigne',
        details: normalizedMethod === 'paypal'
          ? (paypalEmail || 'Email PayPal non renseigne')
          : `${cardLast4 ? `**** **** **** ${cardLast4}` : 'Carte non renseignee'}${expiry ? ` - ${expiry}` : ''}`,
        isActive: Boolean(method.isActive),
      }
    })
    .filter(Boolean)
}

export function normalizeClientCatalogItem(client) {
  if (!client || typeof client !== 'object') return null

  return {
    ...client,
    fullName: buildClientFullName(client),
    compteActif: client.compteActif !== false,
    online: Boolean(client.online),
    orderCount: Number(client.orderCount || 0),
    totalSpent: Number(client.totalSpent || 0),
    averageBasket: Number(client.averageBasket || 0),
    pendingOrders: Number(client.pendingOrders || 0),
    deliveredOrders: Number(client.deliveredOrders || 0),
    activeSessionCount: Number(client.activeSessionCount || 0),
    lastSeenAt: client.lastSeenAt || null,
    createdAt: client.createdAt || null,
  }
}

export function normalizeClientCatalogResponse(response) {
  const items = Array.isArray(response?.items)
    ? response.items.map(normalizeClientCatalogItem).filter(Boolean)
    : []

  return {
    items,
    page: Number(response?.page || 1),
    size: Number(response?.size || 12),
    totalItems: Number(response?.totalItems || 0),
    totalPages: Number(response?.totalPages || 0),
  }
}

export function buildClientDirectoryQuery({
  search,
  sort,
  page,
  size,
  connectionFilter,
  statusFilter,
  verificationFilter,
}) {
  const query = new URLSearchParams()
  const trimmedSearch = String(search || '').trim()
  if (trimmedSearch) query.set('search', trimmedSearch)
  query.set('sort', String(sort || 'activity_desc'))
  query.set('page', String(page || 1))
  query.set('size', String(size || 12))
  query.set('connectionFilter', String(connectionFilter || 'all'))
  query.set('statusFilter', String(statusFilter || 'all'))
  query.set('verificationFilter', String(verificationFilter || 'all'))
  return query.toString()
}
