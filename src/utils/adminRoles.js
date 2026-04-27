const ADMIN_ROLES = new Set(['ADMIN', 'SUPER_ADMIN'])

export function normalizeAdminRole(role) {
  return String(role || '').trim().toUpperCase()
}

export function isAdminRole(role) {
  return ADMIN_ROLES.has(normalizeAdminRole(role))
}
