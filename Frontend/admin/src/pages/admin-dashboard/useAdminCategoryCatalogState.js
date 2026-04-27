import { useCallback, useMemo, useState } from 'react'
import {
  CATEGORY_SELECTION_LABELS_STORAGE_KEY,
  CATEGORY_SELECTION_STORAGE_KEY,
  CATEGORY_PAGE_SIZE_OPTIONS,
  CATEGORY_SORT_OPTIONS,
  EMPTY_CATEGORY_FORM,
  EMPTY_CATEGORY_MERGE_FORM,
} from './constants'
import {
  buildCategoryDeleteModalState,
  normalizeCategorySelection,
  selectVisibleCategories,
  toggleCategorySelection,
} from './adminCategoryState'
import useDebouncedStorageEffect from './useDebouncedStorageEffect'
import useDebouncedValue from './useDebouncedValue'
import useAdminCatalogMenuState from './useAdminCatalogMenuState'
import { appendStoredSessionActivity } from './sessionActivityStorage.js'
import { buildCategorySelectionModel } from './categoryPageState.js'

function readStoredCategorySelection() {
  if (typeof window === 'undefined') return []

  try {
    const rawValue = window.localStorage.getItem(CATEGORY_SELECTION_STORAGE_KEY)
    const parsedValue = rawValue ? JSON.parse(rawValue) : []
    return normalizeCategorySelection(parsedValue)
  } catch {
    return []
  }
}

function readStoredCategorySelectionLabels() {
  if (typeof window === 'undefined') return {}

  try {
    const rawValue = window.localStorage.getItem(CATEGORY_SELECTION_LABELS_STORAGE_KEY)
    const parsedValue = rawValue ? JSON.parse(rawValue) : {}
    if (!parsedValue || typeof parsedValue !== 'object' || Array.isArray(parsedValue)) return {}

    return Object.fromEntries(
      Object.entries(parsedValue)
        .map(([categoryId, libelle]) => [String(categoryId), String(libelle || '').trim()])
        .filter(([, libelle]) => Boolean(libelle))
    )
  } catch {
    return {}
  }
}

export default function useAdminCategoryCatalogState() {
  const storedSelectedCategoryIds = readStoredCategorySelection()
  const [categorySearch, setCategorySearch] = useState('')
  const [categorySort, setCategorySort] = useState('recent')
  const [categoriesPerPage, setCategoriesPerPage] = useState(12)
  const [requestedCategoryPage, setRequestedCategoryPage] = useState(1)
  const [activeCategoryId, setActiveCategoryId] = useState(() => storedSelectedCategoryIds[0] ?? null)
  const [selectedCategoryIds, setSelectedCategoryIds] = useState(() => storedSelectedCategoryIds)
  const [selectedCategoryLabelsById, setSelectedCategoryLabelsById] = useState(() => readStoredCategorySelectionLabels())
  const [createCategoryForm, setCreateCategoryForm] = useState(EMPTY_CATEGORY_FORM)
  const [editCategoryForm, setEditCategoryForm] = useState(EMPTY_CATEGORY_FORM)
  const [mergeCategoryForm, setMergeCategoryForm] = useState(EMPTY_CATEGORY_MERGE_FORM)
  const [categoryDeleteModalState, setCategoryDeleteModalState] = useState(() => buildCategoryDeleteModalState([], false))
  const debouncedCategorySearch = useDebouncedValue(categorySearch, 250)
  const { openCatalogMenu, setOpenCatalogMenu } = useAdminCatalogMenuState()
  const categoryPage = useMemo(() => Math.max(1, Number(requestedCategoryPage || 1)), [requestedCategoryPage])

  const appendCategorySessionActivity = useCallback((entries) => {
    appendStoredSessionActivity(entries)
  }, [])

  const hasSelectedCategories = selectedCategoryIds.length > 0
  const selectionModel = useMemo(() => buildCategorySelectionModel({
    activeCategoryId,
    categories: [],
    selectedCategoryIds,
  }), [activeCategoryId, selectedCategoryIds])

  useDebouncedStorageEffect({
    key: CATEGORY_SELECTION_STORAGE_KEY,
    value: normalizeCategorySelection(selectedCategoryIds),
  })

  useDebouncedStorageEffect({
    key: CATEGORY_SELECTION_LABELS_STORAGE_KEY,
    value: selectedCategoryLabelsById,
  })

  const selectedCategorySort = useMemo(() => (
    CATEGORY_SORT_OPTIONS.find((option) => option.value === categorySort) || CATEGORY_SORT_OPTIONS[0]
  ), [categorySort])

  const selectedCategoriesPerPage = useMemo(() => (
    CATEGORY_PAGE_SIZE_OPTIONS.find((option) => option.value === categoriesPerPage) || CATEGORY_PAGE_SIZE_OPTIONS[0]
  ), [categoriesPerPage])

  const setCategoryPage = useCallback((nextPage) => {
    setRequestedCategoryPage(Math.max(1, Number(nextPage || 1)))
  }, [])

  const setCategorySearchWithReset = useCallback((nextSearch) => {
    setCategorySearch(nextSearch)
    setRequestedCategoryPage(1)
  }, [])

  const setCategorySortWithReset = useCallback((nextSort) => {
    setCategorySort(nextSort)
    setRequestedCategoryPage(1)
  }, [])

  const setCategoriesPerPageWithReset = useCallback((nextPageSize) => {
    setCategoriesPerPage(nextPageSize)
    setRequestedCategoryPage(1)
  }, [])

  const handleCategorySelect = useCallback((category) => {
    const normalizedCategoryId = Number(category?.id)
    if (!Number.isFinite(normalizedCategoryId)) return
    const normalizedLabel = String(category?.libelle || '').trim()
    setActiveCategoryId(normalizedCategoryId)
    setEditCategoryForm({ libelle: normalizedLabel })
    if (normalizedLabel) {
      setSelectedCategoryLabelsById((prev) => (
        prev[String(normalizedCategoryId)] === normalizedLabel
          ? prev
          : { ...prev, [String(normalizedCategoryId)]: normalizedLabel }
      ))
    }
  }, [])

  const handleToggleSelectedCategoryId = useCallback((category) => {
    const normalizedCategoryId = Number(category?.id ?? category)
    if (!Number.isFinite(normalizedCategoryId)) return

    const isCurrentlySelected = selectedCategoryIds.includes(normalizedCategoryId)
    const nextSelectedCategoryIds = toggleCategorySelection(selectedCategoryIds, normalizedCategoryId)
    const normalizedLabel = String(category?.libelle || '').trim()
    const nextSelectedCategoryLabelsById = normalizedLabel
      ? { ...selectedCategoryLabelsById, [String(normalizedCategoryId)]: normalizedLabel }
      : selectedCategoryLabelsById

    setSelectedCategoryIds(nextSelectedCategoryIds)
    if (nextSelectedCategoryLabelsById !== selectedCategoryLabelsById) {
      setSelectedCategoryLabelsById(nextSelectedCategoryLabelsById)
    }

    if (isCurrentlySelected && Number(activeCategoryId) === normalizedCategoryId) {
      const nextActiveCategoryId = nextSelectedCategoryIds[0] ?? null
      setActiveCategoryId(nextActiveCategoryId)
      setEditCategoryForm({
        libelle: nextActiveCategoryId == null
          ? ''
          : String(nextSelectedCategoryLabelsById[String(nextActiveCategoryId)] || ''),
      })
      return
    }

    if (!isCurrentlySelected && category && typeof category === 'object') {
      setActiveCategoryId(normalizedCategoryId)
      setEditCategoryForm({ libelle: normalizedLabel })
    }
  }, [activeCategoryId, selectedCategoryIds, selectedCategoryLabelsById])

  const handleSelectAllFilteredCategories = useCallback((visibleCategories = []) => {
    setSelectedCategoryIds((prev) => selectVisibleCategories(prev, visibleCategories))
  }, [])

  const handleClearAllSelectedCategories = useCallback(() => {
    setSelectedCategoryIds([])
    setSelectedCategoryLabelsById({})
    setActiveCategoryId(null)
    setEditCategoryForm(EMPTY_CATEGORY_FORM)
  }, [])

  const handleRemoveSelectedCategoryId = useCallback((categoryId) => {
    const normalizedCategoryId = Number(categoryId)
    if (!Number.isFinite(normalizedCategoryId)) return

    const nextSelectedCategoryIds = selectedCategoryIds.filter((id) => Number(id) !== normalizedCategoryId)
    setSelectedCategoryIds(nextSelectedCategoryIds)

    if (Number(activeCategoryId) === normalizedCategoryId) {
      const nextActiveCategoryId = nextSelectedCategoryIds[0] ?? null
      setActiveCategoryId(nextActiveCategoryId)
      setEditCategoryForm({
        libelle: nextActiveCategoryId == null
          ? ''
          : String(selectedCategoryLabelsById[String(nextActiveCategoryId)] || ''),
      })
    }
  }, [activeCategoryId, selectedCategoryIds, selectedCategoryLabelsById])

  const resetCreateCategoryForm = useCallback(() => {
    setCreateCategoryForm(EMPTY_CATEGORY_FORM)
  }, [])

  const resetMergeCategoryForm = useCallback(() => {
    setMergeCategoryForm(EMPTY_CATEGORY_MERGE_FORM)
  }, [])

  const openDeleteModalWithIds = useCallback((categoryIds) => {
    setCategoryDeleteModalState(buildCategoryDeleteModalState(categoryIds))
  }, [])

  const closeDeleteModal = useCallback(() => {
    setCategoryDeleteModalState(buildCategoryDeleteModalState([], false))
  }, [])

  return {
    activeCategoryId,
    categoryDeleteModalState,
    categoryPage,
    categorySearch,
    categorySort,
    categoriesPerPage,
    createCategoryForm,
    debouncedCategorySearch,
    editCategoryForm,
    mergeCategoryForm,
    handleCategorySelect,
    handleClearAllSelectedCategories,
    handleRemoveSelectedCategoryId,
    handleSelectAllFilteredCategories,
    handleToggleSelectedCategoryId,
    hasSelectedCategories,
    openCatalogMenu,
    openDeleteModalWithIds,
    resetCreateCategoryForm,
    resetMergeCategoryForm,
    selectedCategoryIds: normalizeCategorySelection(selectedCategoryIds),
    selectedCategoryLabelsById,
    selectionModel,
    selectedCategoriesPerPage,
    selectedCategorySort,
    appendCategorySessionActivity,
    setActiveCategoryId,
    setCategoryPage,
    setCategorySearch: setCategorySearchWithReset,
    setCategorySort: setCategorySortWithReset,
    setCategoriesPerPage: setCategoriesPerPageWithReset,
    setCreateCategoryForm,
    setEditCategoryForm,
    setMergeCategoryForm,
    setOpenCatalogMenu,
    setSelectedCategoryIds,
    closeDeleteModal,
  }
}
