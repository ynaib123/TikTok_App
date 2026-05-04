import type { BatchPublish, BatchPublishItem } from '../../types/batchPublish';
import type { BatchPhase } from '../../hooks/useBatchPublish';

interface BatchProgressDrawerProps {
  open: boolean;
  phase: BatchPhase;
  batch: BatchPublish | null;
  errorMessage: string | null;
  onClose: () => void;
  onRetryFailed: () => void;
  onDismiss: () => void;
}

function statusLabel(status: BatchPublishItem['status']): string {
  switch (status) {
    case 'PENDING': return 'En attente';
    case 'RUNNING': return 'En cours...';
    case 'PUBLISHED': return 'Publiee';
    case 'FAILED': return 'Echec';
    case 'CANCELLED': return 'Annulee';
    default: return status;
  }
}

function statusGlyph(status: BatchPublishItem['status']): string {
  switch (status) {
    case 'PUBLISHED': return '[OK]';
    case 'FAILED': return '[X]';
    case 'RUNNING': return '...';
    case 'PENDING': return '...';
    case 'CANCELLED': return '[-]';
    default: return '';
  }
}

export default function BatchProgressDrawer({
  open,
  phase,
  batch,
  errorMessage,
  onClose,
  onRetryFailed,
  onDismiss,
}: BatchProgressDrawerProps) {
  const total = batch?.totalCount ?? 0;
  const completed = batch?.completedCount ?? 0;
  const failed = batch?.failedCount ?? 0;
  const processed = completed + failed;
  const progressPct = total === 0 ? 0 : Math.round((processed / total) * 100);

  const isTerminal = phase === 'completed' || phase === 'partial_failure' || phase === 'failed' || phase === 'error';
  const failedItems = batch ? batch.items.filter((it) => it.status === 'FAILED') : [];

  let title: string;
  let progressClass = '';
  if (phase === 'completed') {
    title = `${completed} video(s) publiee(s) avec succes`;
    progressClass = 'is-success';
  } else if (phase === 'partial_failure') {
    title = `${completed}/${total} publiees — ${failed} echec(s)`;
    progressClass = 'is-partial';
  } else if (phase === 'failed' || phase === 'error') {
    title = `Echec du lot — ${failed || total} echec(s)`;
    progressClass = 'is-failed';
  } else if (phase === 'starting') {
    title = 'Demarrage du lot...';
  } else if (phase === 'running') {
    title = `Publication en cours... ${processed}/${total}`;
  } else {
    title = 'Aucun lot actif';
  }

  return (
    <aside
      className={`batch-progress-drawer ${open ? 'is-open' : ''}`}
      role="dialog"
      aria-modal="false"
      aria-label="Progression du lot"
      aria-hidden={!open}
    >
      <div className="batch-progress-drawer-header">
        <h2>{title}</h2>
        <button
          type="button"
          className="batch-progress-drawer-close"
          onClick={onClose}
          aria-label="Fermer le panneau"
        >
          x
        </button>
      </div>

      <div className="batch-progress-summary">
        <div className="batch-progress-bar" aria-hidden="true">
          <div
            className={`batch-progress-bar-fill ${progressClass}`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <span>
          {processed}/{total} traitees ({progressPct}%) — {completed} publiees, {failed} echec(s)
        </span>
        {errorMessage ? (
          <span style={{ color: '#b91c1c' }}>Erreur: {errorMessage}</span>
        ) : null}
      </div>

      <div className="batch-progress-items">
        {batch?.items.map((item) => (
          <div
            key={item.contentIdeaId}
            className={`batch-progress-item is-${item.status.toLowerCase()}`}
          >
            <span aria-hidden="true">{statusGlyph(item.status)}</span>
            <div>
              <div>#{item.contentIdeaId}</div>
              {item.errorMessage ? (
                <p className="batch-progress-item-error">{item.errorMessage}</p>
              ) : null}
            </div>
            <span className="batch-progress-item-status">{statusLabel(item.status)}</span>
          </div>
        )) ?? null}
      </div>

      <div className="batch-progress-drawer-footer">
        {isTerminal && failedItems.length > 0 ? (
          <button
            type="button"
            className="batch-selection-bar-btn batch-selection-bar-cta"
            onClick={onRetryFailed}
          >
            Reessayer les {failedItems.length} echec(s)
          </button>
        ) : null}
        {isTerminal ? (
          <button type="button" className="batch-selection-bar-btn" onClick={onDismiss}>
            Fermer le lot
          </button>
        ) : null}
      </div>
    </aside>
  );
}
