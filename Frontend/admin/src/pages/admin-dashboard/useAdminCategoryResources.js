import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiGet, apiPost } from '../../services/adminApiClient.js'
import { ADMIN_ERROR_MESSAGES } from './feedbackMessages'
import { normalizeCategoryCatalogResponse } from './adminCategoryState'
import useAdminQueryCache from './useAdminQueryCache'
import useLatestRequestGate from './useLatestRequestGate'

const CATEGORY_CATALOG_STALE_TIME = 30_000
const CATEGORY_DELETE_PREVIEW_STALE_TIME = 10_000

export default function useAdminCategoryResources({
  page,
  search,
  size,
  sort,
}) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)
  const [categories, setCategories] = useState([])
  const [categoryCatalogTotalItems, setCategoryCatalogTotalItems] = useState(0)
  const [categoryCatalogTotalPages, setCategoryCatalogTotalPages] = useState(1)
  const [categoryDeletePreview, setCategoryDeletePreview] = useState(null)
  const [isDeletePreviewLoading, setIsDeletePreviewLoading] = useState(false)
  const { fetchQuery, invalidateQueries } = useAdminQueryCache()
  const catalogRequestGate = useLatestRequestGate()
  const deletePreviewRequestGate = useLatestRequestGate()

  const loadCategoryCatalog = useCallback(async ({ force = false } = {}) => {
    const requestId = catalogRequestGate.nextRequestId()
    setLoading(true)
    setError(null)

    try {
      const query = new URLSearchParams()
      if (String(search || '').trim()) query.set('search', String(search).trim())
      query.set('sort', sort || 'recent')
      query.set('page', String(page || 1))
      query.set('size', String(size || 20))
      const serializedQuery = query.toString()

      const response = await fetchQuery({
        key: ['category-catalog', serializedQuery],
        force,
        staleTime: CATEGORY_CATALOG_STALE_TIME,
        fetcher: () => apiGet(`/categories/catalog?${serializedQuery}`),
      })

      if (!catalogRequestGate.isCurrentRequest(requestId)) return null
      const normalizedCatalog = normalizeCategoryCatalogResponse(response)
      setCategories(normalizedCatalog.items)
      setCategoryCatalogTotalItems(normalizedCatalog.totalItems)
      setCategoryCatalogTotalPages(normalizedCatalog.totalPages)
      return normalizedCatalog
    } catch (err) {
      if (!catalogRequestGate.isCurrentRequest(requestId)) return null
      setError(err.message || ADMIN_ERROR_MESSAGES.loadCategories)
      return null
    } finally {
      if (catalogRequestGate.isCurrentRequest(requestId)) {
        setLoading(false)
      }
    }
  }, [catalogRequestGate, fetchQuery, page, search, size, sort])

  useEffect(() => {
    void loadCategoryCatalog()
  }, [loadCategoryCatalog])

  const invalidateCategoryCatalog = useCallback(() => {
    invalidateQueries((key) => key.includes('"category-catalog"') || key.startsWith('category-catalog'))
  }, [invalidateQueries])

  const loadCategoryDeletePreview = useCallback(async (categoryIds = []) => {
    const requestId = deletePreviewRequestGate.nextRequestId()
    setIsDeletePreviewLoading(true)

    try {
      const response = await fetchQuery({
        key: ['category-delete-preview', categoryIds.join(',')],
        staleTime: CATEGORY_DELETE_PREVIEW_STALE_TIME,
        force: true,
        fetcher: () => apiPost(
          '/categories/admin/delete-preview',
          { categoryIds },
          { suppressConsoleError: true }
        ),
      })
      if (!deletePreviewRequestGate.isCurrentRequest(requestId)) return null
      setCategoryDeletePreview(response || null)
      return response
    } catch (err) {
      if (!deletePreviewRequestGate.isCurrentRequest(requestId)) return null
      // Older local backends may not expose the preview endpoint yet.
      if (Number(err?.status) !== 404) {
        setError(err.message || ADMIN_ERROR_MESSAGES.deleteCategory)
      }
      setCategoryDeletePreview(null)
      return null
    } finally {
      if (deletePreviewRequestGate.isCurrentRequest(requestId)) {
        setIsDeletePreviewLoading(false)
      }
    }
  }, [deletePreviewRequestGate, fetchQuery])

  const clearCategoryDeletePreview = useCallback(() => {
    setCategoryDeletePreview(null)
  }, [])

  const categoryMap = useMemo(() => (
    new Map(
      categories
        .map((category) => [Number(category?.id), category])
        .filter(([categoryId]) => Number.isFinite(categoryId))
    )
  ), [categories])

  return {
    categories,
    categoryCatalogTotalItems,
    categoryCatalogTotalPages,
    categoryDeletePreview,
    categoryMap,
    clearCategoryDeletePreview,
    error,
    info,
    invalidateCategoryCatalog,
    isDeletePreviewLoading,
    loadCategoryCatalog,
    loadCategoryDeletePreview,
    loading,
    setCategories,
    setError,
    setInfo,
  }
}
