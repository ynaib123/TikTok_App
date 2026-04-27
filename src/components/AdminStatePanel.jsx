import AdminRouteFallback from './AdminRouteFallback'

export default function AdminStatePanel({
  action,
  compact = false,
  message,
  title,
  tone = 'neutral',
  variant = 'empty',
}) {
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
        <h2>{title || (isError ? 'Une action est requise' : 'Aucune donnee a afficher')}</h2>
        <p>{message || (isError ? 'Un incident empeche le chargement de cette vue.' : 'Cette section reviendra ici des que des donnees seront disponibles.')}</p>
      </div>
      {action ? <div className="admin-state-panel-action">{action}</div> : null}
    </section>
  )
}
