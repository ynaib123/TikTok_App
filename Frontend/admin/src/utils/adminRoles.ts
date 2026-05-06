const ADMIN_ROLES = new Set(['ADMIN', 'SUPER_ADMIN'])

export function normalizeAdminRole(role: unknown): string {
  return String(role || '').trim().toUpperCase()
}

export function isAdminRole(role: unknown): boolean {
  return ADMIN_ROLES.has(normalizeAdminRole(role))
}
