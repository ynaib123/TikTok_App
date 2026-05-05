import { useSelection } from '../../contexts/SelectionContext'

interface BulkDeleteSelectionBarProps {
  visibleIds: number[]
  isDeleting: boolean
  onDeleteClick: () => void
}

export default function BulkDeleteSelectionBar({
  visibleIds,
  isDeleting,
  onDeleteClick,
}: BulkDeleteSelectionBarProps) {
  const selection = useSelection()
  const selectedCount = selection.size

  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selection.isSelected(id))
  const toggleAllVisible = () => {
    if (allVisibleSelected) selection.unselectMany(visibleIds)
    else selection.selectMany(visibleIds.filter((id) => !selection.isSelected(id)))
  }

  if (selectedCount === 0 && !isDeleting) return null

  return (
    <div className="batch-selection-bar" role="region" aria-label="Barre de sélection multiple">
      <span className="batch-selection-bar-info" aria-live="polite">
        {selectedCount > 0 ? `${selectedCount} vidéo(s) sélectionnée(s)` : 'Sélection vide'}
      </span>

      {visibleIds.length > 0 && !isDeleting ? (
        <button
          type="button"
          className="batch-selection-bar-btn"
          onClick={toggleAllVisible}
        >
          {allVisibleSelected
            ? `Tout décocher (${visibleIds.length})`
            : `Tout cocher (${visibleIds.length})`}
        </button>
      ) : null}

      {selectedCount > 0 && !isDeleting ? (
        <button type="button" className="batch-selection-bar-btn" onClick={selection.clear}>
          Effacer
        </button>
      ) : null}

      <span className="batch-selection-bar-spacer" />

      <button
        type="button"
        className="batch-selection-bar-btn batch-selection-bar-cta is-error"
        onClick={onDeleteClick}
        disabled={isDeleting || selectedCount === 0}
      >
        {isDeleting ? 'Suppression…' : `Supprimer (${selectedCount})`}
      </button>
    </div>
  )
}
