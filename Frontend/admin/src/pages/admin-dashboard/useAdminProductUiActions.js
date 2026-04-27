import { useCallback } from 'react'
import { apiPost } from '../../services/adminApiClient'
import { EMPTY_PRODUCT_FORM, EMPTY_PRODUCT_FORM_SNAPSHOT, createProductDraft } from './constants.js'
import { ADMIN_ERROR_MESSAGES, normalizeProductValidationError } from './feedbackMessages.js'
import { buildDraftMutationPayload, getProductValidationMessageForForm } from './productDraftDomain.js'
import { readProductImportRows } from './productImportLoader.js'
import { buildImportedProductDrafts } from './productImportUtils.js'
import { resolveProductNavigationPolicy } from './productNavigationGuard.js'
import { createSessionActivityEntry } from './utils.js'
import { normalizePersistedProduct } from './productMutationState.js'
import { createProductRequest, updateProductPublishStatusRequest } from './productMutationService.js'

const ADMIN_BLOCKING_FALLBACK_MIN_DURATION_MS = 5000

export default function useAdminProductUiActions({
  appendProductSessionActivity,
  categories,
  createCategoryDraft,
  handleCreateFieldChange,
  isDeletingProducts,
  isImportingProductFile,
  isPersistingImportedProducts,
  invalidateProductCatalog,
  navigate,
  openProductCreateWorkspace,
  productImportModalState,
  products,
  setCategories,
  setActiveCreateDraftId,
  setCreateCategoryDraft,
  setCreateDrafts,
  setCreateForm,
  setCreateImageUrlDraft,
  setDeleteModalState,
  setError,
  setInfo,
  setImportProgressPercent,
  setInitialCreateForm,
  setIsCreatingCategory,
  setIsImportingProductFile,
  setIsPersistingImportedProducts,
  setOpenCatalogMenu,
  setProductImportModalState,
  setSavedCreateDraftIds,
  setSelectedCreatePreviewImage,
  setSelectedProductIds,
  upsertProductsInCache,
}) {
  const handleOpenProductCreateWorkspace = useCallback((mode = 'single') => {
    const navigationPolicy = resolveProductNavigationPolicy({
      intent: 'open-create-workspace',
    })
    if (navigationPolicy !== 'allow') return

    openProductCreateWorkspace(mode)
  }, [openProductCreateWorkspace])

  const handleOpenProductImportModal = useCallback(() => {
    const navigationPolicy = resolveProductNavigationPolicy({
      intent: 'open-import-modal',
    })
    if (navigationPolicy !== 'allow') return

    setProductImportModalState({
      isOpen: true,
      files: [],
      error: null,
      importedDrafts: [],
      importedRows: [],
      importedSelectedKeys: [],
      importedCount: 0,
      skippedRowCount: 0,
    })
    setImportProgressPercent(0)
  }, [setImportProgressPercent, setProductImportModalState])

  const closeProductImportModal = useCallback(() => {
    if (isImportingProductFile || isPersistingImportedProducts) return
    setProductImportModalState({
      isOpen: false,
      files: [],
      error: null,
      importedDrafts: [],
      importedRows: [],
      importedSelectedKeys: [],
      importedCount: 0,
      skippedRowCount: 0,
    })
    setImportProgressPercent(0)
  }, [isImportingProductFile, isPersistingImportedProducts, setImportProgressPercent, setProductImportModalState])

  const handleProductImportFileChange = useCallback((event) => {
    const selectedFiles = Array.from(event.target.files || [])
    const nextFiles = selectedFiles.slice(0, 3)
    setProductImportModalState((prev) => ({
      ...prev,
      files: nextFiles,
      error: selectedFiles.length > 3 ? 'Vous pouvez importer jusqu a 3 fichiers a la fois.' : null,
      importedDrafts: [],
      importedRows: [],
      importedSelectedKeys: [],
      importedCount: 0,
      skippedRowCount: 0,
    }))
    setImportProgressPercent(0)
  }, [setImportProgressPercent, setProductImportModalState])

  const handleProductImportSubmit = useCallback(async () => {
    const importFiles = Array.isArray(productImportModalState.files) ? productImportModalState.files.slice(0, 3) : []
    if (importFiles.length === 0) {
      setProductImportModalState((prev) => ({
        ...prev,
        error: "Selectionnez entre 1 et 3 fichiers CSV ou Excel avant de lancer l'import.",
      }))
      return
    }

    setIsImportingProductFile(true)
    setIsPersistingImportedProducts(false)
    setImportProgressPercent(4)
    setProductImportModalState((prev) => ({ ...prev, error: null }))

    try {
      const fileRows = []
      for (let index = 0; index < importFiles.length; index += 1) {
        const file = importFiles[index]
        const rows = await readProductImportRows(file)
        fileRows.push({ file, rows })
        const nextProgress = 10 + Math.round(((index + 1) / importFiles.length) * 60)
        setImportProgressPercent(nextProgress)
      }

      const rows = fileRows.flatMap((entry) => entry.rows)
      setImportProgressPercent(78)
      const { drafts, importedCount, skippedRowCount } = buildImportedProductDrafts({
        rows,
        categories,
        createDraft: createProductDraft,
      })

      if (drafts.length === 0) {
        throw new Error("Aucun produit exploitable n'a ete trouve dans le fichier.")
      }

      const importedRows = drafts.map((draft, index) => {
        const categoryLabel = categories.find((category) => (
          String(category?.id) === String(draft.form.categorieId)
        ))?.libelle

        const meta = [
          categoryLabel || null,
          draft.form.prix ? `${draft.form.prix} MAD` : null,
          draft.form.stock ? `Stock ${draft.form.stock}` : null,
        ].filter(Boolean).join(' • ')

        return {
          key: `${draft.id}-${index}`,
          name: draft.form.nom || `Produit ${index + 1}`,
          imageUrl: draft.form.imageUrl || '',
          meta,
        }
      })

      drafts.forEach((draft, index) => {
        draft.__importRowKey = importedRows[index]?.key
      })
      setImportProgressPercent(92)

      setError(null)
      setProductImportModalState((prev) => ({
        ...prev,
        error: null,
        importedDrafts: drafts,
        importedRows,
        importedSelectedKeys: importedRows.map((row) => row.key),
        importedCount,
        skippedRowCount,
      }))
      setImportProgressPercent(100)
    } catch (importError) {
      setProductImportModalState((prev) => ({
        ...prev,
        error: importError?.message || "Le fichier n'a pas pu etre importe.",
      }))
      setImportProgressPercent(0)
    } finally {
      setIsImportingProductFile(false)
      setIsPersistingImportedProducts(false)
    }
  }, [
    categories,
    productImportModalState.files,
    setError,
    setImportProgressPercent,
    setIsImportingProductFile,
    setIsPersistingImportedProducts,
    setProductImportModalState,
  ])

  const handleToggleImportedRowSelection = useCallback((rowKey) => {
    setProductImportModalState((prev) => {
      const selectedKeys = Array.isArray(prev.importedSelectedKeys) ? prev.importedSelectedKeys : []
      const nextSelectedKeys = selectedKeys.includes(rowKey)
        ? selectedKeys.filter((key) => key !== rowKey)
        : [...selectedKeys, rowKey]

      return {
        ...prev,
        importedSelectedKeys: nextSelectedKeys,
      }
    })
  }, [setProductImportModalState])

  const handleSetImportedRowSelection = useCallback((rowKeys, shouldSelect) => {
    const normalizedRowKeys = Array.from(new Set(
      (Array.isArray(rowKeys) ? rowKeys : []).filter(Boolean)
    ))

    if (normalizedRowKeys.length === 0) return

    setProductImportModalState((prev) => {
      const selectedKeys = Array.isArray(prev.importedSelectedKeys) ? prev.importedSelectedKeys : []

      return {
        ...prev,
        importedSelectedKeys: shouldSelect
          ? Array.from(new Set([...selectedKeys, ...normalizedRowKeys]))
          : selectedKeys.filter((key) => !normalizedRowKeys.includes(key)),
      }
    })
  }, [setProductImportModalState])

  const removeImportedSelectionFromModal = useCallback((processedKeys) => {
    setProductImportModalState((prev) => {
      const nextRows = (Array.isArray(prev.importedRows) ? prev.importedRows : [])
        .filter((row) => !processedKeys.includes(row.key))
      const nextDrafts = (Array.isArray(prev.importedDrafts) ? prev.importedDrafts : [])
        .filter((draft) => !processedKeys.includes(draft.__importRowKey))
      const nextSelectedKeys = (Array.isArray(prev.importedSelectedKeys) ? prev.importedSelectedKeys : [])
        .filter((key) => !processedKeys.includes(key))

      if (nextRows.length === 0) {
        return {
          isOpen: false,
          files: [],
          error: null,
          importedDrafts: [],
          importedRows: [],
          importedSelectedKeys: [],
          importedCount: 0,
          skippedRowCount: 0,
        }
      }

      return {
        ...prev,
        importedDrafts: nextDrafts,
        importedRows: nextRows,
        importedSelectedKeys: nextSelectedKeys,
        importedCount: nextRows.length,
      }
    })
  }, [setProductImportModalState])

  const resolveSelectedImportedEntries = useCallback(() => {
    const importedRows = Array.isArray(productImportModalState.importedRows) ? productImportModalState.importedRows : []
    const importedDrafts = Array.isArray(productImportModalState.importedDrafts) ? productImportModalState.importedDrafts : []
    const selectedKeys = Array.isArray(productImportModalState.importedSelectedKeys) ? productImportModalState.importedSelectedKeys : []

    const selectedRows = importedRows.filter((row) => selectedKeys.includes(row.key))
    const selectedDrafts = importedDrafts.filter((draft) => selectedKeys.includes(draft.__importRowKey))

    return {
      selectedDrafts,
      selectedKeys,
      selectedRows,
    }
  }, [productImportModalState.importedDrafts, productImportModalState.importedRows, productImportModalState.importedSelectedKeys])

  const handleSendImportedProductsToDrafts = useCallback(() => {
    const { selectedDrafts, selectedKeys } = resolveSelectedImportedEntries()

    if (selectedDrafts.length === 0) {
      setProductImportModalState((prev) => ({
        ...prev,
        error: 'Selectionnez au moins un produit importe.',
      }))
      return
    }

    setCreateDrafts((prev) => [...selectedDrafts, ...prev])
    setSavedCreateDraftIds([])
    setActiveCreateDraftId(selectedDrafts[0]?.id || null)
    setCreateForm(selectedDrafts[0]?.form || EMPTY_PRODUCT_FORM)
    setInitialCreateForm(EMPTY_PRODUCT_FORM_SNAPSHOT)
    setCreateCategoryDraft('')
    setCreateImageUrlDraft('')
    setSelectedCreatePreviewImage(selectedDrafts[0]?.selectedPreviewImage || '')
    setInfo(`${selectedDrafts.length} produit(s) envoyes dans Non sauvegardes.`)
    removeImportedSelectionFromModal(selectedKeys)
    navigate('/products')
  }, [
    navigate,
    removeImportedSelectionFromModal,
    resolveSelectedImportedEntries,
    setActiveCreateDraftId,
    setCreateCategoryDraft,
    setCreateDrafts,
    setCreateForm,
    setCreateImageUrlDraft,
    setInfo,
    setInitialCreateForm,
    setProductImportModalState,
    setSavedCreateDraftIds,
    setSelectedCreatePreviewImage,
  ])

  const handlePersistImportedProducts = useCallback(async (published) => {
    const { selectedDrafts, selectedKeys } = resolveSelectedImportedEntries()

    if (selectedDrafts.length === 0) {
      setProductImportModalState((prev) => ({
        ...prev,
        error: 'Selectionnez au moins un produit importe.',
      }))
      return
    }

    const invalidDraft = selectedDrafts.find((draft) => Boolean(getProductValidationMessageForForm(draft?.form)))
    if (invalidDraft) {
      setProductImportModalState((prev) => ({
        ...prev,
        error: getProductValidationMessageForForm(invalidDraft.form) || ADMIN_ERROR_MESSAGES.completeRequiredProductFields,
      }))
      return
    }

    const startedAt = Date.now()
    setIsImportingProductFile(false)
    setIsPersistingImportedProducts(true)
    setImportProgressPercent(6)
    setProductImportModalState((prev) => ({ ...prev, error: null }))

    try {
      const createdProducts = []

      for (let index = 0; index < selectedDrafts.length; index += 1) {
        const draft = selectedDrafts[index]
        const payload = buildDraftMutationPayload({
          categories,
          draft,
        })
        payload.published = Boolean(published)

        const createdProduct = await createProductRequest(payload)
        createdProducts.push(normalizePersistedProduct(createdProduct, payload))
        const nextProgress = 12 + Math.round(((index + 1) / selectedDrafts.length) * 72)
        setImportProgressPercent(nextProgress)
      }

      if (!published && createdProducts.length > 0) {
        await updateProductPublishStatusRequest(createdProducts.map((product) => Number(product.id)).filter(Number.isFinite), false)
        setImportProgressPercent(92)
      }

      upsertProductsInCache(createdProducts)
      invalidateProductCatalog?.()
      createdProducts.forEach((product) => {
        appendProductSessionActivity(createSessionActivityEntry(published ? 'Mise en ligne' : 'Ajout', product))
      })
      setImportProgressPercent(100)
      const elapsed = Date.now() - startedAt
      const remaining = Math.max(0, ADMIN_BLOCKING_FALLBACK_MIN_DURATION_MS - elapsed)
      if (remaining > 0) {
        await new Promise((resolve) => window.setTimeout(resolve, remaining))
      }
      setInfo(
        published
          ? `${createdProducts.length} produit(s) enregistres et publies.`
          : `${createdProducts.length} produit(s) enregistres hors ligne.`
      )
      removeImportedSelectionFromModal(selectedKeys)
    } catch (error) {
      setProductImportModalState((prev) => ({
        ...prev,
        error: normalizeProductValidationError(
          error?.message,
          "Impossible d'enregistrer les produits importes."
        ),
      }))
      setImportProgressPercent(0)
    } finally {
      setIsPersistingImportedProducts(false)
    }
  }, [
    appendProductSessionActivity,
    categories,
    invalidateProductCatalog,
    removeImportedSelectionFromModal,
    resolveSelectedImportedEntries,
    setInfo,
    setImportProgressPercent,
    setIsImportingProductFile,
    setIsPersistingImportedProducts,
    setProductImportModalState,
    upsertProductsInCache,
  ])

  const handleOpenProductDetailsFromCatalog = useCallback((productIdToOpen) => {
    const navigationPolicy = resolveProductNavigationPolicy({
      intent: 'open-product-details',
    })
    if (navigationPolicy !== 'allow') return false

    const resolvedProductId = Number(productIdToOpen)
    if (!Number.isFinite(resolvedProductId)) return false

    const selectedProduct = (Array.isArray(products) ? products : [])
      .find((product) => Number(product?.id) === resolvedProductId)

    appendProductSessionActivity(createSessionActivityEntry(
      'Consultation',
      selectedProduct || { id: resolvedProductId, nom: `Produit #${resolvedProductId}` }
    ))

    setSelectedProductIds((prev) => (
      prev.includes(resolvedProductId)
        ? prev
        : [...prev, resolvedProductId]
    ))
    navigate(`/products/${resolvedProductId}/edit#product-details`)
    return true
  }, [appendProductSessionActivity, navigate, products, setSelectedProductIds])

  const closeDeleteModal = useCallback(() => {
    if (isDeletingProducts) return
    setDeleteModalState({
      isOpen: false,
      productIds: [],
      redirectTo: null,
    })
  }, [isDeletingProducts, setDeleteModalState])

  const handleCreateProductCategory = useCallback(async () => {
    const libelle = String(createCategoryDraft || '').trim()

    if (!libelle) {
      setError(ADMIN_ERROR_MESSAGES.categoryNameRequired)
      return
    }

    const existingCategory = categories.find((category) => (
      String(category?.libelle || '').trim().toLowerCase() === libelle.toLowerCase()
    ))

    if (existingCategory) {
      handleCreateFieldChange('categorieId', String(existingCategory.id))
      setCreateCategoryDraft(String(existingCategory.libelle || ''))
      setOpenCatalogMenu(null)
      setError(null)
      return
    }

    setIsCreatingCategory(true)
    setError(null)

    try {
      const createdCategory = await apiPost('/categories', { libelle })
      setCategories((prev) => [createdCategory, ...prev.filter((category) => Number(category?.id) !== Number(createdCategory?.id))])
      handleCreateFieldChange('categorieId', String(createdCategory?.id || ''))
      setCreateCategoryDraft(String(createdCategory?.libelle || libelle))
      setOpenCatalogMenu(null)
      appendProductSessionActivity(createSessionActivityEntry('Ajout', createdCategory, 'category'))
    } catch (err) {
      setError(err.message || ADMIN_ERROR_MESSAGES.createCategory)
    } finally {
      setIsCreatingCategory(false)
    }
  }, [
    appendProductSessionActivity,
    categories,
    createCategoryDraft,
    handleCreateFieldChange,
    setCategories,
    setCreateCategoryDraft,
    setError,
    setIsCreatingCategory,
    setOpenCatalogMenu,
  ])

  return {
    closeDeleteModal,
    closeProductImportModal,
    handleCreateProductCategory,
    handleOpenProductCreateWorkspace,
    handleOpenProductDetailsFromCatalog,
    handleOpenProductImportModal,
    handlePersistImportedProducts,
    handleProductImportFileChange,
    handleProductImportSubmit,
    handleSendImportedProductsToDrafts,
    handleSetImportedRowSelection,
    handleToggleImportedRowSelection,
  }
}
