import AdminCatalogPagination from './AdminCatalogPagination'
import AdminToolbarMenuButton from './AdminToolbarMenuButton'
import {
  CLIENT_ACCOUNT_FILTER_OPTIONS,
  CLIENT_CONNECTION_FILTER_OPTIONS,
  CLIENT_PAGE_SIZE_OPTIONS,
  CLIENT_SORT_OPTIONS,
} from './constants'
import { resolveSelectedClientAccountStatusMode } from './clientSelectionState'
import { truncateLabel } from './utils'

function FilterIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7h16" />
      <path d="M7 12h10" />
      <path d="M10 17h4" />
    </svg>
  )
}

function SortIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 6v12" />
      <path d="m5.5 9 2.5-3 2.5 3" />
      <path d="M16 18V6" />
      <path d="m13.5 15 2.5 3 2.5-3" />
    </svg>
  )
}

function CheckSquareIcon({ checked = false }) {
  return checked ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="m8 12 2.5 2.5L16.5 9" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="3" />
    </svg>
  )
}

function AccountStatusIcon({ shouldActivate = false }) {
  if (shouldActivate) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="11" width="16" height="9" rx="2.5" />
        <path d="M8 11V8.5a4 4 0 0 1 8 0V11" />
        <path d="m9.5 15.5 5 0" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="11" width="16" height="9" rx="2.5" />
      <path d="M8 11V8.5a4 4 0 0 1 8 0V11" />
      <path d="m12 14.5 0 3" />
      <path d="m10.5 16 3 0" />
    </svg>
  )
}

function ClientBadgeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </svg>
  )
}

function PageSizeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 7h12" />
      <path d="M6 12h12" />
      <path d="M6 17h8" />
    </svg>
  )
}

export default function AdminClientDirectoryPanel({
  activeClientId,
  catalog,
  clientConnectionFilter,
  clientPage,
  clientSearch,
  clientSort,
  clientStatusFilter,
  clientsPerPage,
  isCatalogLoading,
  isBulkAccountStatusSubmitting,
  onlineClientIdSet,
  selectedClientConnectionFilter,
  selectedClientIds,
  selectedClientSort,
  selectedClientStatusFilter,
  selectedClientSummary,
  selectedClientsPerPage,
  visibleClients,
  onChangeConnectionFilter,
  onChangePage,
  onChangePageSize,
  onChangeSearch,
  onChangeSort,
  onChangeStatusFilter,
  onToggleSelectedClients,
  onSelectClient,
  onClearVisibleSelection,
  onSelectVisibleClients,
  onToggleClientSelection,
  openCatalogMenu,
  setOpenCatalogMenu,
}) {
  const resolvedVisibleClients = Array.isArray(visibleClients) ? visibleClients : []
  const filterSummary = `${selectedClientStatusFilter.label} • ${selectedClientConnectionFilter.label}`
  const trimmedClientSearch = String(clientSearch || '').trim()
  const visibleClientIds = resolvedVisibleClients
    .map((client) => Number(client?.id))
    .filter(Number.isFinite)
  const hasVisibleSelection = visibleClientIds.some((clientId) => selectedClientIds.includes(clientId))
  const selectionStatusMode = resolveSelectedClientAccountStatusMode(selectedClientSummary)
  const hasSelectedClients = selectionStatusMode !== 'none'
  const shouldActivateSelectedClients = selectionStatusMode === 'all-inactive'
  const isMixedSelection = selectionStatusMode === 'mixed'
  const isUnknownSelection = selectionStatusMode === 'unknown'
  const bulkActionTitle = selectionStatusMode === 'none'
    ? 'Selectionnez des clients pour modifier leur statut'
    : selectionStatusMode === 'all-active'
      ? `${selectedClientSummary.totalCount} client(s) seront suspendus`
      : selectionStatusMode === 'all-inactive'
        ? `${selectedClientSummary.totalCount} client(s) seront reactives`
        : selectionStatusMode === 'mixed'
          ? 'Selection mixte: comptes actifs et suspendus'
          : 'Chargement des statuts de la selection'
  const clientTags = [
    {
      key: 'status',
      label: `Compte: ${selectedClientStatusFilter?.label || 'Tous les comptes'}`,
      isClearable: clientStatusFilter !== 'all',
      onClear: () => onChangeStatusFilter?.('all'),
    },
    {
      key: 'connection',
      label: `Presence: ${selectedClientConnectionFilter?.label || 'Toutes presences'}`,
      isClearable: clientConnectionFilter !== 'all',
      onClear: () => onChangeConnectionFilter?.('all'),
    },
    {
      key: 'sort',
      label: `Tri: ${selectedClientSort?.label || 'Activite recente'}`,
      isClearable: clientSort !== 'activity_desc',
      onClear: () => onChangeSort?.('activity_desc'),
    },
  ]
  const hasClearableClientTags = trimmedClientSearch.length > 0 || clientTags.some((tag) => tag.isClearable)
  const handleResetAllClientTags = () => {
    onChangeSearch?.('')
    onChangeStatusFilter?.('all')
    onChangeConnectionFilter?.('all')
    onChangeSort?.('activity_desc')
  }

  return (
    <>
      <div className="admin-product-active-filters admin-client-active-filters">
        <div className="admin-product-active-filters-list">
          {trimmedClientSearch ? (
            <button
              type="button"
              className="admin-product-active-filter-tag is-clearable"
              onClick={() => onChangeSearch?.('')}
              title={`Retirer Recherche: ${trimmedClientSearch}`}
            >
              <span>{`Recherche: ${trimmedClientSearch}`}</span>
              <strong aria-hidden="true">×</strong>
            </button>
          ) : null}

          {clientTags.map((tag) => (
            <button
              key={tag.key}
              type="button"
              className={`admin-product-active-filter-tag ${tag.isClearable ? 'is-clearable' : 'is-default'}`}
              onClick={tag.isClearable ? tag.onClear : undefined}
              title={tag.isClearable ? `Retirer ${tag.label}` : tag.label}
              disabled={!tag.isClearable}
            >
              <span>{tag.label}</span>
              {tag.isClearable ? <strong aria-hidden="true">×</strong> : null}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="admin-product-active-filters-reset"
          onClick={handleResetAllClientTags}
          disabled={!hasClearableClientTags}
        >
          Reinitialiser tout
        </button>
      </div>

      <div className="admin-product-toolbar admin-client-toolbar">
        <div className="admin-product-toolbar-controls">
          <div className="admin-product-toolbar-actions">
            <button
              type="button"
              className={`admin-console-btn admin-console-btn-muted admin-product-toolbar-action admin-client-toolbar-action ${hasSelectedClients ? 'is-active' : 'is-inactive'} ${isMixedSelection ? 'is-mixed' : ''}`}
              onClick={() => void onToggleSelectedClients?.()}
              disabled={!hasSelectedClients || isBulkAccountStatusSubmitting}
              title={bulkActionTitle}
              aria-label={bulkActionTitle}
            >
              <span className="admin-toolbar-icon" aria-hidden="true">
                <AccountStatusIcon shouldActivate={shouldActivateSelectedClients || isMixedSelection || isUnknownSelection} />
              </span>
            </button>
          </div>
        </div>

        <div className="admin-product-toolbar-search">
          <input
            type="search"
            value={clientSearch}
            onChange={(event) => onChangeSearch(event.target.value)}
            placeholder="Rechercher un client, email ou telephone..."
            aria-label="Rechercher un client"
          />
        </div>

        <div className="admin-product-toolbar-filters">
          <AdminToolbarMenuButton
            ariaLabel={`Filtres clients, selection actuelle ${filterSummary}`}
            icon={<FilterIcon />}
            menuAriaLabel="Filtres clients"
            menuId="client-filters"
            openCatalogMenu={openCatalogMenu}
            setOpenCatalogMenu={setOpenCatalogMenu}
            title={`Filtres: ${filterSummary}`}
          >
            {({ closeMenu }) => (
              <>
                <div className="admin-product-toolbar-menu-section">
                  <span className="admin-product-toolbar-menu-title">Compte</span>
                  {CLIENT_ACCOUNT_FILTER_OPTIONS.filter((option) => option.value !== 'all').map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`admin-product-toolbar-option ${clientStatusFilter === option.value ? 'is-selected' : ''}`}
                      onClick={() => {
                        onChangeStatusFilter(option.value)
                        closeMenu()
                      }}
                    >
                      <span>{option.label}</span>
                      {clientStatusFilter === option.value ? <strong>•</strong> : null}
                    </button>
                  ))}
                </div>
                <div className="admin-product-toolbar-menu-section">
                  <span className="admin-product-toolbar-menu-title">Presence</span>
                  {CLIENT_CONNECTION_FILTER_OPTIONS.filter((option) => option.value !== 'all').map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`admin-product-toolbar-option ${clientConnectionFilter === option.value ? 'is-selected' : ''}`}
                      onClick={() => {
                        onChangeConnectionFilter(option.value)
                        closeMenu()
                      }}
                    >
                      <span>{option.label}</span>
                      {clientConnectionFilter === option.value ? <strong>•</strong> : null}
                    </button>
                  ))}
                </div>
              </>
            )}
          </AdminToolbarMenuButton>

          <AdminToolbarMenuButton
            ariaLabel={`Trier les clients, option actuelle ${selectedClientSort.label}`}
            icon={<SortIcon />}
            menuAriaLabel="Trier les clients"
            menuId="client-sort"
            openCatalogMenu={openCatalogMenu}
            setOpenCatalogMenu={setOpenCatalogMenu}
            title={`Tri: ${selectedClientSort.label}`}
          >
            {({ closeMenu }) => (
              <>
                {CLIENT_SORT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`admin-product-toolbar-option ${clientSort === option.value ? 'is-selected' : ''}`}
                    onClick={() => {
                      onChangeSort(option.value)
                      closeMenu()
                    }}
                  >
                    <span>{option.label}</span>
                    {clientSort === option.value ? <strong>•</strong> : null}
                  </button>
                ))}
              </>
            )}
          </AdminToolbarMenuButton>

          <AdminToolbarMenuButton
            ariaLabel={`Clients par page, option actuelle ${selectedClientsPerPage.label}`}
            icon={<PageSizeIcon />}
            menuAriaLabel="Choisir le nombre de clients par page"
            menuClassName="admin-product-toolbar-menu-sort"
            menuId="client-page-size"
            openCatalogMenu={openCatalogMenu}
            setOpenCatalogMenu={setOpenCatalogMenu}
            title={`Par page: ${selectedClientsPerPage.label}`}
          >
            {({ closeMenu }) => (
              <>
                {CLIENT_PAGE_SIZE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`admin-product-toolbar-option ${clientsPerPage === option.value ? 'is-selected' : ''}`}
                    onClick={() => {
                      onChangePageSize?.(option.value)
                      closeMenu()
                    }}
                  >
                    <span>{option.label}</span>
                    {clientsPerPage === option.value ? <strong>•</strong> : null}
                  </button>
                ))}
              </>
            )}
          </AdminToolbarMenuButton>

          <button
            type="button"
            className={`admin-console-btn admin-console-btn-muted admin-product-toolbar-bulk-btn admin-product-toolbar-bulk-toggle ${hasVisibleSelection ? 'is-active' : ''}`}
            onClick={hasVisibleSelection ? onClearVisibleSelection : onSelectVisibleClients}
            disabled={visibleClientIds.length === 0}
            aria-label={hasVisibleSelection ? 'Tout deselectionner' : 'Tout selectionner'}
            title={hasVisibleSelection ? 'Tout deselectionner' : 'Tout selectionner'}
          >
            <span className="admin-toolbar-icon" aria-hidden="true"><CheckSquareIcon checked={hasVisibleSelection} /></span>
          </button>
        </div>
      </div>

      {!isCatalogLoading ? (
        <div className="admin-client-directory-content" aria-live="polite">
          {resolvedVisibleClients.length > 0 ? (
            <ul className="admin-console-list admin-catalog-list admin-client-list">
              {resolvedVisibleClients.map((client) => {
                const isActiveRow = Number(activeClientId) === Number(client.id)
                const isOnline = onlineClientIdSet?.has(Number(client.id))
                const isSelected = Array.isArray(selectedClientIds) && selectedClientIds.includes(Number(client.id))

                return (
                  <li key={client.id}>
                    <button
                      type="button"
                      className={`admin-client-list-item admin-catalog-list-item ${isActiveRow ? 'is-active' : ''}`}
                      onClick={() => onSelectClient(Number(client.id))}
                      aria-pressed={isActiveRow}
                    >
                      <label className="admin-product-select-checkbox" aria-label={`Selectionner ${client.fullName || `client ${client.id}`}`} onClick={(event) => event.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onToggleClientSelection?.(Number(client.id))}
                          onClick={(event) => event.stopPropagation()}
                        />
                        <span aria-hidden="true" />
                      </label>
                      <span className={`admin-client-list-badge ${isOnline ? 'is-online' : 'is-offline'}`} aria-hidden="true">
                        <ClientBadgeIcon />
                      </span>
                      <div className="admin-client-list-copy admin-catalog-list-copy">
                        <strong>{truncateLabel(client.fullName, 34)}</strong>
                        <span>{client.email || 'Email indisponible'}</span>
                      </div>

                      <div className="admin-client-list-meta admin-catalog-list-meta">
                        <span className={`admin-client-live-indicator ${isOnline ? 'is-online' : 'is-offline'}`}>
                          <span className="admin-client-live-dot" aria-hidden="true" />
                          {isOnline ? 'En ligne' : 'Hors ligne'}
                        </span>
                        <small>
                          {client.lastSeenAt ? `vu ${new Date(client.lastSeenAt).toLocaleString('fr-FR')}` : ''}
                        </small>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          ) : (
            <div className="admin-catalog-empty-state" role="status">
              Aucun client a afficher pour les filtres actuels.
            </div>
          )}

          <AdminCatalogPagination
            className="admin-client-list-pagination"
            currentPage={clientPage}
            menuId="client-page"
            onChangePage={onChangePage}
            openCatalogMenu={openCatalogMenu}
            setOpenCatalogMenu={setOpenCatalogMenu}
            summaryLabel={`Page ${catalog.page} sur ${Math.max(1, catalog.totalPages)}`}
            totalPages={Math.max(1, catalog.totalPages)}
          />
        </div>
      ) : null}
    </>
  )
}
