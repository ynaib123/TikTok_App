import { useEffect, useMemo, useRef, useState, type JSX } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import AdminToolbarMenuButton from '../admin-dashboard/AdminToolbarMenuButton'
import VideoCard from '../../components/video-card/VideoCard'
import type { ContentIdea } from '../../types'
import { SelectionProvider, useSelection } from '../../contexts/SelectionContext'
import { useBatchPublish } from '../../hooks/useBatchPublish'
import BatchSelectionBar from '../../components/batch-publish/BatchSelectionBar'
import BatchProgressDrawer from '../../components/batch-publish/BatchProgressDrawer'
import BatchPublishConfirmModal from '../../components/batch-publish/BatchPublishConfirmModal'
import { evaluateBatchPublishEligibility } from '../../components/batch-publish/eligibility'
import { useToasts } from '../../contexts/ToastContext'
import '../../components/batch-publish/batch-publish.css'

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
  contentIdeasErrorMessage: string | null
  filteredIdeas: ContentIdea[]
  getIdeaStatusLabel: (idea: ContentIdea) => string
  handleLoadMore: () => void
  handleResetAllCatalogTags: () => void
  hasNextPage: boolean
  hasClearableCatalogTags: boolean
  isJourneyReady: boolean
  isFetchingNextPage: boolean
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
  return (
    <SelectionProvider>
      <TikTokLibraryViewInner {...props} />
    </SelectionProvider>
  )
}

function TikTokLibraryViewInner(props: TikTokLibraryViewProps) {
  const {
    AddIcon,
    FilterIcon,
    GridIcon,
    SearchIcon,
    SortIcon,
    TableIcon,
    catalogTags,
    contentIdeas,
    contentIdeasErrorMessage,
    filteredIdeas,
    getIdeaStatusLabel,
    handleLoadMore,
    handleResetAllCatalogTags,
    hasNextPage,
    hasClearableCatalogTags,
    isFetchingNextPage,
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

  const selection = useSelection()
  const batch = useBatchPublish(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const eligibilityByIdeaId = useMemo(() => {
    const map = new Map<number, { selectable: boolean; reason: string | null }>()
    for (const idea of filteredIdeas) {
      map.set(idea.id, evaluateBatchPublishEligibility(idea))
    }
    return map
  }, [filteredIdeas])

  const eligibleIdsOnPage = useMemo(
    () => filteredIdeas.filter((idea) => eligibilityByIdeaId.get(idea.id)?.selectable).map((idea) => idea.id),
    [filteredIdeas, eligibilityByIdeaId],
  )

  const selectedIdeas = useMemo(() => {
    const all = new Map<number, ContentIdea>()
    for (const idea of contentIdeas) all.set(idea.id, idea)
    const result: ContentIdea[] = []
    for (const id of selection.selectedIds) {
      const idea = all.get(id)
      if (idea) result.push(idea)
    }
    return result
  }, [contentIdeas, selection.selectedIds])

  const tiktokAccountOpenId = selectedIdeas.find((idea) => idea.tiktokAccountOpenId)?.tiktokAccountOpenId ?? null

  const tokenAccountReady = selectedIdeas.length === 0
    || selectedIdeas.every((idea) => Boolean(idea.tiktokAccountOpenId))

  const handlePublishClick = () => {
    if (selection.size === 0) return
    setConfirmOpen(true)
  }

  const handleConfirmPublish = async () => {
    setConfirmOpen(false)
    setDrawerOpen(true)
    const ids = Array.from(selection.selectedIds)
    const result = await batch.start({ contentIdeaIds: ids, tiktokAccountOpenId })
    if (result) selection.clear()
  }

  const handleRetryFailed = async () => {
    await batch.retryFailed()
  }

  const handleDismissBatch = () => {
    setDrawerOpen(false)
    batch.reset()
  }

  const showProgress = () => setDrawerOpen(true)
  const inFlightCount = batch.batch ? batch.batch.completedCount + batch.batch.failedCount : 0
  const totalInFlight = batch.batch?.totalCount ?? 0

  const toasts = useToasts()
  const queryClient = useQueryClient()
  const lastToastedPhaseRef = useRef<string | null>(null)
  useEffect(() => {
    const phase = batch.phase
    const total = batch.batch?.totalCount ?? 0
    const completed = batch.batch?.completedCount ?? 0
    const failed = batch.batch?.failedCount ?? 0
    const signature = `${phase}:${batch.batch?.batchId ?? ''}`
    if (signature === lastToastedPhaseRef.current) return
    const isTerminal = phase === 'completed' || phase === 'partial_failure' || phase === 'failed'
    if (isTerminal) {
      // Targeted refetch: mark active list/dashboard queries stale so cards
      // pick up the new pipeline_status from the publish workflow.
      queryClient.invalidateQueries({ queryKey: ['content-ideas'] })
      queryClient.invalidateQueries({ queryKey: ['video-dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['video-ops-observability'] })
      queryClient.invalidateQueries({ queryKey: ['manual-actions'] })
    }
    if (phase === 'completed' && total > 0) {
      lastToastedPhaseRef.current = signature
      toasts.push(`${completed} video(s) publiee(s) avec succes`, {
        variant: 'success',
        title: 'Lot termine',
        actionLabel: 'Voir le detail',
        onAction: () => setDrawerOpen(true),
      })
    } else if (phase === 'partial_failure') {
      lastToastedPhaseRef.current = signature
      toasts.push(`${completed}/${total} publiees — ${failed} echec(s)`, {
        variant: 'warning',
        title: 'Echecs partiels',
        durationMs: null,
        actionLabel: 'Voir les echecs',
        onAction: () => setDrawerOpen(true),
      })
    } else if (phase === 'failed') {
      lastToastedPhaseRef.current = signature
      toasts.push(`Aucune video n'a ete publiee — ${failed || total} echec(s)`, {
        variant: 'error',
        title: 'Echec du lot',
        durationMs: null,
        actionLabel: 'Voir les echecs',
        onAction: () => setDrawerOpen(true),
      })
    } else if (phase === 'error') {
      lastToastedPhaseRef.current = signature
      toasts.push(batch.errorMessage ?? 'Erreur inattendue lors du lot', {
        variant: 'error',
        title: 'Erreur batch publish',
        durationMs: null,
      })
    }
  }, [batch.phase, batch.batch, batch.errorMessage, toasts, queryClient])


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
      {!isLoading && contentIdeasErrorMessage ? <p className="video-inline-state">Erreur: {contentIdeasErrorMessage}</p> : null}
      {!isLoading && !contentIdeasErrorMessage && !contentIdeas.length ? (
        <p className="video-inline-state">Aucune video disponible pour le moment.</p>
      ) : null}
      {!isLoading && !contentIdeasErrorMessage && Boolean(contentIdeas.length) && !filteredIdeas.length ? (
        <p className="video-inline-state">Aucune video ne correspond a cette recherche.</p>
      ) : null}

      {!isLoading && !contentIdeasErrorMessage && filteredIdeas.length ? (
        listViewMode === 'grid' ? (
          <section className="tiktok-card-grid">
            {filteredIdeas.map((idea) => {
              const eligibility = eligibilityByIdeaId.get(idea.id)
              const isSelected = selection.isSelected(idea.id)
              const blockedByMax = !isSelected && selection.isAtMaxSize
              const reason = blockedByMax ? `Maximum ${selection.maxSize} videos par lot` : (eligibility?.reason ?? null)
              return (
                <VideoCard
                  key={idea.id}
                  idea={idea}
                  selectable={Boolean(eligibility?.selectable) && !blockedByMax}
                  selected={isSelected}
                  disabledReason={reason}
                  onToggleSelection={selection.toggle}
                />
              )
            })}
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

      {!isLoading && !contentIdeasErrorMessage && hasNextPage ? (
        <div className="video-inline-load-more">
          <button
            type="button"
            className="admin-console-btn admin-console-btn-muted"
            onClick={handleLoadMore}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? 'Chargement...' : 'Charger plus'}
          </button>
        </div>
      ) : null}
      <BatchSelectionBar
        phase={batch.phase}
        eligibleIdsOnPage={eligibleIdsOnPage}
        tokenAccountReady={tokenAccountReady}
        onPublishClick={handlePublishClick}
        onShowProgress={showProgress}
        inFlightCount={inFlightCount}
        totalInFlight={totalInFlight}
      />

      <BatchProgressDrawer
        open={drawerOpen}
        phase={batch.phase}
        batch={batch.batch}
        errorMessage={batch.errorMessage}
        onClose={() => setDrawerOpen(false)}
        onRetryFailed={handleRetryFailed}
        onDismiss={handleDismissBatch}
      />

      <BatchPublishConfirmModal
        open={confirmOpen}
        ideas={selectedIdeas}
        tiktokAccountOpenId={tiktokAccountOpenId}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleConfirmPublish}
      />
    </>
  )
}
