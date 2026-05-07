import type { ReactNode } from 'react'
import AdminRouteFallback from './AdminRouteFallback'

type AdminStatePanelTone = 'neutral' | 'positive' | 'warning' | 'critical'
type AdminStatePanelVariant = 'empty' | 'error' | 'loading'

interface AdminStatePanelProps {
  action?: ReactNode
  compact?: boolean
  message?: string
  title?: string
  tone?: AdminStatePanelTone
  variant?: AdminStatePanelVariant
}

export default function AdminStatePanel({
  action,
  compact = false,
  message,
  title,
  tone = 'neutral',
  variant = 'empty',
}: AdminStatePanelProps) {
  if (variant === 'loading') {
    return <AdminRouteFallback compact={compact} message={message || 'Chargement...'} />
  }

  const isError = variant === 'error'

  return (
    <section
      className={`admin-state-panel admin-state-panel-${tone} ${compact ? 'is-compact' : ''}`}
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
    >
      <div className="admin-state-panel-icon" aria-hidden="true">
        {isError ? '!' : '•'}
      </div>
      <div className="admin-state-panel-copy">
        <p className="admin-state-panel-kicker">Espace admin</p>
        <h2>{title || (isError ? 'Une action est requise' : 'Aucune donnée à afficher')}</h2>
        <p>{message || (isError ? 'Un incident empêche le chargement de cette vue.' : 'Cette section reviendra ici dès que des données seront disponibles.')}</p>
      </div>
      {action ? <div className="admin-state-panel-action">{action}</div> : null}
    </section>
  )
}
