export function Spinner({ size = 16, label = 'Chargement' }: { size?: number; label?: string }) {
  return (
    <span
      role="status"
      aria-label={label}
      className="ds-spinner"
      style={{
        width: size,
        height: size,
        display: 'inline-block',
        borderRadius: '50%',
        border: '2px solid var(--admin-border)',
        borderTopColor: 'var(--admin-text)',
        animation: 'ds-spin 0.7s linear infinite',
      }}
    />
  )
}
