/**
 * TikTokLibraryView — full rebuild (Proposal C).
 *
 * Cards / Table hybrid view, with stat tiles rendered upstream by the page.
 * Wraps the existing SelectionProvider / useBatchPublish / BatchSelectionBar
 * / BatchProgressDrawer / BatchPublishConfirmModal flow unchanged.
 */

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

function statusKind(idea: ContentIdea, isPublished: (i: ContentIdea) => boolean, isRenderReady: (i: ContentIdea) => boolean) {
  if (isPublished(idea)) return 'published'
  if (idea.shotstackStatus === 'rendering') return 'rendering'
  if (isRenderReady(idea)) return 'ready'
  return 'draft'
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
    FilterIcon, GridIcon, SearchIcon, SortIcon, TableIcon,
    catalogTags, contentIdeas, contentIdeasErrorMessage, filteredIdeas,
    getIdeaStatusLabel, handleLoadMore, handleResetAllCatalogTags, hasNextPage,
    hasClearableCatalogTags, isFetchingNextPage, isJourneyReady, isLoading,
    isPublished, isRenderReady, listFilter, listFilterOptions, listSearch,
    listSort, listSortOptions, listViewMode, openListMenu, selectedListFilter,
    selectedListSort, setListFilter, setListSearch, setListSort, setListViewMode,
    setOpenListMenu,
  } = props

  const selection = useSelection()
  const batch = useBatchPublish(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const eligibilityByIdeaId = useMemo(() => {
    const map = new Map<number, { selectable: boolean; reason: string | null }>()
    for (const idea of filteredIdeas) map.set(idea.id, evaluateBatchPublishEligibility(idea))
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
  const tokenAccountReady = selectedIdeas.length === 0 || selectedIdeas.every((idea) => Boolean(idea.tiktokAccountOpenId))

  const handlePublishClick = () => { if (selection.size === 0) return; setConfirmOpen(true) }
  const handleConfirmPublish = async () => {
    setConfirmOpen(false)
    setDrawerOpen(true)
    const ids = Array.from(selection.selectedIds)
    const result = await batch.start({ contentIdeaIds: ids, tiktokAccountOpenId })
    if (result) selection.clear()
  }
  const handleRetryFailed = async () => { await batch.retryFailed() }
  const handleDismissBatch = () => { setDrawerOpen(false); batch.reset() }
  const showProgress = () => setDrawerOpen(true)

  const inFlightCount = batch.batch ? batch.batch.completedCount + batch.batch.failedCount : 0
  const totalInFlight = batch.batch?.totalCount ?? 0

  const toasts = useToasts()
  const queryClient = useQueryClient()
  const lastToastedPhaseRef = useRef<string | null>(null)
  const activeToastIdRef = useRef<number | null>(null)

  useEffect(() => {
    if (batch.phase === 'idle' || batch.phase === 'running') {
      lastToastedPhaseRef.current = null
    }
  }, [batch.phase])
  useEffect(() => {
    const phase = batch.phase
    const total = batch.batch?.totalCount ?? 0
    const completed = batch.batch?.completedCount ?? 0
    const failed = batch.batch?.failedCount ?? 0
    const signature = `${phase}:${batch.batch?.batchId ?? ''}`
    if (signature === lastToastedPhaseRef.current) return
    const isTerminal = phase === 'completed' || phase === 'partial_failure' || phase === 'failed'
    if (isTerminal) {
      queryClient.invalidateQueries({ queryKey: ['content-ideas'] })
      queryClient.invalidateQueries({ queryKey: ['video-dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['video-ops-observability'] })
      queryClient.invalidateQueries({ queryKey: ['manual-actions'] })
    }
    if (phase === 'completed' && total > 0) {
      lastToastedPhaseRef.current = signature
      activeToastIdRef.current = toasts.push(`${completed} video(s) publiee(s) avec succes`, { variant: 'success', title: 'Lot termine', actionLabel: 'Voir le detail', onAction: () => setDrawerOpen(true) })
    } else if (phase === 'partial_failure') {
      lastToastedPhaseRef.current = signature
      activeToastIdRef.current = toasts.push(`${completed}/${total} publiees — ${failed} echec(s)`, { variant: 'warning', title: 'Echecs partiels', durationMs: null, actionLabel: 'Voir les echecs', onAction: () => setDrawerOpen(true) })
    } else if (phase === 'failed') {
      lastToastedPhaseRef.current = signature
      activeToastIdRef.current = toasts.push(`Aucune video n'a ete publiee — ${failed || total} echec(s)`, { variant: 'error', title: 'Echec du lot', durationMs: null, actionLabel: 'Voir les echecs', onAction: () => setDrawerOpen(true) })
    } else if (phase === 'error') {
      lastToastedPhaseRef.current = signature
      activeToastIdRef.current = toasts.push(batch.errorMessage ?? 'Erreur inattendue lors du lot', { variant: 'error', title: 'Erreur batch publish', durationMs: null })
    }
  }, [batch.phase, batch.batch, batch.errorMessage, toasts, queryClient])

  useEffect(() => () => {
    if (activeToastIdRef.current !== null) {
      toasts.dismiss(activeToastIdRef.current)
      activeToastIdRef.current = null
    }
  }, [toasts])

  /* ── Filter chip counts ──────────────────────────────────────────── */
  const counts = useMemo(() => {
    let pub = 0, unpub = 0, ready = 0
    for (const i of contentIdeas) {
      if (isPublished(i)) pub++
      else unpub++
      if (isRenderReady(i)) ready++
    }
    return { all: contentIdeas.length, published: pub, unpublished: unpub, ready }
  }, [contentIdeas, isPublished, isRenderReady])

  return (
    <>
      {/* Toolbar */}
      <section className="journey-toolbar" aria-label="Outils bibliotheque">
        <div className="journey-toolbar-search">
          <SearchIcon />
          <input
            type="search"
            value={listSearch}
            onChange={(e) => setListSearch(e.target.value)}
            placeholder="Rechercher un topic, caption, statut…"
            aria-label="Rechercher une video TikTok"
            spellCheck={false}
            autoComplete="off"
          />
        </div>

        <div className="journey-toolbar-segment" role="tablist" aria-label="Mode d affichage">
          <button
            type="button"
            className={listViewMode === 'grid' ? 'is-active' : ''}
            onClick={() => setListViewMode('grid')}
            aria-pressed={listViewMode === 'grid'}
          >
            <GridIcon /> Grille
          </button>
          <button
            type="button"
            className={listViewMode === 'table' ? 'is-active' : ''}
            onClick={() => setListViewMode('table')}
            aria-pressed={listViewMode === 'table'}
          >
            <TableIcon /> Tableau
          </button>
        </div>

        <div className="journey-toolbar-actions">
          <AdminToolbarMenuButton
            ariaLabel={`Filtrer, filtre actuel ${selectedListFilter.label}`}
            icon={<FilterIcon />}
            menuAriaLabel="Filtres"
            menuClassName="journey-select-menu"
            menuId="tiktok-filter"
            openCatalogMenu={openListMenu}
            setOpenCatalogMenu={setOpenListMenu}
            title={`Filtre: ${selectedListFilter.label}`}
            triggerClassName="journey-select-trigger journey-select-trigger-icon"
          >
            {({ closeMenu }: { closeMenu: () => void }) => (
              <div className="admin-product-toolbar-menu-options-scroll admin-product-toolbar-menu-options-scroll-five">
                {listFilterOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`admin-product-toolbar-option ${listFilter === option.value ? 'is-selected' : ''}`}
                    onClick={() => { setListFilter(option.value); closeMenu() }}
                  >
                    <span>{option.label}</span>
                    {listFilter === option.value ? <strong>.</strong> : null}
                  </button>
                ))}
              </div>
            )}
          </AdminToolbarMenuButton>

          <AdminToolbarMenuButton
            ariaLabel={`Trier, tri actuel ${selectedListSort.label}`}
            icon={<SortIcon />}
            menuAriaLabel="Tri"
            menuClassName="journey-select-menu admin-product-toolbar-menu-sort"
            menuId="tiktok-sort"
            openCatalogMenu={openListMenu}
            setOpenCatalogMenu={setOpenListMenu}
            title={`Tri: ${selectedListSort.label}`}
            triggerClassName="journey-select-trigger journey-select-trigger-icon"
          >
            {({ closeMenu }: { closeMenu: () => void }) => (
              <div className="admin-product-toolbar-menu-options-scroll admin-product-toolbar-menu-options-scroll-five">
                {listSortOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`admin-product-toolbar-option ${listSort === option.value ? 'is-selected' : ''}`}
                    onClick={() => { setListSort(option.value); closeMenu() }}
                  >
                    <span>{option.label}</span>
                    {listSort === option.value ? <strong>.</strong> : null}
                  </button>
                ))}
              </div>
            )}
          </AdminToolbarMenuButton>
        </div>
      </section>

      {/* Quick filter chips + current selection tags */}
      <div className="journey-active-filters" role="group" aria-label="Filtres rapides">
        <div className="journey-active-filters-list">
          {[
            { value: 'all', label: 'Toutes', count: counts.all },
            { value: 'published', label: 'Publiees', count: counts.published },
            { value: 'unpublished', label: 'Non publiees', count: counts.unpublished },
            { value: 'ready', label: 'Rendues', count: counts.ready },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`journey-filter-chip ${listFilter === opt.value ? 'is-active' : ''}`}
              onClick={() => setListFilter(opt.value)}
            >
              {opt.label}
              <span className="journey-filter-chip-count">{opt.count}</span>
            </button>
          ))}
        </div>
        <div className="journey-active-filters-meta">
          {hasClearableCatalogTags ? (
            <button type="button" className="journey-active-filters-reset" onClick={handleResetAllCatalogTags}>
              Reinitialiser
            </button>
          ) : null}
          <span className="journey-info-tag">
            <span className="journey-info-tag-key">Filtre:</span>
            <span className="journey-info-tag-value">{selectedListFilter.label}</span>
          </span>
          <span className="journey-info-tag">
            <span className="journey-info-tag-key">Tri:</span>
            <span className="journey-info-tag-value">{selectedListSort.label}</span>
          </span>
        </div>
      </div>

      {/* Active tags (search etc.) */}
      {catalogTags.length > 0 ? (
        <div className="journey-active-filters" aria-label="Filtres actifs">
          <div className="journey-active-filters-list">
            {catalogTags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                className={`journey-active-tag ${tag.isClearable ? 'is-clearable' : ''}`}
                onClick={tag.isClearable ? tag.onClear : undefined}
                disabled={!tag.isClearable}
                title={tag.isClearable ? `Retirer ${tag.label}` : tag.label}
              >
                <span>{tag.label}</span>
                {tag.isClearable ? <span className="journey-active-tag-x" aria-hidden="true">×</span> : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* Library meta */}
      <div className="journey-library-meta">
        <span>{filteredIdeas.length} video(s) affichee(s) sur {contentIdeas.length}</span>
        <div className="journey-library-meta-legend" aria-label="Legende des statuts">
          <span><i className="is-online" aria-hidden="true" /> Publiee</span>
          <span><i className="is-offline" aria-hidden="true" /> Non publiee</span>
        </div>
      </div>

      {!isJourneyReady ? (
        <section className="journey-empty" aria-live="polite">
          <strong>Comptes incomplets</strong>
          <p>Connecte TikTok, n8n, Groq, Shotstack et Pexels dans Accounts avant de lancer un nouveau parcours.</p>
        </section>
      ) : null}

      {isLoading ? <p className="journey-library-meta">Chargement…</p> : null}
      {!isLoading && contentIdeasErrorMessage ? <p className="journey-library-meta">Erreur: {contentIdeasErrorMessage}</p> : null}
      {!isLoading && !contentIdeasErrorMessage && !contentIdeas.length ? (
        <section className="journey-empty">
          <strong>Aucune video pour le moment</strong>
          <p>Lance ton premier parcours pour generer une video.</p>
        </section>
      ) : null}
      {!isLoading && !contentIdeasErrorMessage && Boolean(contentIdeas.length) && !filteredIdeas.length ? (
        <section className="journey-empty">
          <strong>Aucune video ne correspond</strong>
          <p>Modifie ta recherche ou tes filtres pour voir plus de resultats.</p>
        </section>
      ) : null}

      {/* Grid view */}
      {!isLoading && !contentIdeasErrorMessage && filteredIdeas.length && listViewMode === 'grid' ? (
        <section className="journey-library-grid" aria-label="Liste des videos">
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
      ) : null}

      {/* Table view */}
      {!isLoading && !contentIdeasErrorMessage && filteredIdeas.length && listViewMode === 'table' ? (
        <div className="journey-library-table-wrap">
          <table className="journey-library-table">
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
              {filteredIdeas.map((idea) => {
                const kind = statusKind(idea, isPublished, isRenderReady)
                return (
                  <tr key={idea.id}>
                    <td><span className="journey-library-table-id">#{idea.id}</span></td>
                    <td className="journey-library-table-topic">{idea.topic || `Video #${idea.id}`}</td>
                    <td>
                      <span className={`journey-status-pill is-${kind}`}>
                        {getIdeaStatusLabel(idea)}
                      </span>
                    </td>
                    <td>{isRenderReady(idea) ? 'Pret' : idea.shotstackStatus || 'En attente'}</td>
                    <td style={{ maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {idea.caption || '-'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {!isLoading && !contentIdeasErrorMessage && hasNextPage ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0' }}>
          <button type="button" className="journey-btn" onClick={handleLoadMore} disabled={isFetchingNextPage}>
            {isFetchingNextPage ? 'Chargement…' : 'Charger plus'}
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
