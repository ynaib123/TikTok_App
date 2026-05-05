import type { ContentIdea } from '../../types';

interface BatchPublishConfirmModalProps {
  open: boolean;
  ideas: ContentIdea[];
  tiktokAccountOpenId: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function BatchPublishConfirmModal({
  open,
  ideas,
  tiktokAccountOpenId,
  onCancel,
  onConfirm,
}: BatchPublishConfirmModalProps) {
  if (!open) return null;
  const previewCount = Math.min(ideas.length, 4);
  const remaining = ideas.length - previewCount;

  return (
    <div
      className="journey-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="batch-publish-confirm-title"
      onClick={onCancel}
    >
      <div className="journey-modal-card" onClick={(e) => e.stopPropagation()}>
        <header className="journey-modal-head">
          <h3 id="batch-publish-confirm-title">Publier {ideas.length} vidéo(s) sur TikTok ?</h3>
          <button type="button" className="journey-modal-close" onClick={onCancel} aria-label="Fermer">×</button>
        </header>
        <div className="journey-modal-body">
          <p style={{ marginTop: 0 }}>
            Compte cible : <strong style={{ wordBreak: 'break-all' }}>{tiktokAccountOpenId ?? 'compte par défaut'}</strong>
          </p>
          <ul style={{ margin: '12px 0 0 0', paddingLeft: 18, lineHeight: 1.55 }}>
            {ideas.slice(0, previewCount).map((idea) => (
              <li key={idea.id}>
                <span style={{ color: 'var(--admin-text)' }}>#{idea.id}</span>
                {' '}— {idea.topic ?? 'Sans titre'}
              </li>
            ))}
            {remaining > 0 ? <li style={{ color: 'var(--admin-text-dim)' }}>+{remaining} autre(s)</li> : null}
          </ul>
        </div>
        <footer className="journey-modal-actions">
          <button type="button" className="journey-btn is-ghost" onClick={onCancel}>
            Annuler
          </button>
          <button type="button" className="journey-btn is-primary" onClick={onConfirm}>
            Publier {ideas.length} vidéo(s)
          </button>
        </footer>
      </div>
    </div>
  );
}
