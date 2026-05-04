import { useMemo, useState } from 'react'
import type { ContentIdea } from '../../types'

interface Option {
  value: string
  label: string
}

interface JourneyListStateArgs {
  contentIdeas: ContentIdea[]
  listFilterOptions: Option[]
  listSortOptions: Option[]
  isPublished: (idea: ContentIdea) => boolean
  isRenderReady: (idea: ContentIdea) => boolean
  getIdeaStatusLabel: (idea: ContentIdea) => string
}

interface CatalogTag {
  id: string
  label: string
  isClearable: boolean
  onClear: () => void
}

export function useTikTokJourneyListState({
  contentIdeas,
  listFilterOptions,
  listSortOptions,
  isPublished,
  isRenderReady,
  getIdeaStatusLabel,
}: JourneyListStateArgs) {
  const [listSearch, setListSearch] = useState('')
  const [listFilter, setListFilter] = useState('all')
  const [listSort, setListSort] = useState('recent')
  const [listViewMode, setListViewMode] = useState('grid')
  const [openListMenu, setOpenListMenu] = useState<string | null>(null)

  const filteredIdeas = useMemo(() => {
    const normalizedSearch = String(listSearch || '').trim().toLowerCase()
    const nextIdeas = contentIdeas.filter((idea) => {
      if (listFilter === 'published' && !isPublished(idea)) return false
      if (listFilter === 'unpublished' && isPublished(idea)) return false
      if (listFilter === 'ready' && !isRenderReady(idea)) return false

      if (!normalizedSearch) return true

      return [
        idea.id,
        idea.topic,
        idea.script,
        idea.caption,
        getIdeaStatusLabel(idea),
      ].some((value) => String(value || '').toLowerCase().includes(normalizedSearch))
    })

    const sortedIdeas = [...nextIdeas]
    if (listSort === 'oldest') {
      sortedIdeas.sort((left, right) => Number(left?.id || 0) - Number(right?.id || 0))
    } else if (listSort === 'topic_asc') {
      sortedIdeas.sort((left, right) => String(left?.topic || '').localeCompare(String(right?.topic || ''), 'fr', { sensitivity: 'base' }))
    } else if (listSort === 'topic_desc') {
      sortedIdeas.sort((left, right) => String(right?.topic || '').localeCompare(String(left?.topic || ''), 'fr', { sensitivity: 'base' }))
    } else if (listSort === 'published_first') {
      sortedIdeas.sort((left, right) => {
        const publishedDelta = Number(isPublished(right)) - Number(isPublished(left))
        if (publishedDelta !== 0) return publishedDelta
        return Number(right?.id || 0) - Number(left?.id || 0)
      })
    } else {
      sortedIdeas.sort((left, right) => Number(right?.id || 0) - Number(left?.id || 0))
    }

    return sortedIdeas
  }, [contentIdeas, getIdeaStatusLabel, isPublished, isRenderReady, listFilter, listSearch, listSort])

  const selectedListFilter = listFilterOptions.find((option) => option.value === listFilter) || listFilterOptions[0]
  const selectedListSort = listSortOptions.find((option) => option.value === listSort) || listSortOptions[0]

  const catalogTags = [
    listSearch
      ? {
          id: 'search',
          label: `Recherche: ${listSearch}`,
          isClearable: true,
          onClear: () => setListSearch(''),
        }
      : null,
  ].filter((tag): tag is CatalogTag => Boolean(tag))

  const hasClearableCatalogTags = catalogTags.some((tag) => tag.isClearable)

  const resetAllCatalogTags = () => {
    setListSearch('')
    setListFilter('all')
    setListSort('recent')
  }

  return {
    catalogTags,
    filteredIdeas,
    hasClearableCatalogTags,
    listFilter,
    listSearch,
    listSort,
    listViewMode,
    openListMenu,
    selectedListFilter,
    selectedListSort,
    resetAllCatalogTags,
    setListFilter,
    setListSearch,
    setListSort,
    setListViewMode,
    setOpenListMenu,
  }
}
