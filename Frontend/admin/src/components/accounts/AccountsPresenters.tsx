import type { DerivedStatus } from '../../utils/accountsHelpers'

export function ProviderGlyph({ providerKey }: { providerKey: string }) {
  const letter = (providerKey || '?').charAt(0).toUpperCase()
  return <div className={`accounts-glyph accounts-glyph-${providerKey.toLowerCase()}`}>{letter}</div>
}

export function StatTile({
  label,
  value,
  delta,
  trend = null,
}: {
  label: string
  value: string | number
  delta?: string | null
  trend?: 'up' | 'warn' | null
}) {
  const trendClass = trend === 'up' ? 'is-up' : trend === 'warn' ? 'is-warn' : ''
  return (
    <div className="journey-stat">
      <span className="journey-stat-label">{label}</span>
      <span className="journey-stat-value">{value}</span>
      {delta ? <span className={`journey-stat-trend ${trendClass}`.trim()}>{delta}</span> : null}
    </div>
  )
}

export function StatusPill({ status, label }: { status: DerivedStatus; label?: string }) {
  const text = label || (status === 'healthy' ? 'Healthy' : status === 'warning' ? 'Warning' : 'Off')
  return <span className={`accounts-status-pill is-${status}`}>{text}</span>
}
