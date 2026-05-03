import type { JSX } from 'react'
import AdminToolbarMenuButton from '../admin-dashboard/AdminToolbarMenuButton'
import type { ContentIdea } from '../../types'

type Option = { value: string; label: string }

type IconComponent = () => JSX.Element

interface TikTokLibraryViewProps {
  AddIcon: IconComponent
  FilterIcon: IconComponent
  GridIcon: IconComponent
  SearchIcon: IconComponent
  SortIcon: IconComponent
  TableIcon: IconComponent
  catalogTags: Array<{ id: string; label: string; isClearable: boolean; onClear?: () => void }>
  contentIdeas: ContentIdea[]
  filteredIdeas: ContentIdea[]
  getIdeaStatusLabel: (idea: ContentIdea) => string
  handleResetAllCatalogTags: () => void
  hasClearableCatalogTags: boolean
  isJourneyReady: boolean
  isLoading: boolean
  isPublished: (idea: ContentIdea) => boolean
  isRenderReady: (idea: ContentIdea) => boolean
  listFilter: string
  listFilterOptions: Option[]
  listSearch: string
  listSort: string
  listSortOptions: Option[]
  listViewMode: string
  openListMenu: string | null
  selectedListFilter: Option
  selectedListSort: Option
  setListFilter: (value: string) => void
  setListSearch: (value: string) => void
  setListSort: (value: string) => void
  setListViewMode: (value: string) => void
  setOpenListMenu: (value: string | null) => void
  startAddFlow: () => void
}

export default function TikTokLibraryView(props: TikTokLibraryViewProps) {
  const {
    AddIcon,
    FilterIcon,
    GridIcon,
    SearchIcon,
    SortIcon,
    TableIcon,
    catalogTags,
    contentIdeas,
    filteredIdeas,
    getIdeaStatusLabel,
    handleResetAllCatalogTags,
    hasClearableCatalogTags,
    isJourneyReady,
    isLoading,
    isPublished,
    isRenderReady,
    listFilter,
    listFilterOptions,
    listSearch,
    listSort,
    listSortOptions,
    listViewMode,
    openListMenu,
    selectedListFilter,
    selectedListSort,
    setListFilter,
    setListSearch,
    setListSort,
    setListViewMode,
    setOpenListMenu,
    startAddFlow,
  } = props

  return (
    <>
      {catalogTags.length > 0 ? (
        <div className="admin-product-active-filters" aria-label="Filtres et tri actifs">
          <div className="admin-product-active-filters-list">
            {catalogTags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                className={`admin-product-active-filter-tag ${tag.isClearable ? 'is-clearable' : 'is-default'}`}
                onClick={tag.isClearable ? tag.onClear : undefined}
                title={tag.isClearable ? `Retirer ${tag.label}` : tag.label}
                disabled={!tag.isClearable}
              >
                <span>{tag.label}</span>
                {tag.isClearable ? <strong aria-hidden="true">x</strong> : null}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="admin-product-active-filters-reset"
            onClick={handleResetAllCatalogTags}
            disabled={!hasClearableCatalogTags}
          >
            Reinitialiser tout
          </button>
        </div>
      ) : null}

      <section className="tiktok-page-toolbar">
        <div className="admin-product-toolbar">
          <div className="admin-product-toolbar-controls">
            <div className="admin-product-toolbar-actions">
              <button
                type="button"
                className="admin-console-btn admin-console-btn-muted admin-product-toolbar-action admin-product-toolbar-icon-btn"
                onClick={startAddFlow}
                aria-label="Ajouter une video"
                title="Ajouter"
              >
                <span className="admin-toolbar-icon" aria-hidden="true"><AddIcon /></span>
              </button>
            </div>
          </div>

          <div className="admin-product-toolbar-search tiktok-library-toolbar-search">
            <span className="admin-toolbar-icon" aria-hidden="true"><SearchIcon /></span>
            <input
              type="search"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              value={listSearch}
              onChange={(event) => setListSearch(event.target.value)}
              placeholder="Rechercher ..."
              aria-label="Rechercher une video TikTok"
            />
          </div>

          <div className="admin-product-toolbar-filters">
            <button
              type="button"
              className="admin-console-btn admin-console-btn-muted admin-product-toolbar-action admin-product-toolbar-icon-btn"
              onClick={() => setListViewMode(listViewMode === 'grid' ? 'table' : 'grid')}
              aria-label={`Basculer vers l affichage ${listViewMode === 'grid' ? 'tableau' : 'grille'}`}
              title={`Affichage actuel: ${listViewMode === 'grid' ? 'Grille' : 'Tableau'}`}
            >
              <span className="admin-toolbar-icon" aria-hidden="true">
                {listViewMode === 'grid' ? <TableIcon /> : <GridIcon />}
              </span>
            </button>

            <AdminToolbarMenuButton
              ariaLabel={`Filtrer les videos, filtre actuel ${selectedListFilter.label}`}
              icon={<FilterIcon />}
              menuAriaLabel="Filtres des videos TikTok"
              menuId="tiktok-filter"
              openCatalogMenu={openListMenu}
              setOpenCatalogMenu={setOpenListMenu}
              title={`Filtre: ${selectedListFilter.label}`}
            >
              {({ closeMenu }: { closeMenu: () => void }) => (
                <div className="admin-product-toolbar-menu-options-scroll admin-product-toolbar-menu-options-scroll-five">
                  {listFilterOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`admin-product-toolbar-option ${listFilter === option.value ? 'is-selected' : ''}`}
                      onClick={() => {
                        setListFilter(option.value)
                        closeMenu()
                      }}
                    >
                      <span>{option.label}</span>
                      {listFilter === option.value ? <strong>.</strong> : null}
                    </button>
                  ))}
                </div>
              )}
            </AdminToolbarMenuButton>

            <AdminToolbarMenuButton
              ariaLabel={`Trier les videos, tri actuel ${selectedListSort.label}`}
              icon={<SortIcon />}
              menuAriaLabel="Tri des videos TikTok"
              menuClassName="admin-product-toolbar-menu-sort"
              menuId="tiktok-sort"
              openCatalogMenu={openListMenu}
              setOpenCatalogMenu={setOpenListMenu}
              title={`Tri: ${selectedListSort.label}`}
            >
              {({ closeMenu }: { closeMenu: () => void }) => (
                <div className="admin-product-toolbar-menu-options-scroll admin-product-toolbar-menu-options-scroll-five">
                  {listSortOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`admin-product-toolbar-option ${listSort === option.value ? 'is-selected' : ''}`}
                      onClick={() => {
                        setListSort(option.value)
                        closeMenu()
                      }}
                    >
                      <span>{option.label}</span>
                      {listSort === option.value ? <strong>.</strong> : null}
                    </button>
                  ))}
                </div>
              )}
            </AdminToolbarMenuButton>
          </div>
        </div>
      </section>

      <section className="tiktok-library-meta">
        <p className="video-inline-state">
          {filteredIdeas.length} video(s) affichee(s) sur {contentIdeas.length}
        </p>
        <div className="tiktok-library-legend" aria-label="Legende des statuts">
          <span><i className="is-online" aria-hidden="true" /> Publiee</span>
          <span><i className="is-offline" aria-hidden="true" /> Non publiee</span>
        </div>
      </section>

      {!isJourneyReady ? (
        <section className="tiktok-step-empty-state" aria-live="polite">
          <strong>Accounts incomplets</strong>
          <p>Connecte TikTok, n8n, Groq, Shotstack et Pexels dans l onglet Accounts avant de lancer un nouveau parcours.</p>
        </section>
      ) : null}

      {isLoading ? <p className="video-inline-state">Chargement...</p> : null}
      {!isLoading && !filteredIdeas.length ? <p className="video-inline-state">Aucune video ne correspond a cette recherche.</p> : null}

      {!isLoading && filteredIdeas.length ? (
        listViewMode === 'grid' ? (
          <section className="tiktok-card-grid">
            {filteredIdeas.map((idea) => (
              <article key={idea.id} className={`tiktok-video-card ${isPublished(idea) ? 'is-published' : 'is-unpublished'}`}>
                <div className="tiktok-video-card-media">
                  {idea.shotstackUrl ? (
                    <video src={idea.shotstackUrl} muted playsInline preload="metadata" />
                  ) : (
                    <div className="tiktok-video-card-placeholder">
                      <span>Video #{idea.id}</span>
                    </div>
                  )}
                  <span
                    className={`tiktok-status-light ${isPublished(idea) ? 'is-online' : 'is-offline'}`}
                    title={isPublished(idea) ? 'Publiee' : 'Non publiee'}
                    aria-label={isPublished(idea) ? 'Video publiee' : 'Video non publiee'}
                  />
                </div>
                <div className="tiktok-video-card-body">
                  <strong>{idea.topic || `Video #${idea.id}`}</strong>
                  <p>{idea.caption || idea.script || 'Aucune description disponible.'}</p>
                  <span>{getIdeaStatusLabel(idea)}</span>
                </div>
              </article>
            ))}
          </section>
        ) : (
          <div className="video-table-wrap">
            <table className="video-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Topic</th>
                  <th>Statut</th>
                  <th>Render</th>
                  <th>Caption</th>
                </tr>
              </thead>
              <tbody>
                {filteredIdeas.map((idea) => (
                  <tr key={idea.id}>
                    <td>#{idea.id}</td>
                    <td>{idea.topic || `Video #${idea.id}`}</td>
                    <td>
                      <span className="tiktok-table-status">
                        <i className={`tiktok-status-light ${isPublished(idea) ? 'is-online' : 'is-offline'}`} aria-hidden="true" />
                        {getIdeaStatusLabel(idea)}
                      </span>
                    </td>
                    <td>{isRenderReady(idea) ? 'Pret' : idea.shotstackStatus || 'En attente'}</td>
                    <td>{idea.caption || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : null}
    </>
  )
}
