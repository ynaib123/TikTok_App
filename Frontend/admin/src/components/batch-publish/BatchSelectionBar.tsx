import { useMemo } from 'react';
import type { BatchPhase } from '../../hooks/useBatchPublish';
import { useSelection } from '../../contexts/SelectionContext';

interface BatchSelectionBarProps {
  phase: BatchPhase;
  eligibleIdsOnPage: number[];
  tokenAccountReady: boolean;
  onPublishClick: () => void;
  onShowProgress: () => void;
  inFlightCount?: number;
  totalInFlight?: number;
}

export default function BatchSelectionBar({
  phase,
  eligibleIdsOnPage,
  tokenAccountReady,
  onPublishClick,
  onShowProgress,
  inFlightCount = 0,
  totalInFlight = 0,
}: BatchSelectionBarProps) {
  const selection = useSelection();
  const selectedCount = selection.size;

  const eligibleSet = useMemo(() => new Set(eligibleIdsOnPage), [eligibleIdsOnPage]);
  const allEligibleSelected = eligibleIdsOnPage.length > 0
    && eligibleIdsOnPage.every((id) => selection.isSelected(id));

  const selectAllVisible = () => {
    const ids = eligibleIdsOnPage.filter((id) => !selection.isSelected(id));
    selection.selectMany(ids);
  };

  const unselectAllVisible = () => {
    const ids = eligibleIdsOnPage.filter((id) => selection.isSelected(id));
    selection.unselectMany(ids);
  };

  const isRunning = phase === 'starting' || phase === 'running';
  const isTerminalNonIdle = phase === 'completed' || phase === 'partial_failure' || phase === 'failed' || phase === 'error';

  if (selectedCount === 0 && !isRunning && !isTerminalNonIdle) return null;

  let ctaLabel: string;
  let ctaDisabled = false;
  let ctaError = false;

  if (isRunning) {
    ctaLabel = totalInFlight > 0
      ? `Publication en cours... (${inFlightCount}/${totalInFlight})`
      : 'Publication en cours...';
    ctaDisabled = true;
  } else if (phase === 'partial_failure' || phase === 'failed' || phase === 'error') {
    ctaLabel = 'Voir les echecs';
    ctaError = true;
  } else if (phase === 'completed') {
    ctaLabel = 'Voir le resume';
  } else if (!tokenAccountReady) {
    ctaLabel = 'Reconnectez TikTok pour publier';
    ctaDisabled = true;
    ctaError = true;
  } else if (selection.isAtMaxSize) {
    ctaLabel = `Publier (${selectedCount}/${selection.maxSize})`;
  } else {
    ctaLabel = `Publier la selection (${selectedCount})`;
  }

  const handleCtaClick = () => {
    if (isRunning || isTerminalNonIdle) {
      onShowProgress();
    } else {
      onPublishClick();
    }
  };

  return (
    <div
      className="batch-selection-bar"
      role="region"
      aria-label="Barre de selection multiple"
    >
      <span className="batch-selection-bar-info" aria-live="polite">
        {selectedCount > 0
          ? `${selectedCount} video(s) selectionnee(s)${selection.isAtMaxSize ? ` — max ${selection.maxSize}` : ''}`
          : 'Selection vide'}
      </span>

      {eligibleIdsOnPage.length > 0 && !isRunning ? (
        <button
          type="button"
          className="batch-selection-bar-btn"
          onClick={allEligibleSelected ? unselectAllVisible : selectAllVisible}
          disabled={selection.isAtMaxSize && !allEligibleSelected}
          title={selection.isAtMaxSize && !allEligibleSelected ? `Maximum ${selection.maxSize} selectionnees` : undefined}
        >
          {allEligibleSelected
            ? `Decocher (${eligibleIdsOnPage.length})`
            : `Tout cocher (${eligibleIdsOnPage.length} eligibles)`}
        </button>
      ) : null}

      {selectedCount > 0 && !isRunning ? (
        <button type="button" className="batch-selection-bar-btn" onClick={selection.clear}>
          Effacer
        </button>
      ) : null}

      <span className="batch-selection-bar-spacer" />

      <button
        type="button"
        className={`batch-selection-bar-btn batch-selection-bar-cta ${ctaError ? 'is-error' : ''}`}
        onClick={handleCtaClick}
        disabled={ctaDisabled || (selectedCount === 0 && !isRunning && !isTerminalNonIdle)}
      >
        {ctaLabel}
      </button>

      <span className="visually-hidden">{`${eligibleSet.size} video(s) eligibles sur la page courante.`}</span>
    </div>
  );
}
