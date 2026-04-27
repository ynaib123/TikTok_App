import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildProductCreatePanelProps,
  buildProductDeletePanelProps,
  buildProductEditPanelProps,
  buildProductSelectionSidebarProps,
} from './productPanelProps.js'

test('buildProductCreatePanelProps keeps create panel contract stable', () => {
  const result = buildProductCreatePanelProps({
    activeCreateDraft: { id: 'd1' },
    activeSectionId: 'add-products',
    createCategoryDraft: 'Maison',
    createDirtyFields: { nom: true },
    createForm: { nom: 'Produit' },
    createImageUrls: ['a'],
    createImageUrlDraft: 'a',
    createPromotionActive: true,
    createPreviewPrice: 12,
    filteredCreateCategories: [{ id: 1 }],
    handleAddCreateImageUrl: () => {},
    handleBulkProductCreate: () => {},
    handleCreateFieldChange: () => {},
    handleCreateImagesUpload: () => {},
    handleCreateProductCategory: () => {},
    handleProductCreate: () => {},
    handleRemoveCreateImage: () => {},
    handleResetCreateChanges: () => {},
    handleSelectCreatePrimaryImage: () => {},
    handleSetCreatePreviewImage: () => {},
    hasMultipleDrafts: true,
    isCreateDirty: true,
    isCreatingCategory: false,
    isCreatingProduct: true,
    isDeletingCategory: false,
    isUploadingCreateImages: false,
    openCatalogMenu: 'create-category',
    selectedCreateCategoryLabel: 'Maison',
    selectedCreatePreviewImage: 'img',
    setCreateCategoryDraft: () => {},
    setCreateImageUrlDraft: () => {},
    setOpenCatalogMenu: () => {},
  })

  assert.equal(result.activeSectionId, 'add-products')
  assert.equal(result.hasMultipleDrafts, true)
  assert.equal(result.createPreviewPrice, 12)
  assert.equal(result.selectedCreateCategoryLabel, 'Maison')
})

test('buildProductEditPanelProps keeps edit panel contract stable', () => {
  const result = buildProductEditPanelProps({
    deferredEditDescription: 'desc',
    descriptionInputValue: 'desc',
    editCategoryDraft: 'Tech',
    editDirtyFields: { nom: false },
    editForm: { nom: 'P' },
    editImageUrls: ['img'],
    editPreviewImage: 'img',
    editPreviewSidebarSlots: ['a', null, null],
    editingProduct: { id: 4 },
    filteredEditCategories: [],
    handleAddImageUrl: () => {},
    handleCreateEditCategory: () => {},
    handleEditFieldChange: () => {},
    handleImagesUpload: () => {},
    handleProductSave: () => {},
    handleRemoveImage: () => {},
    handleResetEditChanges: () => {},
    handleSelectPrimaryImage: () => {},
    handleSetDescriptionInputValue: () => {},
    imageUrlDraft: '',
    isCreatingCategory: false,
    isDeletingCategory: false,
    isEditDirty: true,
    isSaving: false,
    isUploadingImages: false,
    loading: false,
    openCatalogMenu: null,
    selectedEditCategoryLabel: 'Tech',
    setEditCategoryDraft: () => {},
    setImageUrlDraft: () => {},
    setOpenCatalogMenu: () => {},
    setSelectedPreviewImage: () => {},
  })

  assert.equal(result.editingProduct.id, 4)
  assert.equal(result.isEditDirty, true)
  assert.equal(result.selectedEditCategoryLabel, 'Tech')
})

test('build sidebar and delete props pass through key selection dependencies', () => {
  const sidebar = buildProductSelectionSidebarProps({
    activeSidebarItemKey: 'product:9',
    dirtyCreateDrafts: [{ id: 'd2' }],
    dirtySelectedProductsForSidebar: [{ id: 9 }],
    getProductImage: () => 'img',
    handleClearPendingSelection: () => {},
    handleRemoveCreateDraft: () => {},
    handleRemovePendingSelectedProduct: () => {},
    handleSaveDirtySelection: () => {},
    handleSelectCreateDraft: () => {},
    isSavingDirtySelection: false,
    navigate: () => {},
    openUnsavedSelectionModal: () => {},
    selectionSummary: { totalCount: 2 },
    truncateLabel: (value) => value,
    untouchedCreateDrafts: [{ id: 'd1' }],
    untouchedSelectedProductsForSidebar: [{ id: 3 }],
  })
  const deletePanel = buildProductDeletePanelProps({
    guardedNavigate: () => {},
    isDeletingProducts: false,
    openDeleteProductsModal: () => {},
    productsById: new Map(),
    selectedProductIds: [1, 2],
    truncateLabel: (value) => value,
  })

  assert.equal(sidebar.selectionSummary.totalCount, 2)
  assert.equal(sidebar.isSavingDirtySelection, false)
  assert.equal(sidebar.activeSidebarItemKey, 'product:9')
  assert.deepEqual(deletePanel.selectedProductIds, [1, 2])
})
