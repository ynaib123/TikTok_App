import type { DerivedStatus } from '../../utils/accountsHelpers'

type StatusFilter = 'all' | DerivedStatus
type ViewMode = 'cards' | 'table'

export function AccountsToolbar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  viewMode,
  onViewModeChange,
}: {
  search: string
  onSearchChange: (value: string) => void
  statusFilter: StatusFilter
  onStatusFilterChange: (value: StatusFilter) => void
  viewMode: ViewMode
  onViewModeChange: (value: ViewMode) => void
}) {
  return (
    <section className="accounts-toolbar">
      <div className="accounts-toolbar-search">
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Rechercher un service ou un compte…"
        />
      </div>
      <div className="accounts-toolbar-filters">
        {(['all', 'healthy', 'warning', 'off'] as const).map((f) => (
          <button
            key={f}
            type="button"
            className={`accounts-filter-chip ${statusFilter === f ? 'is-active' : ''}`}
            onClick={() => onStatusFilterChange(f)}
          >
            {f === 'all' ? 'Tous' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>
      <div className="accounts-toolbar-view">
        <button
          type="button"
          className={`accounts-view-toggle ${viewMode === 'cards' ? 'is-active' : ''}`}
          onClick={() => onViewModeChange('cards')}
          aria-label="Vue cartes"
        >
          Cards
        </button>
        <button
          type="button"
          className={`accounts-view-toggle ${viewMode === 'table' ? 'is-active' : ''}`}
          onClick={() => onViewModeChange('table')}
          aria-label="Vue tableau"
        >
          Table
        </button>
      </div>
    </section>
  )
}
