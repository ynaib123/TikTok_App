export function parseRouteClientId(clientId) {
  const normalizedId = Number(clientId)
  return Number.isFinite(normalizedId) ? normalizedId : null
}

export function getVisibleClients(catalog) {
  return Array.isArray(catalog?.items) ? catalog.items : []
}

export function buildActiveClientErrorBanner({
  actionError,
  catalogError,
  deliveryError,
  paymentError,
  profileError,
  setActionError,
  setCatalogError,
  setDeliveryError,
  setPaymentError,
  setProfileError,
}) {
  if (actionError) return { message: actionError, onClose: () => setActionError(null) }
  if (catalogError) return { message: catalogError, onClose: () => setCatalogError(null) }
  if (profileError) return { message: profileError, onClose: () => setProfileError(null) }
  if (deliveryError) return { message: deliveryError, onClose: () => setDeliveryError(null) }
  if (paymentError) return { message: paymentError, onClose: () => setPaymentError(null) }
  return null
}
