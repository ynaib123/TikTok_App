import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '../../services/adminApiClient'
import { setAdminQueryData } from '../../services/adminQueryCache.js'
import { ADMIN_ERROR_MESSAGES } from './feedbackMessages.js'
import useAdminQueryCache from './useAdminQueryCache.js'

const PRODUCT_CATEGORIES_STALE_TIME = 5 * 60 * 1000
const PRODUCT_CATALOG_STALE_TIME = 30_000

export default function useAdminProductResources({
  editingProduct,
  pageType,
  setError,
  setLoading,
}) {
  const [cachedProducts, setCachedProducts] = useState([])
  const [catalogQueryString, setCatalogQueryString] = useState('')
  const [catalogReloadKey, setCatalogReloadKey] = useState(0)
  const { invalidateQueries } = useAdminQueryCache()
  const isWorkspacePage = ['products', 'product-create', 'product-edit'].includes(pageType)

  const mergeProductsIntoCache = useCallback((incomingProducts) => {
    setCachedProducts((prev) => {
      const nextById = new Map(
        (Array.isArray(prev) ? prev : [])
          .map((product) => [Number(product?.id), product])
          .filter(([id]) => Number.isFinite(id))
      )

      ;(Array.isArray(incomingProducts) ? incomingProducts : []).forEach((product) => {
        const id = Number(product?.id)
        if (!Number.isFinite(id)) return
        nextById.set(id, product)
      })

      return Array.from(nextById.values())
    })
  }, [])

  const categoriesQuery = useQuery({
    queryKey: ['admin-product-categories'],
    queryFn: () => apiGet('/categories'),
    enabled: isWorkspacePage,
    staleTime: PRODUCT_CATEGORIES_STALE_TIME,
  })

  const catalogQuery = useQuery({
    queryKey: ['product-catalog', catalogQueryString, catalogReloadKey],
    queryFn: () => apiGet(`/produits/catalog?${catalogQueryString}`),
    enabled: pageType === 'products' && Boolean(catalogQueryString),
    staleTime: PRODUCT_CATALOG_STALE_TIME,
    placeholderData: (previousData) => previousData,
  })

  const categories = useMemo(() => (
    Array.isArray(categoriesQuery.data) ? categoriesQuery.data : []
  ), [categoriesQuery.data])

  const catalogResponse = catalogQuery.data ?? null
  const isCatalogLoading = Boolean(catalogQuery.isFetching)

  const products = useMemo(() => {
    const nextById = new Map()

    ;[
      ...(Array.isArray(cachedProducts) ? cachedProducts : []),
      ...(Array.isArray(catalogResponse?.items) ? catalogResponse.items : []),
      ...(editingProduct ? [editingProduct] : []),
    ].forEach((product) => {
      const id = Number(product?.id)
      if (!Number.isFinite(id)) return
      nextById.set(id, product)
    })

    return Array.from(nextById.values())
  }, [cachedProducts, catalogResponse, editingProduct])

  const productsById = useMemo(() => (
    new Map(
      products
        .map((product) => [Number(product?.id), product])
        .filter(([id]) => Number.isFinite(id))
    )
  ), [products])

  const loadProductWorkspace = useCallback(async () => {
    try {
      await categoriesQuery.refetch()
    } catch (err) {
      setError(err.message || ADMIN_ERROR_MESSAGES.loadProducts)
    }
  }, [categoriesQuery, setError])

  const refreshCategories = useCallback(async () => {
    try {
      await categoriesQuery.refetch()
    } catch (err) {
      setError(err.message || ADMIN_ERROR_MESSAGES.loadProducts)
    }
  }, [categoriesQuery, setError])

  const invalidateProductCatalog = useCallback(() => {
    invalidateQueries((key) => key.includes('"product-catalog"') || key.startsWith('product-catalog'))
    setCatalogReloadKey((prev) => prev + 1)
  }, [invalidateQueries])

  const removeProductsFromCache = useCallback((productIds) => {
    const idsToRemove = new Set(
      (Array.isArray(productIds) ? productIds : [])
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id))
    )

    if (idsToRemove.size === 0) return
    setCachedProducts((prev) => prev.filter((product) => !idsToRemove.has(Number(product?.id))))
  }, [])

  const loadProductCatalogPage = useCallback(({
    categoryId,
    page,
    search,
    size,
    statusFilter,
    sort,
    stockFilter,
  }) => {
    const query = new URLSearchParams()
    if (search?.trim()) query.set('search', search.trim())
    if (categoryId != null && String(categoryId).trim() !== '') query.set('categoryId', String(categoryId))
    query.set('statusFilter', statusFilter || 'all')
    query.set('stockFilter', stockFilter || 'all')
    query.set('sort', sort || 'recent')
    query.set('page', String(page || 1))
    query.set('size', String(size || 30))
    const serializedQuery = query.toString()

    setCatalogQueryString((prev) => (prev === serializedQuery ? prev : serializedQuery))
  }, [])

  const loadProductsByIds = useCallback(async (productIds) => {
    const normalizedIds = Array.from(new Set(
      (Array.isArray(productIds) ? productIds : [])
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id))
    ))

    const missingIds = normalizedIds.filter((id) => !productsById.has(id))
    if (missingIds.length === 0) return

    try {
      const response = await apiGet(`/produits/lookup?ids=${missingIds.join(',')}`)
      mergeProductsIntoCache(response)
    } catch (err) {
      setError(err.message || ADMIN_ERROR_MESSAGES.loadProducts)
    }
  }, [mergeProductsIntoCache, productsById, setError])

  useEffect(() => {
    if (!isWorkspacePage) return
    setLoading(Boolean(categoriesQuery.isPending && !categoriesQuery.data))
  }, [categoriesQuery.data, categoriesQuery.isPending, isWorkspacePage, setLoading])

  useEffect(() => {
    if (!categoriesQuery.error) return
    setError(categoriesQuery.error.message || ADMIN_ERROR_MESSAGES.loadProducts)
  }, [categoriesQuery.error, setError])

  useEffect(() => {
    if (!catalogQuery.error) return
    setError(catalogQuery.error.message || ADMIN_ERROR_MESSAGES.loadProducts)
  }, [catalogQuery.error, setError])

  const setCategories = useCallback((updater) => {
    const currentCategories = Array.isArray(categoriesQuery.data) ? categoriesQuery.data : []
    const nextCategories = typeof updater === 'function'
      ? updater(currentCategories)
      : updater

    setAdminQueryData(
      ['admin-product-categories'],
      Array.isArray(nextCategories) ? nextCategories : []
    )
  }, [categoriesQuery.data])

  return {
    catalogReloadKey,
    catalogResponse,
    categories,
    invalidateProductCatalog,
    isCatalogLoading,
    loadProductCatalogPage,
    loadProductsByIds,
    loadProductWorkspace,
    mergeProductsIntoCache,
    products,
    productsById,
    refreshCategories,
    removeProductsFromCache,
    setCategories,
  }
}
