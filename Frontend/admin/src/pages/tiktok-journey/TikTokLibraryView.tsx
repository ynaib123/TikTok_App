/**
 * TikTokLibraryView — Cards / Table hybrid view with bulk-delete selection.
 */

import { useMemo, useState, type Dispatch, type JSX, type SetStateAction } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient, type InfiniteData } from '@tanstack/react-query'
import AdminToolbarMenuButton from '../../components/AdminToolbarMenuButton'
import VideoCard from '../../components/video-card/VideoCard'
import type { ContentIdea, SpringPageResponse } from '../../types'
import { SelectionProvider, useSelection } from '../../contexts/SelectionContext'
import BulkDeleteSelectionBar from '../../components/bulk-delete/BulkDeleteSelectionBar'
import BulkDeleteConfirmModal from '../../components/bulk-delete/BulkDeleteConfirmModal'
import { useToasts } from '../../contexts/ToastContext'
import { deleteContentIdea } from '../../services/videoOpsSupabase'
import { VIDEO_OPS_QUERY_KEYS } from '../../services/videoOpsQueries'
import { journeyTelemetry } from './journeyTelemetry'
import '../../components/bulk-delete/bulk-delete.css'

type ContentIdeasInfiniteData = InfiniteData<SpringPageResponse<ContentIdea>, number>

function removeIdsFromContentIdeasCache(
  cache: ContentIdeasInfiniteData | undefined,
  idsToRemove: Set<number>,
): ContentIdeasInfiniteData | undefined {
  if (!cache) return cache
  return {
    ...cache,
    pages: cache.pages.map((page) => {
      const filtered = (page.content || []).filter((idea) => !idsToRemove.has(Number(idea.id)))
      const removed = (page.content?.length ?? 0) - filtered.length
      return {
        ...page,
        content: filtered,
        page: {
          ...page.page,
          totalElements: Math.max(0, (page.page?.totalElements ?? 0) - removed),
        },
      }
    }),
  }
}

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
  setOpenListMenu: Dispatch<SetStateAction<string | null>>
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
  const navigate = useNavigate()
  const handleOpenIdeaDetail = (id: number) => navigate(`/tiktok/idea/${id}`)
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
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const toasts = useToasts()
  const queryClient = useQueryClient()

  const visibleIds = useMemo(() => filteredIdeas.map((idea) => idea.id), [filteredIdeas])

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

  const handleDeleteClick = () => {
    if (selection.size === 0) return
    setConfirmDeleteOpen(true)
  }

  const handleConfirmDelete = async () => {
    const ids = Array.from(selection.selectedIds)
    if (ids.length === 0) {
      setConfirmDeleteOpen(false)
      return
    }
    setIsDeleting(true)

    // Optimistic update: snapshot the current cache, remove the deleted ids
    // immediately, and roll back if the network call fails. This makes the
    // grid feel responsive even if the bulk delete takes a few seconds for
    // large batches.
    const idSet = new Set(ids.map((id) => Number(id)))
    const previousCache = queryClient.getQueryData<ContentIdeasInfiniteData>(
      VIDEO_OPS_QUERY_KEYS.contentIdeas,
    )
    queryClient.setQueryData<ContentIdeasInfiniteData | undefined>(
      VIDEO_OPS_QUERY_KEYS.contentIdeas,
      (cache) => removeIdsFromContentIdeasCache(cache, idSet),
    )
    selection.clear()

    const startedAt = performance.now()
    try {
      const { deleteContentIdeasBulk } = await import('../../services/videoOpsSupabase')
      await deleteContentIdeasBulk(ids)
      setIsDeleting(false)
      setConfirmDeleteOpen(false)
      journeyTelemetry.trackBulkDelete({
        count: ids.length,
        ok: true,
        durationMs: performance.now() - startedAt,
      })
      // Background refresh to reconcile with authoritative server state.
      queryClient.invalidateQueries({ queryKey: VIDEO_OPS_QUERY_KEYS.bootstrap })
      queryClient.invalidateQueries({ queryKey: VIDEO_OPS_QUERY_KEYS.contentIdeas })
      queryClient.invalidateQueries({ queryKey: VIDEO_OPS_QUERY_KEYS.manualActions })
      queryClient.invalidateQueries({ queryKey: ['video-dashboard'] })
      queryClient.invalidateQueries({ queryKey: VIDEO_OPS_QUERY_KEYS.observability })
      toasts.push(`${ids.length} vidéo${ids.length > 1 ? 's' : ''} supprimée${ids.length > 1 ? 's' : ''}`, { variant: 'success' })
    } catch (error) {
      setIsDeleting(false)
      // Rollback to the pre-delete snapshot so the user sees their selection
      // re-appear in the grid.
      if (previousCache) {
        queryClient.setQueryData(VIDEO_OPS_QUERY_KEYS.contentIdeas, previousCache)
      } else {
        queryClient.invalidateQueries({ queryKey: VIDEO_OPS_QUERY_KEYS.contentIdeas })
      }
      journeyTelemetry.trackBulkDelete({
        count: ids.length,
        ok: false,
        durationMs: performance.now() - startedAt,
      })
      toasts.push(
        `Échec de la suppression: ${error instanceof Error ? error.message : 'erreur inconnue'}`,
        { variant: 'error' },
      )
    }
  }

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
          <p>Connecte TikTok, Groq et Pexels dans Accounts avant de lancer un nouveau parcours.</p>
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
            const isSelected = selection.isSelected(idea.id)
            return (
              <VideoCard
                key={idea.id}
                idea={idea}
                selectable={true}
                selected={isSelected}
                disabledReason={null}
                onToggleSelection={selection.toggle}
                onOpenDetail={handleOpenIdeaDetail}
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

      <BulkDeleteSelectionBar
        visibleIds={visibleIds}
        isDeleting={isDeleting}
        onDeleteClick={handleDeleteClick}
      />

      <BulkDeleteConfirmModal
        open={confirmDeleteOpen}
        ideas={selectedIdeas}
        isDeleting={isDeleting}
        onCancel={() => setConfirmDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
      />
    </>
  )
}
