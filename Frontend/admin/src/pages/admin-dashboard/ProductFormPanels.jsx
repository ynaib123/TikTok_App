import { Fragment, memo } from 'react'
import {
  ProductEditLivePreview,
  ProductFormCommerceMediaSection,
  ProductFormIdentitySection,
} from './ProductShared'
import {
  buildCreateFormPresentation,
  buildProductCommerceMetrics,
} from './productPresentationState.js'
import { getProductImage, isPromotionEnabled } from './utils'

function ProductDirtyStatus({ isDirty }) {
  if (!isDirty) {
    return null
  }

  return (
    <span className="admin-product-dirty-badge admin-product-dirty-badge-inline">
      Modifications non enregistrees
    </span>
  )
}

function ProductEditPanelComponent({
  descriptionInputValue,
  editCategoryDraft,
  editDirtyFields,
  editForm,
  editImageUrls,
  editPreviewImage,
  editingProduct,
  filteredEditCategories,
  handleAddImageUrl,
  handleCreateEditCategory,
  handleEditFieldChange,
  handleImagesUpload,
  handleProductSave,
  handleRemoveImage,
  handleResetEditChanges,
  handleSelectPrimaryImage,
  handleSetDescriptionInputValue,
  imageUrlDraft,
  isCreatingCategory,
  isDeletingCategory,
  isEditDirty,
  isSaving,
  isUploadingImages,
  loading,
  openCatalogMenu,
  selectedEditCategoryLabel,
  handleSetEditPreviewImage,
  setEditCategoryDraft,
  setImageUrlDraft,
  setOpenCatalogMenu,
}) {
  if (loading) {
    return null
  }

  if (!loading && !editingProduct) {
    return null
  }

  const editPromotionActive = isPromotionEnabled(editForm.promotionPercent)
  const editMetrics = buildProductCommerceMetrics({
    price: editForm.prix,
    promotionActive: editPromotionActive,
    promotionPercent: editForm.promotionPercent,
    purchasePrice: editForm.prixAchat,
    stock: editForm.stock,
  })
  return (
    <Fragment>
      <section id="product-details" className="admin-product-edit-layout admin-product-edit-layout-single">
        <form
          id="product-edit-form"
          className="admin-product-create-form-layout"
          onSubmit={handleProductSave}
          autoComplete="off"
          noValidate
        >
          <article className="admin-console-panel admin-product-edit-main-panel admin-product-create-main-panel">
            <div className="admin-console-panel-head">
              <div className="admin-product-panel-head-main">
                <p className="admin-console-panel-kicker">Edition</p>
              </div>
              <div className="admin-product-panel-head-meta">
                <ProductDirtyStatus isDirty={isEditDirty} />
              </div>
            </div>

            <ProductFormIdentitySection
              form={editForm}
              dirtyFields={editDirtyFields}
              categoryDraft={editCategoryDraft}
              onCategoryDraftChange={(value) => {
                setEditCategoryDraft(value)
                setOpenCatalogMenu('edit-category')
              }}
              onCategoryFocus={() => setOpenCatalogMenu('edit-category')}
              onCategoryKeyDown={(event) => {
                if (event.key === 'ArrowDown') {
                  event.preventDefault()
                  setOpenCatalogMenu('edit-category')
                  return
                }
                if (event.key !== 'Enter') return
                event.preventDefault()
                void handleCreateEditCategory()
              }}
              onCreateCategory={handleCreateEditCategory}
              isCreatingCategory={isCreatingCategory}
              isDeletingCategory={isDeletingCategory}
              selectedCategoryLabel={selectedEditCategoryLabel}
              categoryMenuOpen={openCatalogMenu === 'edit-category'}
              filteredCategories={filteredEditCategories}
              onSelectCategory={(category) => {
                handleEditFieldChange('categorieId', String(category.id))
                setEditCategoryDraft(String(category.libelle || ''))
                setOpenCatalogMenu(null)
              }}
              onClearCategory={() => {
                handleEditFieldChange('categorieId', '')
                setEditCategoryDraft('')
                setOpenCatalogMenu(null)
              }}
              descriptionValue={descriptionInputValue}
              onDescriptionChange={handleSetDescriptionInputValue}
              onFieldChange={handleEditFieldChange}
            />
          </article>

          <ProductEditLivePreview
            productId={editingProduct.id}
            previewImage={editPreviewImage}
            productName={editForm.nom || editingProduct.nom}
            categoryLabel={selectedEditCategoryLabel}
            priceValue={editMetrics.currentPrice}
            originalPriceValue={editForm.prix}
            promotionActive={editPromotionActive}
            rating={editForm.rating}
            stockValue={editForm.stock}
            isPublished={editingProduct?.published !== false}
            isDirty={isEditDirty}
            isSaving={isSaving}
            onReset={handleResetEditChanges}
            previewImageUrls={editImageUrls}
          />

          <article className="admin-console-panel admin-product-create-secondary-panel">
            <ProductFormCommerceMediaSection
              form={editForm}
              dirtyFields={editDirtyFields}
              categoryDraft={editCategoryDraft}
              onCategoryDraftChange={setEditCategoryDraft}
              onCategoryFocus={() => setOpenCatalogMenu('edit-category')}
              onCategoryKeyDown={() => {}}
              onCreateCategory={handleCreateEditCategory}
              isCreatingCategory={isCreatingCategory}
              isDeletingCategory={isDeletingCategory}
              selectedCategoryLabel={selectedEditCategoryLabel}
              categoryMenuOpen={false}
              filteredCategories={filteredEditCategories}
              onSelectCategory={() => {}}
              onClearCategory={() => {}}
              descriptionValue={descriptionInputValue}
              onDescriptionChange={handleSetDescriptionInputValue}
              currentPrice={editMetrics.currentPrice}
              promotionActive={editPromotionActive}
              marginValue={editMetrics.marginValue}
              stockCostValue={editMetrics.stockCostValue}
              stockSaleValue={editMetrics.stockSaleValue}
              onFieldChange={handleEditFieldChange}
              imageUrlDraft={imageUrlDraft}
              onImageUrlDraftChange={setImageUrlDraft}
              onAddImageUrl={handleAddImageUrl}
              isUploadingImages={isUploadingImages}
              onImagesUpload={handleImagesUpload}
              imageUrls={editImageUrls}
              selectedImageUrl={editPreviewImage}
              onSelectPreviewImage={handleSetEditPreviewImage}
              onSelectPrimaryImage={handleSelectPrimaryImage}
              onRemoveImage={handleRemoveImage}
              showPurchasePriceInput
            />
          </article>
        </form>
      </section>
    </Fragment>
  )
}

function ProductCreatePanelComponent({
  activeCreateDraft,
  createCategoryDraft,
  createDirtyFields,
  createForm,
  createImageUrls,
  createImageUrlDraft,
  createPromotionActive,
  createPreviewPrice,
  filteredCreateCategories,
  handleAddCreateImageUrl,
  handleCreateFieldChange,
  handleCreateImagesUpload,
  handleCreateProductCategory,
  handleProductCreate,
  handleRemoveCreateImage,
  handleResetCreateChanges,
  handleSelectCreatePrimaryImage,
  isCreateDirty,
  isCreatingCategory,
  isCreatingProduct,
  isDeletingCategory,
  isUploadingCreateImages,
  openCatalogMenu,
  selectedCreateCategoryLabel,
  selectedCreatePreviewImage,
  handleSetCreatePreviewImage,
  setCreateCategoryDraft,
  setCreateImageUrlDraft,
  setOpenCatalogMenu,
}) {
  if (!activeCreateDraft) {
    return <div className="admin-console-empty">Chargement des brouillons...</div>
  }

  const previewImage = selectedCreatePreviewImage || createImageUrls[0] || getProductImage(null)
  const createPresentation = buildCreateFormPresentation(createForm)
  return (
    <Fragment>
      <section id="add-products" className="admin-product-edit-layout admin-product-edit-layout-single admin-product-create-layout">
        <form
          id="product-create-form"
          className="admin-product-create-form-layout"
          onSubmit={handleProductCreate}
          autoComplete="off"
          noValidate
        >
          <article className="admin-console-panel admin-product-edit-main-panel admin-product-create-main-panel">
            <div className="admin-console-panel-head">
              <div className="admin-product-panel-head-main">
                <p className="admin-console-panel-kicker">Creation</p>
              </div>
              <div className="admin-product-panel-head-meta">
                <ProductDirtyStatus isDirty={isCreateDirty} />
              </div>
            </div>

            <ProductFormIdentitySection
              form={createForm}
              dirtyFields={createDirtyFields}
              categoryDraft={createCategoryDraft}
              onCategoryDraftChange={(value) => {
                setCreateCategoryDraft(value)
                setOpenCatalogMenu('create-category')
              }}
              onCategoryFocus={() => setOpenCatalogMenu('create-category')}
              onCategoryKeyDown={(event) => {
                if (event.key === 'ArrowDown') {
                  event.preventDefault()
                  setOpenCatalogMenu('create-category')
                  return
                }
                if (event.key !== 'Enter') return
                event.preventDefault()
                void handleCreateProductCategory()
              }}
              onCreateCategory={handleCreateProductCategory}
              isCreatingCategory={isCreatingCategory}
              isDeletingCategory={isDeletingCategory}
              selectedCategoryLabel={selectedCreateCategoryLabel}
              categoryMenuOpen={openCatalogMenu === 'create-category'}
              filteredCategories={filteredCreateCategories}
              onSelectCategory={(category) => {
                handleCreateFieldChange('categorieId', String(category.id))
                setCreateCategoryDraft(String(category.libelle || ''))
                setOpenCatalogMenu(null)
              }}
              onClearCategory={() => {
                handleCreateFieldChange('categorieId', '')
                setCreateCategoryDraft('')
                setOpenCatalogMenu(null)
              }}
              descriptionValue={createForm.description}
              onDescriptionChange={(value) => handleCreateFieldChange('description', value)}
              onFieldChange={handleCreateFieldChange}
            />
          </article>

          <ProductEditLivePreview
            productId={activeCreateDraft?.persistedProductId || null}
            previewImage={previewImage}
            previewImageUrls={createImageUrls}
            productName={createForm.nom}
            categoryLabel={selectedCreateCategoryLabel}
            priceValue={createPreviewPrice}
            originalPriceValue={createForm.prix}
            promotionActive={createPromotionActive}
            rating={createForm.rating}
            stockValue={createForm.stock}
            isDirty={isCreateDirty}
            isSaving={isCreatingProduct}
            onReset={handleResetCreateChanges}
            formId="product-create-form"
            submitLabel="Creer"
            submitBusyLabel="Creation en cours"
          />

          <article className="admin-console-panel admin-product-create-secondary-panel">
            <ProductFormCommerceMediaSection
              form={createForm}
              dirtyFields={createDirtyFields}
              categoryDraft={createCategoryDraft}
              onCategoryDraftChange={setCreateCategoryDraft}
              onCategoryFocus={() => setOpenCatalogMenu('create-category')}
              onCategoryKeyDown={() => {}}
              onCreateCategory={handleCreateProductCategory}
              isCreatingCategory={isCreatingCategory}
              isDeletingCategory={isDeletingCategory}
              selectedCategoryLabel={selectedCreateCategoryLabel}
              categoryMenuOpen={false}
              filteredCategories={filteredCreateCategories}
              onSelectCategory={() => {}}
              onClearCategory={() => {}}
              descriptionValue={createForm.description}
              onDescriptionChange={(value) => handleCreateFieldChange('description', value)}
              currentPrice={createPresentation.currentPrice}
              promotionActive={createPresentation.promotionActive}
              marginValue={createPresentation.marginValue}
              stockCostValue={createPresentation.stockCostValue}
              stockSaleValue={createPresentation.stockSaleValue}
              onFieldChange={handleCreateFieldChange}
              imageUrlDraft={createImageUrlDraft}
              onImageUrlDraftChange={setCreateImageUrlDraft}
              onAddImageUrl={handleAddCreateImageUrl}
              isUploadingImages={isUploadingCreateImages}
              onImagesUpload={handleCreateImagesUpload}
              imageUrls={createImageUrls}
              selectedImageUrl={previewImage}
              onSelectPreviewImage={handleSetCreatePreviewImage}
              onSelectPrimaryImage={handleSelectCreatePrimaryImage}
              onRemoveImage={handleRemoveCreateImage}
              showPurchasePriceInput
            />
          </article>
        </form>
      </section>
    </Fragment>
  )
}

export const ProductEditPanel = memo(ProductEditPanelComponent)
export const ProductCreatePanel = memo(ProductCreatePanelComponent)
