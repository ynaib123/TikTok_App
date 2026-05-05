import type { ContentIdea } from '../../types'

interface BulkDeleteConfirmModalProps {
  open: boolean
  ideas: ContentIdea[]
  isDeleting: boolean
  onCancel: () => void
  onConfirm: () => void
}

export default function BulkDeleteConfirmModal({
  open,
  ideas,
  isDeleting,
  onCancel,
  onConfirm,
}: BulkDeleteConfirmModalProps) {
  if (!open) return null
  const previewCount = Math.min(ideas.length, 4)
  const remaining = ideas.length - previewCount

  return (
    <div className="journey-modal-overlay">
      {!isDeleting ? (
        <button
          type="button"
          className="journey-modal-backdrop"
          aria-label="Fermer la fenêtre"
          onClick={onCancel}
        />
      ) : null}
      <div
        className="journey-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bulk-delete-confirm-title"
      >
        <header className="journey-modal-head">
          <h3 id="bulk-delete-confirm-title">
            Supprimer {ideas.length} vidéo{ideas.length > 1 ? 's' : ''} ?
          </h3>
          {!isDeleting ? (
            <button type="button" className="journey-modal-close" onClick={onCancel} aria-label="Fermer">×</button>
          ) : null}
        </header>
        <div className="journey-modal-body">
          <p style={{ marginTop: 0 }}>
            Cette action est <strong>irréversible</strong>. Les idées, scripts, runs et événements
            associés seront supprimés définitivement.
          </p>
          <ul style={{ margin: '12px 0 0 0', paddingLeft: 18, lineHeight: 1.55 }}>
            {ideas.slice(0, previewCount).map((idea) => (
              <li key={idea.id}>
                <span style={{ color: 'var(--admin-text)' }}>#{idea.id}</span>
                {' '}— {idea.topic ?? 'Sans titre'}
              </li>
            ))}
            {remaining > 0 ? (
              <li style={{ color: 'var(--admin-text-dim)' }}>+{remaining} autre(s)</li>
            ) : null}
          </ul>
        </div>
        <footer className="journey-modal-actions">
          <button type="button" className="journey-btn is-ghost" onClick={onCancel} disabled={isDeleting}>
            Annuler
          </button>
          <button
            type="button"
            className="journey-btn is-primary"
            style={{ background: '#b53b3b', borderColor: '#b53b3b', color: '#fff' }}
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? 'Suppression…' : `Supprimer ${ideas.length}`}
          </button>
        </footer>
      </div>
    </div>
  )
}
