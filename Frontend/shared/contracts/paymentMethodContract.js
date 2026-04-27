export function normalizeSharedPaymentMethodType(method) {
  const normalizedType = String(
    method?.type
    || method?.method
    || method?.provider
    || ''
  ).trim().toLowerCase()

  if (normalizedType === 'paypal') return 'paypal'
  return 'card'
}

export function buildSharedPaymentMethodView(method = {}, index = 0) {
  const normalizedType = normalizeSharedPaymentMethodType(method)

  return {
    id: method.id ?? `payment-${index}`,
    type: normalizedType,
    cardBrand: String(method.cardBrand || method.brand || '').trim(),
    cardLast4: String(method.cardLast4 || method.cardNumberLast4 || method.last4 || '').trim(),
    expiry: String(method.expiry || method.expiration || '').trim(),
    holder: String(method.holder || method.cardHolder || '').trim(),
    paypalEmail: String(method.paypalEmail || method.email || '').trim(),
  }
}
