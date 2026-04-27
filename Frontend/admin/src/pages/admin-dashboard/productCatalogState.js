import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  PRODUCT_PAGE_SIZE_OPTIONS,
  PRODUCT_PUBLISH_STATUS_FILTER_OPTIONS,
  PRODUCT_SORT_OPTIONS,
  PRODUCT_STOCK_FILTER_OPTIONS,
  PRODUCT_VIEW_MODE_OPTIONS,
} from './constants.js'
import useAdminCatalogMenuState from './useAdminCatalogMenuState.js'
import useDebouncedValue from './useDebouncedValue.js'

export function filterProducts(products, {
  productCategoryFilter,
  productPublishStatusFilter,
  productSearch,
  productStockFilter,
}) {
  const normalizedSearch = String(productSearch || '').trim().toLowerCase()
  const source = Array.isArray(products) ? products : []

  return source.filter((product) => {
    const matchesCategory = productCategoryFilter === 'all'
      || String(product?.categorie?.id ?? '') === productCategoryFilter

    if (!matchesCategory) return false

    const isPublished = product?.published !== false
    if (productPublishStatusFilter === 'online' && !isPublished) return false
    if (productPublishStatusFilter === 'offline' && isPublished) return false

    const stockValue = Number(product?.stock || 0)
    if (productStockFilter === 'out' && stockValue > 0) return false
    if (productStockFilter === 'low' && (stockValue <= 0 || stockValue > 5)) return false
    if (productStockFilter === 'ok' && stockValue <= 5) return false
    if (!normalizedSearch) return true

    const name = String(product?.nom || '').toLowerCase()
    const description = String(product?.description || '').toLowerCase()
    const category = String(product?.categorie?.libelle || '').toLowerCase()
    return name.includes(normalizedSearch) || description.includes(normalizedSearch) || category.includes(normalizedSearch)
  })
}

export function sortProducts(products, productSort) {
  const list = [...(Array.isArray(products) ? products : [])]

  if (productSort === 'price_asc') {
    list.sort((a, b) => Number(a?.prix || 0) - Number(b?.prix || 0))
  } else if (productSort === 'price_desc') {
    list.sort((a, b) => Number(b?.prix || 0) - Number(a?.prix || 0))
  } else if (productSort === 'rating_desc') {
    list.sort((a, b) => Number(b?.rating || 0) - Number(a?.rating || 0))
  } else if (productSort === 'rating_asc') {
    list.sort((a, b) => Number(a?.rating || 0) - Number(b?.rating || 0))
  } else if (productSort === 'stock_desc') {
    list.sort((a, b) => Number(b?.stock || 0) - Number(a?.stock || 0))
  } else if (productSort === 'stock_asc') {
    list.sort((a, b) => Number(a?.stock || 0) - Number(b?.stock || 0))
  } else if (productSort === 'name_asc') {
    list.sort((a, b) => String(a?.nom || '').localeCompare(String(b?.nom || ''), 'fr'))
  } else if (productSort === 'name_desc') {
    list.sort((a, b) => String(b?.nom || '').localeCompare(String(a?.nom || ''), 'fr'))
  } else if (productSort === 'status_online') {
    list.sort((a, b) => {
      const aValue = a?.published !== false ? 1 : 0
      const bValue = b?.published !== false ? 1 : 0
      return bValue - aValue || Number(b?.id || 0) - Number(a?.id || 0)
    })
  } else if (productSort === 'status_offline') {
    list.sort((a, b) => {
      const aValue = a?.published !== false ? 1 : 0
      const bValue = b?.published !== false ? 1 : 0
      return aValue - bValue || Number(b?.id || 0) - Number(a?.id || 0)
    })
  } else {
    list.sort((a, b) => Number(b?.id || 0) - Number(a?.id || 0))
  }

  return list
}

export function paginateProducts(products, productPage, productsPerPage) {
  const startIndex = (productPage - 1) * productsPerPage
  return products.slice(startIndex, startIndex + productsPerPage)
}

export function buildProductCategoryOptions(categories = [], products = []) {
  const fallbackOptions = products
    .map((product) => {
      const id = product?.categorie?.id
      const label = String(product?.categorie?.libelle || '').trim()
      if (id == null || !label) return null
      return { value: String(id), label }
    })
    .filter(Boolean)

  const source = categories.length > 0
    ? categories.map((category) => ({
        value: String(category?.id),
        label: String(category?.libelle || '').trim(),
      }))
    : fallbackOptions

  const uniqueOptions = source.filter((option, index, array) => (
    option.value
    && option.label
    && array.findIndex((item) => item.value === option.value) === index
  ))

  return [{ value: 'all', label: 'Toutes categories' }, ...uniqueOptions]
}

export function buildProductFilterSummary({
  productCategoryFilter,
  productPublishStatusFilter,
  productStockFilter,
  selectedProductCategory,
  selectedProductPublishStatusFilter,
  selectedProductStockFilter,
}) {
  if (productCategoryFilter === 'all' && productStockFilter === 'all' && productPublishStatusFilter === 'all') {
    return 'Aucun filtre'
  }

  const parts = []
  if (productCategoryFilter !== 'all') parts.push(selectedProductCategory.label)
  if (productStockFilter !== 'all') parts.push(selectedProductStockFilter.label)
  if (productPublishStatusFilter !== 'all') parts.push(selectedProductPublishStatusFilter.label)
  return parts.join(' • ')
}

export default function useProductCatalogState({
  catalogResponse,
  catalogReloadKey,
  categories,
  clearPendingSelectedProducts,
  loadCatalogPage,
  pageType,
  pendingProductsPerPageScrollRef,
  pendingSelectedProductIds,
  products,
  selectAllFilteredProducts,
}) {
  const [productSearch, setProductSearch] = useState('')
  const [productCategoryFilter, setProductCategoryFilter] = useState('all')
  const [productPublishStatusFilter, setProductPublishStatusFilter] = useState('all')
  const [productStockFilter, setProductStockFilter] = useState('all')
  const [productSort, setProductSort] = useState('recent')
  const [productsPerPage, setProductsPerPage] = useState(100)
  const [productViewMode, setProductViewMode] = useState('grid')
  const [requestedProductPage, setRequestedProductPage] = useState(1)
  const debouncedProductSearch = useDebouncedValue(productSearch, 250)
  const { openCatalogMenu, setOpenCatalogMenu } = useAdminCatalogMenuState()

  const filteredProducts = useMemo(() => (
    filterProducts(products, {
      productCategoryFilter,
      productPublishStatusFilter,
      productSearch: debouncedProductSearch,
      productStockFilter,
    })
  ), [debouncedProductSearch, productCategoryFilter, productPublishStatusFilter, productStockFilter, products])

  const sortedFilteredProducts = useMemo(() => (
    sortProducts(filteredProducts, productSort)
  ), [filteredProducts, productSort])

  const localTotalProductPages = useMemo(() => (
    Math.max(1, Math.ceil(sortedFilteredProducts.length / productsPerPage))
  ), [productsPerPage, sortedFilteredProducts.length])

  const totalProductPages = useMemo(() => {
    const serverTotalPages = Number(catalogResponse?.totalPages)
    return Number.isFinite(serverTotalPages) && serverTotalPages > 0
      ? serverTotalPages
      : localTotalProductPages
  }, [catalogResponse?.totalPages, localTotalProductPages])

  const productPage = useMemo(() => (
    Math.min(totalProductPages, Math.max(1, Number(requestedProductPage || 1)))
  ), [requestedProductPage, totalProductPages])

  const localPaginatedProducts = useMemo(() => (
    paginateProducts(sortedFilteredProducts, productPage, productsPerPage)
  ), [productPage, productsPerPage, sortedFilteredProducts])

  const paginatedProducts = useMemo(() => (
    Array.isArray(catalogResponse?.items) ? catalogResponse.items : localPaginatedProducts
  ), [catalogResponse, localPaginatedProducts])

  const filteredProductCount = useMemo(() => (
    Number.isFinite(Number(catalogResponse?.totalItems))
      ? Number(catalogResponse.totalItems)
      : filteredProducts.length
  ), [catalogResponse, filteredProducts.length])

  const filteredProductIds = useMemo(() => (
    paginatedProducts
      .map((product) => Number(product?.id))
      .filter((id) => Number.isFinite(id))
  ), [paginatedProducts])

  const selectedProductSort = useMemo(() => (
    PRODUCT_SORT_OPTIONS.find((option) => option.value === productSort) || PRODUCT_SORT_OPTIONS[0]
  ), [productSort])

  const selectedProductsPerPage = useMemo(() => (
    PRODUCT_PAGE_SIZE_OPTIONS.find((option) => option.value === productsPerPage) || PRODUCT_PAGE_SIZE_OPTIONS[1]
  ), [productsPerPage])

  const selectedProductViewMode = useMemo(() => (
    PRODUCT_VIEW_MODE_OPTIONS.find((option) => option.value === productViewMode) || PRODUCT_VIEW_MODE_OPTIONS[0]
  ), [productViewMode])

  const productCategoryOptions = useMemo(() => (
    buildProductCategoryOptions(categories, products)
  ), [categories, products])

  const selectedProductCategory = useMemo(() => (
    productCategoryOptions.find((option) => option.value === productCategoryFilter) || productCategoryOptions[0]
  ), [productCategoryFilter, productCategoryOptions])

  const selectedProductStockFilter = useMemo(() => (
    PRODUCT_STOCK_FILTER_OPTIONS.find((option) => option.value === productStockFilter) || PRODUCT_STOCK_FILTER_OPTIONS[0]
  ), [productStockFilter])

  const selectedProductPublishStatusFilter = useMemo(() => (
    PRODUCT_PUBLISH_STATUS_FILTER_OPTIONS.find((option) => option.value === productPublishStatusFilter) || PRODUCT_PUBLISH_STATUS_FILTER_OPTIONS[0]
  ), [productPublishStatusFilter])

  const selectedProductFilterSummary = useMemo(() => (
    buildProductFilterSummary({
      productCategoryFilter,
      productPublishStatusFilter,
      productStockFilter,
      selectedProductCategory,
      selectedProductPublishStatusFilter,
      selectedProductStockFilter,
    })
  ), [
    productCategoryFilter,
    productPublishStatusFilter,
    productStockFilter,
    selectedProductCategory,
    selectedProductPublishStatusFilter,
    selectedProductStockFilter,
  ])

  const pendingSelectedProductIdSet = useMemo(() => (
    new Set(pendingSelectedProductIds)
  ), [pendingSelectedProductIds])

  const hasSelectedProducts = pendingSelectedProductIds.length > 0

  const handleSelectAllFilteredProducts = useCallback(() => {
    selectAllFilteredProducts(filteredProductIds)
  }, [filteredProductIds, selectAllFilteredProducts])

  const handleClearAllSelectedProducts = useCallback(() => {
    clearPendingSelectedProducts(pendingSelectedProductIds)
  }, [clearPendingSelectedProducts, pendingSelectedProductIds])

  const setProductPage = useCallback((nextPage) => {
    setRequestedProductPage(Math.max(1, Number(nextPage || 1)))
  }, [])

  const setProductSearchWithReset = useCallback((nextSearch) => {
    setProductSearch(nextSearch)
    setRequestedProductPage(1)
  }, [])

  const setProductCategoryFilterWithReset = useCallback((nextCategoryFilter) => {
    setProductCategoryFilter(nextCategoryFilter)
    setRequestedProductPage(1)
  }, [])

  const setProductPublishStatusFilterWithReset = useCallback((nextStatusFilter) => {
    setProductPublishStatusFilter(nextStatusFilter)
    setRequestedProductPage(1)
  }, [])

  const setProductStockFilterWithReset = useCallback((nextStockFilter) => {
    setProductStockFilter(nextStockFilter)
    setRequestedProductPage(1)
  }, [])

  const setProductSortWithReset = useCallback((nextSort) => {
    setProductSort(nextSort)
    setRequestedProductPage(1)
  }, [])

  const setProductsPerPageWithReset = useCallback((nextPageSize) => {
    setProductsPerPage(nextPageSize)
    setRequestedProductPage(1)
  }, [])

  useEffect(() => {
    if (typeof loadCatalogPage !== 'function') return
    if (pageType !== 'products') return

    void loadCatalogPage({
      page: productPage,
      size: productsPerPage,
      sort: productSort,
      search: debouncedProductSearch,
      stockFilter: productStockFilter,
      statusFilter: productPublishStatusFilter,
      categoryId: productCategoryFilter === 'all' ? null : productCategoryFilter,
    })
  }, [
    catalogReloadKey,
    debouncedProductSearch,
    loadCatalogPage,
    pageType,
    productCategoryFilter,
    productPage,
    productPublishStatusFilter,
    productSort,
    productStockFilter,
    productsPerPage,
  ])

  useEffect(() => {
    if (pageType !== 'products') return
    if (typeof window === 'undefined') return

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }, [pageType, productPage])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (pendingProductsPerPageScrollRef.current == null) return

    const scrollTop = pendingProductsPerPageScrollRef.current
    pendingProductsPerPageScrollRef.current = null

    const restoreScroll = () => {
      window.scrollTo({
        top: scrollTop,
        behavior: 'auto',
      })
    }

    const frameId = window.requestAnimationFrame(() => {
      restoreScroll()
      window.requestAnimationFrame(restoreScroll)
    })

    return () => window.cancelAnimationFrame(frameId)
  }, [productsPerPage, pendingProductsPerPageScrollRef])

  return {
    filteredProductIds,
    filteredProductCount,
    filteredProducts,
    handleClearAllSelectedProducts,
    handleSelectAllFilteredProducts,
    hasSelectedProducts,
    openCatalogMenu,
    paginatedProducts,
    pendingSelectedProductIdSet,
    productCategoryFilter,
    productCategoryOptions,
    productPage,
    productPublishStatusFilter,
    productSearch,
    productSort,
    productStockFilter,
    productViewMode,
    productsPerPage,
    selectedProductCategory,
    selectedProductFilterSummary,
    selectedProductPublishStatusFilter,
    selectedProductSort,
    selectedProductsPerPage,
    selectedProductStockFilter,
    selectedProductViewMode,
    setOpenCatalogMenu,
    setProductCategoryFilter: setProductCategoryFilterWithReset,
    setProductPage,
    setProductPublishStatusFilter: setProductPublishStatusFilterWithReset,
    setProductSearch: setProductSearchWithReset,
    setProductSort: setProductSortWithReset,
    setProductStockFilter: setProductStockFilterWithReset,
    setProductViewMode,
    setProductsPerPage: setProductsPerPageWithReset,
    totalProductPages,
  }
}
