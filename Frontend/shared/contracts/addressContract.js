function normalizeAddressValue(address = {}, index = 0) {
  if (!address || typeof address !== 'object') return null

  const addressLine = String(
    address.addressLine
    || address.address
    || address.adresse
    || ''
  ).trim()

  const city = String(address.city || address.ville || '').trim()
  const postalCode = String(address.postalCode || address.codePostal || '').trim()
  const phone = String(address.phone || address.telephone || '').trim()
  const label = String(address.label || address.libelle || '').trim()

  return {
    id: address.id ?? `address-${index}`,
    label: label || `Adresse ${index + 1}`,
    addressLine,
    city,
    postalCode,
    phone,
    isDefault: Boolean(address.isDefault ?? address.isActive ?? address.primary),
  }
}

export function normalizeSharedAddresses(addresses) {
  if (!Array.isArray(addresses)) return []

  return addresses
    .map((address, index) => normalizeAddressValue(address, index))
    .filter(Boolean)
}
