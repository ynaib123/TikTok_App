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
      role="dialog"
      aria-modal="true"
      aria-label="Confirmer la publication du lot"
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 70,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <div style={{ background: '#fff', borderRadius: 8, maxWidth: 440, width: '100%', padding: 20 }}>
        <h2 style={{ marginTop: 0 }}>Publier {ideas.length} video(s) sur TikTok ?</h2>
        <p style={{ color: '#374151' }}>
          Compte cible: <strong>{tiktokAccountOpenId ?? 'compte par defaut'}</strong>
        </p>
        <ul style={{ margin: '12px 0', paddingLeft: 18, color: '#374151' }}>
          {ideas.slice(0, previewCount).map((idea) => (
            <li key={idea.id}>
              #{idea.id} — {idea.topic ?? 'Sans titre'}
            </li>
          ))}
          {remaining > 0 ? <li>+{remaining} autre(s)</li> : null}
        </ul>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <button type="button" className="batch-selection-bar-btn" onClick={onCancel}>
            Annuler
          </button>
          <button
            type="button"
            className="batch-selection-bar-btn batch-selection-bar-cta"
            onClick={onConfirm}
          >
            Publier {ideas.length} video(s)
          </button>
        </div>
      </div>
    </div>
  );
}
