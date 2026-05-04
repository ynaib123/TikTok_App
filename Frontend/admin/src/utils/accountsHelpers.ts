import type { ServiceConnection, TikTokAccount } from '../types'

export type DerivedStatus = 'healthy' | 'warning' | 'off'

export type ExpiryTone = 'ok' | 'warn' | 'bad'

export interface ExpiryDescriptor {
  label: string
  tone: ExpiryTone
}

export function deriveStatus(connection: ServiceConnection | null | undefined): DerivedStatus {
  if (!connection || !connection.active) return 'off'
  const v = String(connection.validationStatus || '').toUpperCase()
  if (v === 'OK' || v === 'VALID' || v === 'SUCCESS') return 'healthy'
  if (v === 'FAILED' || v === 'ERROR' || v === 'INVALID') return 'off'
  return 'warning'
}

export function deriveTikTokStatus(account: TikTokAccount): DerivedStatus {
  const expiresAt = account.expiresAt
  if (expiresAt) {
    const expiryMs = new Date(expiresAt).getTime()
    if (Number.isFinite(expiryMs)) {
      const daysLeft = (expiryMs - Date.now()) / 86_400_000
      if (daysLeft < 0) return 'off'
      if (daysLeft < 7) return 'warning'
    }
  }
  return 'healthy'
}

export function formatRelative(value: string | null | undefined): string {
  if (!value) return '—'
  const ms = new Date(value).getTime()
  if (!Number.isFinite(ms)) return '—'
  const diff = Date.now() - ms
  const minutes = Math.round(diff / 60_000)
  if (minutes < 1) return "à l'instant"
  if (minutes < 60) return `il y a ${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `il y a ${hours} h`
  const days = Math.round(hours / 24)
  if (days < 30) return `il y a ${days} j`
  const months = Math.round(days / 30)
  if (months < 12) return `il y a ${months} mois`
  return `il y a ${Math.round(months / 12)} an${months >= 24 ? 's' : ''}`
}

export function formatExpiry(value: string | null | undefined): ExpiryDescriptor {
  if (!value) return { label: 'Pas d’expiration', tone: 'ok' }
  const ms = new Date(value).getTime()
  if (!Number.isFinite(ms)) return { label: '—', tone: 'ok' }
  const daysLeft = Math.round((ms - Date.now()) / 86_400_000)
  if (daysLeft < 0) return { label: `Expiré il y a ${Math.abs(daysLeft)} j`, tone: 'bad' }
  if (daysLeft < 30) return { label: `Expire dans ${daysLeft} j`, tone: 'warn' }
  return { label: `Expire dans ${daysLeft} j`, tone: 'ok' }
}

export function parseScopes(metadataJson: string | null | undefined): string[] {
  if (!metadataJson) return []
  try {
    const parsed = JSON.parse(metadataJson)
    if (Array.isArray(parsed?.scopes)) return parsed.scopes
    if (typeof parsed?.scopes === 'string') return String(parsed.scopes).split(/[,\s]+/).filter(Boolean)
  } catch {
    /* ignore */
  }
  return []
}
