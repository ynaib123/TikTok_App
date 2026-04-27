import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useEffect } from 'react'
import useAdminProductResources from './useAdminProductResources'
import useAdminProductUiActions from './useAdminProductUiActions'
import useAdminProductViewProps from './useAdminProductViewProps'
import useAdminProductPageState from './useAdminProductPageState'
import { resolveProductsActiveSectionId } from './productPageState.js'
import { buildProductControllerResult } from './adminProductsPageControllerState.js'
import useAdminProductWorkspaceModule from './useAdminProductWorkspaceModule.js'
import useAdminProductCatalogModule from './useAdminProductCatalogModule.js'
import useAdminProductMutationModule from './useAdminProductMutationModule.js'
import useAdminProductSelectionModule from './useAdminProductSelectionModule.js'

export default function useAdminProductsPageController({
  pageType = 'products',
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const { productId } = useParams()

  const pageState = useAdminProductPageState()
  const {
    createCategoryDraft,
    createForm,
    createImageUrlDraft,
    descriptionInputValue,
    editCategoryDraft,
    editDraftsByProductId,
    editForm,
    editingProduct,
    error,
    imageUrlDraft,
    importProgressPercent,
    info,
    initialCreateForm,
    initialEditForm,
    isCreatingCategory,
    isImportingProductFile,
    isPersistingImportedProducts,
    loading,
    pendingProductsPerPageScrollRef,
    productImportModalState,
    selectedCreatePreviewImage,
    selectedPreviewImage,
    setCreateCategoryDraft,
    setCreateForm,
    setCreateImageUrlDraft,
    setDescriptionInputValue,
    setEditCategoryDraft,
    setEditDraftsByProductId,
    setEditForm,
    setEditingProduct,
    setError,
    setImageUrlDraft,
    setImportProgressPercent,
    setInfo,
    setInitialCreateForm,
    setInitialEditForm,
    setIsCreatingCategory,
    setIsImportingProductFile,
    setIsPersistingImportedProducts,
    setLoading,
    setProductImportModalState,
    setSelectedCreatePreviewImage,
    setSelectedPreviewImage,
  } = pageState

  const resources = useAdminProductResources({
    editingProduct,
    pageType,
    setError,
    setLoading,
  })

  const activeSectionId = resolveProductsActiveSectionId({
    hash: location.hash,
    pageType,
    productId,
  })
  const isCreateSection = activeSectionId === 'add-products'

  const {
    derivedPageState,
    workspaceController,
    workspaceState,
  } = useAdminProductWorkspaceModule({
    activeSectionId,
    createCategoryDraft,
    createForm,
    descriptionInputValue,
    editCategoryDraft,
    editDraftsByProductId,
    editForm,
    editingProduct,
    initialCreateForm,
    initialEditForm,
    isCreateSection,
    locationHash: location.hash,
    navigate,
    pageType,
    productId,
    productImportModalOpen: productImportModalState.isOpen,
    resources,
    selectedPreviewImage,
    setCreateCategoryDraft,
    setCreateForm,
    setCreateImageUrlDraft,
    setDescriptionInputValue,
    setEditCategoryDraft,
    setEditDraftsByProductId,
    setEditForm,
    setEditingProduct,
    setError,
    setImageUrlDraft,
    setInitialCreateForm,
    setInitialEditForm,
    setIsCreatingCategory,
    setLoading,
    setSelectedCreatePreviewImage,
    setSelectedPreviewImage,
  })

  const { guardedNavigate, productWorkspaceModel } = derivedPageState
  const { deleteModalState, managedEditProductId } = workspaceState

  const catalogState = useAdminProductCatalogModule({
    catalogResponse: resources.catalogResponse,
    catalogReloadKey: resources.catalogReloadKey,
    categories: resources.categories,
    clearPendingSelectedProducts: workspaceState.clearPendingSelectedProducts,
    loadCatalogPage: resources.loadProductCatalogPage,
    pageType,
    pendingProductsPerPageScrollRef,
    pendingSelectedProductIds: workspaceController.pendingSelectedProductIds,
    products: resources.products,
    selectAllFilteredProducts: workspaceState.selectAllFilteredProducts,
  })
  const { setProductCategoryFilter } = catalogState

  useEffect(() => {
    if (pageType !== 'products') return

    const searchParams = new URLSearchParams(location.search)
    const requestedCategoryId = String(searchParams.get('categoryId') || '').trim()
    if (!requestedCategoryId) return

    setProductCategoryFilter(requestedCategoryId)
    searchParams.delete('categoryId')

    const nextSearch = searchParams.toString()
    navigate(
      {
        pathname: location.pathname,
        search: nextSearch ? `?${nextSearch}` : '',
        hash: location.hash,
      },
      { replace: true }
    )
  }, [
    location.hash,
    location.pathname,
    location.search,
    navigate,
    pageType,
    setProductCategoryFilter,
  ])

  useAdminProductSelectionModule({
    deleteModalProductIds: deleteModalState.productIds,
    editDraftsByProductId,
    loadProductsByIds: resources.loadProductsByIds,
    managedEditProductId,
    resolvedEditProductId: workspaceController.resolvedEditProductId,
    selectedProductIds: productWorkspaceModel.selectedIds,
  })

  const mutations = useAdminProductMutationModule({
    activeCreateDraftId: workspaceState.activeCreateDraftId,
    appendProductSessionActivity: workspaceController.appendProductSessionActivity,
    categories: resources.categories,
    createDrafts: workspaceState.createDrafts,
    createForm,
    createImageUrlDraft,
    deleteModalState: workspaceState.deleteModalState,
    descriptionInputValue,
    editDraftsByProductId,
    editForm,
    editImageUrls: workspaceController.editImageUrls,
    editingProduct,
    imageUrlDraft,
    initialEditForm,
    invalidateProductCatalog: resources.invalidateProductCatalog,
    isCreateSection,
    navigate,
    products: resources.products,
    productsById: resources.productsById,
    refreshCategories: resources.refreshCategories,
    resolvedEditProductId: workspaceController.resolvedEditProductId,
    savedCreateDraftIds: workspaceState.savedCreateDraftIds,
    selectedCategory: workspaceController.selectedCategory,
    selectedCreateCategory: workspaceController.selectedCreateCategory,
    selectedCreatePreviewImage,
    selectedPreviewImage,
    selectedProductIds: productWorkspaceModel.selectedIds,
    setActiveCreateDraftId: workspaceState.setActiveCreateDraftId,
    setCreateCategoryDraft,
    setCreateDrafts: workspaceState.setCreateDrafts,
    setCreateForm,
    setCreateImageUrlDraft,
    setDeleteModalState: workspaceState.setDeleteModalState,
    setDescriptionInputValue,
    setEditCategoryDraft,
    setEditDraftsByProductId,
    setEditForm,
    setEditingProduct,
    setError,
    setImageUrlDraft,
    setInfo,
    setInitialCreateForm,
    setInitialEditForm,
    setManagedEditProductId: workspaceState.setManagedEditProductId,
    setModificationProductIds: workspaceState.setModificationProductIds,
    setSavedCreateDraftIds: workspaceState.setSavedCreateDraftIds,
    setSelectedCreatePreviewImage,
    setSelectedPreviewImage,
    setSelectedProductIds: workspaceState.setSelectedProductIds,
    removeProductsFromCache: resources.removeProductsFromCache,
    upsertProductsInCache: resources.mergeProductsIntoCache,
    guardedNavigate,
  })

  const uiActions = useAdminProductUiActions({
    appendProductSessionActivity: workspaceController.appendProductSessionActivity,
    categories: resources.categories,
    createCategoryDraft,
    editDraftsByProductId,
    guardedNavigate,
    handleCreateFieldChange: mutations.handleCreateFieldChange,
    isDeletingProducts: mutations.isDeletingProducts,
    isImportingProductFile,
    isPersistingImportedProducts,
    invalidateProductCatalog: resources.invalidateProductCatalog,
    navigate,
    openProductCreateWorkspace: workspaceState.openProductCreateWorkspace,
    openDeleteProductsModal: workspaceState.openDeleteProductsModal,
    pageType,
    productId,
    productImportModalState,
    products: resources.products,
    selectedProductIds: productWorkspaceModel.selectedIds,
    setActiveCreateDraftId: workspaceState.setActiveCreateDraftId,
    setCategories: resources.setCategories,
    setCreateCategoryDraft,
    setCreateDrafts: workspaceState.setCreateDrafts,
    setCreateForm,
    setCreateImageUrlDraft,
    setDeleteModalState: workspaceState.setDeleteModalState,
    setError,
    setInfo,
    setImportProgressPercent,
    setInitialCreateForm,
    setIsCreatingCategory,
    setIsImportingProductFile,
    setIsPersistingImportedProducts,
    setOpenCatalogMenu: catalogState.setOpenCatalogMenu,
    setProductImportModalState,
    setSavedCreateDraftIds: workspaceState.setSavedCreateDraftIds,
    setSelectedCreatePreviewImage,
    setSelectedProductIds: workspaceState.setSelectedProductIds,
    upsertProductsInCache: resources.mergeProductsIntoCache,
  })

  const viewProps = useAdminProductViewProps({
    actions: {
      closeDeleteModal: uiActions.closeDeleteModal,
      closeProductImportModal: uiActions.closeProductImportModal,
      closeUnsavedSelectionModal: workspaceState.closeUnsavedSelectionModal,
      confirmUnsavedSelectionReset: workspaceController.confirmUnsavedSelectionReset,
      guardedNavigate,
      handleAddCreateImageUrl: mutations.handleAddCreateImageUrl,
      handleAddImageUrl: mutations.handleAddImageUrl,
      handleBulkProductCreate: mutations.handleBulkProductCreate,
      handleBulkProductDelete: mutations.handleBulkProductDelete,
      handleBulkProductPublishStatus: mutations.handleBulkProductPublishStatus,
      handleClearAllSelectedProducts: catalogState.handleClearAllSelectedProducts,
      handleClearPendingSelection: workspaceState.handleClearPendingSelection,
      handleCreateFieldChange: mutations.handleCreateFieldChange,
      handleCreateImagesUpload: mutations.handleCreateImagesUpload,
      handleCreateProductCategory: uiActions.handleCreateProductCategory,
      handleCreateEditCategory: workspaceController.handleCreateEditCategory,
      handleEditFieldChange: mutations.handleEditFieldChange,
      handleImagesUpload: mutations.handleImagesUpload,
      handleOpenProductCreateWorkspace: uiActions.handleOpenProductCreateWorkspace,
      handleOpenProductDetailsFromCatalog: uiActions.handleOpenProductDetailsFromCatalog,
      handleOpenProductImportModal: uiActions.handleOpenProductImportModal,
      handlePersistImportedProducts: uiActions.handlePersistImportedProducts,
      handleProductCreate: mutations.handleProductCreate,
      handleProductImportFileChange: uiActions.handleProductImportFileChange,
      handleProductImportSubmit: uiActions.handleProductImportSubmit,
      handleSendImportedProductsToDrafts: uiActions.handleSendImportedProductsToDrafts,
      handleSetImportedRowSelection: uiActions.handleSetImportedRowSelection,
      handleProductSave: mutations.handleProductSave,
      handleRemoveCreateDraft: workspaceState.handleRemoveCreateDraft,
      handleRemoveCreateImage: mutations.handleRemoveCreateImage,
      handleRemoveImage: mutations.handleRemoveImage,
      handleRemovePendingSelectedProduct: workspaceState.handleRemovePendingSelectedProduct,
      handleResetCreateChanges: mutations.handleResetCreateChanges,
      handleResetEditChanges: mutations.handleResetEditChanges,
      handleSaveDirtySelection: mutations.handleSaveDirtySelection,
      handleSelectAllFilteredProducts: catalogState.handleSelectAllFilteredProducts,
      handleSelectCreateDraft: workspaceState.handleSelectCreateDraft,
      handleSelectCreatePrimaryImage: mutations.handleSelectCreatePrimaryImage,
      handleSelectPrimaryImage: mutations.handleSelectPrimaryImage,
      handleSetCreatePreviewImage: mutations.handleSetCreatePreviewImage,
      handleSetEditPreviewImage: mutations.handleSetEditPreviewImage,
      navigate,
      openDeleteProductsModal: workspaceState.openDeleteProductsModal,
      openUnsavedSelectionModal: workspaceState.openUnsavedSelectionModal,
      setCreateCategoryDraft,
      setCreateImageUrlDraft,
      setDescriptionInputValue,
      setEditCategoryDraft,
      setImageUrlDraft,
      setOpenCatalogMenu: catalogState.setOpenCatalogMenu,
      setProductCategoryFilter: catalogState.setProductCategoryFilter,
      setProductPage: catalogState.setProductPage,
      setProductPublishStatusFilter: catalogState.setProductPublishStatusFilter,
      setProductSearch: catalogState.setProductSearch,
      setProductSort: catalogState.setProductSort,
      setProductStockFilter: catalogState.setProductStockFilter,
      setProductViewMode: catalogState.setProductViewMode,
      setProductsPerPage: catalogState.setProductsPerPage,
      toggleSelectedProductId: workspaceState.toggleSelectedProductId,
      handleToggleImportedRowSelection: uiActions.handleToggleImportedRowSelection,
    },
    derived: {
      createDirtyFields: workspaceController.createDirtyFields,
      createImageUrls: workspaceController.createImageUrls,
      deferredEditDescription: workspaceController.deferredEditDescription,
      deleteModalProducts: workspaceController.deleteModalProducts,
      dirtyCreateDrafts: workspaceController.dirtyCreateDrafts,
      dirtySelectedProductsForSidebar: workspaceController.dirtySelectedProductsForSidebar,
      editDirtyFields: workspaceController.editDirtyFields,
      editImageUrls: workspaceController.editImageUrls,
      editPreviewImage: workspaceController.editPreviewImage,
      editPreviewSidebarSlots: workspaceController.editPreviewSidebarSlots,
      filteredCreateCategories: workspaceController.filteredCreateCategories,
      filteredEditCategories: workspaceController.filteredEditCategories,
      filteredProductCount: catalogState.filteredProductCount,
      filteredProductIds: catalogState.filteredProductIds,
      pendingSelectedProductIds: workspaceController.pendingSelectedProductIds,
      pendingSelectedProductIdSet: catalogState.pendingSelectedProductIdSet,
      selectedCreateCategoryLabel: workspaceController.selectedCreateCategoryLabel,
      selectedEditCategoryLabel: workspaceController.selectedEditCategoryLabel,
      selectionSummary: workspaceController.selectionSummary,
      unsavedSelectionModalProducts: workspaceController.unsavedSelectionModalProducts,
      untouchedCreateDrafts: workspaceController.untouchedCreateDrafts,
      untouchedSelectedProductsForSidebar: workspaceController.untouchedSelectedProductsForSidebar,
    },
    resources: {
      activeSectionId,
      createCategoryDraft,
      createForm,
      createImageUrlDraft,
      deleteModalState: workspaceState.deleteModalState,
      descriptionInputValue,
      editCategoryDraft,
      editForm,
      editingProduct,
      hasSelectedProducts: catalogState.hasSelectedProducts,
      imageUrlDraft,
      isCreateDirty: workspaceController.isCreateDirty,
      isCreatingCategory,
      isCreatingProduct: mutations.isCreatingProduct,
      deleteProgressPercent: mutations.deleteProgressPercent,
      isDeletingCategory: false,
      isDeletingProducts: mutations.isDeletingProducts,
      isEditDirty: workspaceController.isEditDirty,
      isImportingProductFile,
      isPersistingImportedProducts,
      isSaving: mutations.isSaving,
      isSavingDirtySelection: mutations.isSavingDirtySelection,
      isUpdatingProductPublishStatus: mutations.isUpdatingProductPublishStatus,
      isUploadingCreateImages: mutations.isUploadingCreateImages,
      isUploadingImages: mutations.isUploadingImages,
      loading: loading || resources.isCatalogLoading,
      managedEditProductId: workspaceState.managedEditProductId,
      pendingProductsPerPageScrollRef,
      productImportModalState,
      productsById: resources.productsById,
      resolvedEditProductId: workspaceController.resolvedEditProductId,
      selectedCreatePreviewImage,
      unsavedSelectionModalState: workspaceState.unsavedSelectionModalState,
    },
    state: {
      activeCreateDraft: workspaceState.activeCreateDraft,
      activeCreateDraftId: workspaceState.activeCreateDraftId,
      createDrafts: workspaceState.createDrafts,
      openCatalogMenu: catalogState.openCatalogMenu,
      paginatedProducts: catalogState.paginatedProducts,
      productCategoryFilter: catalogState.productCategoryFilter,
      productCategoryOptions: catalogState.productCategoryOptions,
      productPage: catalogState.productPage,
      productPublishStatusFilter: catalogState.productPublishStatusFilter,
      productSearch: catalogState.productSearch,
      productSort: catalogState.productSort,
      productStockFilter: catalogState.productStockFilter,
      productViewMode: catalogState.productViewMode,
      productsPerPage: catalogState.productsPerPage,
      selectedProductCategory: catalogState.selectedProductCategory,
      selectedProductFilterSummary: catalogState.selectedProductFilterSummary,
      selectedProductPublishStatusFilter: catalogState.selectedProductPublishStatusFilter,
      selectedProductsPerPage: catalogState.selectedProductsPerPage,
      selectedProductSort: catalogState.selectedProductSort,
      selectedProductStockFilter: catalogState.selectedProductStockFilter,
      selectedProductViewMode: catalogState.selectedProductViewMode,
      totalProductPages: catalogState.totalProductPages,
    },
  })

  const isBlocking = Boolean(
    mutations.isDeletingProducts || isPersistingImportedProducts
  )

  const blockingMessage = mutations.isDeletingProducts
    ? 'Suppression des produits...'
    : isPersistingImportedProducts
      ? 'Import des produits...'
      : "Chargement de l'espace admin..."

  return buildProductControllerResult({
    actionModalProps: viewProps.actionModalProps,
    activeSectionId,
    blockingMessage,
    blockingProgress: mutations.isDeletingProducts
      ? mutations.deleteProgressPercent
      : isPersistingImportedProducts
        ? importProgressPercent
        : null,
    error,
    guardedNavigate,
    info,
    isBlocking,
    managementSectionProps: viewProps.managementSectionProps,
    pageType,
    productCreatePanelProps: viewProps.productCreatePanelProps,
    productDeletePanelProps: viewProps.productDeletePanelProps,
    productEditPanelProps: viewProps.productEditPanelProps,
    productSelectionSidebarProps: viewProps.productSelectionSidebarProps,
    setError,
    setInfo,
    showProductSelectionSidebar: workspaceController.showProductSelectionSidebar,
  })
}
