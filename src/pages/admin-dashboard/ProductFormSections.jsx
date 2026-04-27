import { memo, useState } from 'react'
import { formatMoney } from './utils'
import { ActionIcon } from './ProductPreviewShared'

export function ProductFormFields({
  form,
  dirtyFields,
  categoryDraft,
  onCategoryDraftChange,
  onCategoryFocus,
  onCategoryKeyDown,
  onCreateCategory,
  isCreatingCategory,
  isDeletingCategory,
  selectedCategoryLabel,
  categoryMenuOpen,
  filteredCategories,
  onSelectCategory,
  onClearCategory,
  descriptionValue,
  onDescriptionChange,
  currentPrice,
  promotionActive,
  marginValue,
  stockCostValue,
  stockSaleValue,
  onFieldChange,
  imageUrlDraft,
  onImageUrlDraftChange,
  onAddImageUrl,
  isUploadingImages,
  onImagesUpload,
  imageUrls,
  selectedImageUrl,
  onSelectPreviewImage,
  onSelectPrimaryImage,
  onRemoveImage,
  sections = 'all',
  showPurchasePriceInput = false,
}) {
  const isCategoryBusy = isCreatingCategory || isDeletingCategory
  const activeImageUrl = selectedImageUrl || imageUrls[0] || ''
  const primaryImageUrl = String(form?.imageUrl || imageUrls[0] || '')
  const [selectedImageUrls, setSelectedImageUrls] = useState([])
  const normalizedSelectedImageUrls = selectedImageUrls.filter((url) => imageUrls.includes(url))
  const selectedImageCount = normalizedSelectedImageUrls.length
  const hasSelectedImages = selectedImageCount > 0

  const handleToggleImageSelection = (imageUrl) => {
    setSelectedImageUrls((prev) => (
      prev.includes(imageUrl)
        ? prev.filter((value) => value !== imageUrl)
        : [...prev, imageUrl]
    ))
  }

  const handleRemoveSelectedImages = () => {
    const urlsToRemove = hasSelectedImages ? normalizedSelectedImageUrls : []
    if (urlsToRemove.length === 0) return
    urlsToRemove.forEach((imageUrl) => onRemoveImage(imageUrl))
    setSelectedImageUrls([])
  }

  const identitySection = (
    <div className="admin-product-identity-fields">
      <div className="admin-product-identity-row">
        <label className={`admin-product-field ${dirtyFields.nom ? 'is-dirty' : ''}`}>
          <span>Nom</span>
          <input id="product-name" name="productName" type="text" autoComplete="new-password" autoCorrect="off" autoCapitalize="off" spellCheck={false} value={form.nom} onChange={(event) => onFieldChange('nom', event.target.value)} />
        </label>
        <label className={`admin-product-field ${dirtyFields.categorieId ? 'is-dirty' : ''}`}>
          <span>Categorie</span>
          <div className="admin-product-toolbar-select admin-product-field-dropdown">
            <div className="admin-product-inline-input admin-product-inline-input-single-action">
              <input id="product-category" name="productCategory" type="text" autoComplete="new-password" autoCorrect="off" autoCapitalize="off" spellCheck={false} value={categoryDraft} onFocus={onCategoryFocus} onChange={(event) => onCategoryDraftChange(event.target.value)} onKeyDown={onCategoryKeyDown} placeholder="Choisir ou ajouter une categorie" maxLength={100} disabled={isCategoryBusy} aria-label={`Choisir ou ajouter une categorie, valeur actuelle ${selectedCategoryLabel}`} />
              <button type="button" className="admin-product-icon-btn admin-product-category-add-btn" onClick={() => void onCreateCategory()} disabled={!categoryDraft.trim() || isCategoryBusy} aria-label="Ajouter la categorie" title={isCreatingCategory ? 'Creation...' : 'Ajouter la categorie'}>
                <span aria-hidden="true">{isCreatingCategory ? '…' : '+'}</span>
              </button>
            </div>
            {categoryMenuOpen && (
              <div className="admin-product-toolbar-menu" role="listbox" aria-label="Choisir une categorie">
                <button type="button" className={`admin-product-toolbar-option ${form.categorieId ? '' : 'is-selected'}`} onClick={onClearCategory}>
                  <span>Sans categorie</span>
                  {!form.categorieId ? <strong>•</strong> : null}
                </button>
                {filteredCategories.map((category) => (
                  <button key={category.id} type="button" className={`admin-product-toolbar-option ${String(form.categorieId) === String(category.id) ? 'is-selected' : ''}`} onClick={() => onSelectCategory(category)}>
                    <span>{category.libelle}</span>
                    {String(form.categorieId) === String(category.id) ? <strong>•</strong> : null}
                  </button>
                ))}
                {filteredCategories.length === 0 ? <div className="admin-product-toolbar-menu-empty">Aucune categorie trouvee. Utilisez `+` pour l ajouter.</div> : null}
              </div>
            )}
          </div>
        </label>
      </div>
      <label className={`admin-product-field ${dirtyFields.description ? 'is-dirty' : ''}`}>
        <span>Description</span>
        <textarea id="product-description" name="productDescription" rows="6" value={descriptionValue} onChange={(event) => onDescriptionChange(event.target.value)} />
      </label>
    </div>
  )

  const commerceSection = (
    <div className="admin-product-ops-fields">
      <div className="admin-product-ops-grid">
        <div className="admin-product-ops-group admin-product-ops-group-pricing">
          <div className="admin-product-ops-head">
            <span>Tarification</span>
            <div className="admin-product-price-stack">
              <strong>{formatMoney(currentPrice)}</strong>
              <span className={`admin-product-price-strike ${promotionActive ? '' : 'is-placeholder'}`}>{formatMoney(form.prix || 0)}</span>
            </div>
          </div>
          <div className="admin-product-stock-summary">
            {!showPurchasePriceInput ? <div className="admin-product-stock-summary-item"><span>Prix d'achat</span><strong>{formatMoney(form.prixAchat || 0)}</strong></div> : null}
          </div>
          <div className="admin-product-tarification-inline">
            {showPurchasePriceInput ? <label className={`admin-product-stock-adjust ${dirtyFields.prixAchat ? 'is-dirty' : ''}`}><span>Prix d'achat</span><div className="admin-product-stock-adjust-inline"><div className="admin-product-stock-adjust-row"><input id="product-purchase-price" name="productPurchasePrice" type="number" min="0" step="0.01" value={form.prixAchat} onChange={(event) => onFieldChange('prixAchat', event.target.value)} placeholder="Prix d'achat" /></div></div></label> : null}
            <div className="admin-product-stock-adjust"><span>Marge unitaire</span><div className="admin-product-stock-adjust-inline"><div className="admin-product-stock-adjust-row"><input type="text" value={formatMoney(marginValue)} readOnly aria-label="Marge unitaire" /></div></div></div>
            <label className={`admin-product-stock-adjust ${dirtyFields.prix ? 'is-dirty' : ''}`}><span>Prix de vente</span><div className="admin-product-stock-adjust-inline"><div className="admin-product-stock-adjust-row"><input id="product-sale-price" name="productSalePrice" type="number" min="0.01" step="0.01" value={form.prix} onChange={(event) => onFieldChange('prix', event.target.value)} placeholder="Prix de vente" /></div></div></label>
            <label className={`admin-product-stock-adjust ${dirtyFields.promotionPercent ? 'is-dirty' : ''}`}><span>Reduction promo (%)</span><div className="admin-product-stock-adjust-inline"><div className="admin-product-stock-adjust-row"><input id="product-promotion-percent" name="productPromotionPercent" type="number" min="0" max="100" step="0.01" value={form.promotionPercent} onChange={(event) => onFieldChange('promotionPercent', event.target.value)} placeholder="Laisser vide pour aucune promotion" /></div></div></label>
          </div>
        </div>

        <div className="admin-product-ops-group admin-product-ops-group-stock">
          <div className="admin-product-ops-head">
            <span>Stock</span>
            <strong>{Number(form.stock || 0)} unite(s)</strong>
          </div>
          <div className="admin-product-tarification-inline">
            <div className="admin-product-stock-adjust"><span>Cout stock</span><div className="admin-product-stock-adjust-inline"><div className="admin-product-stock-adjust-row"><input type="text" value={formatMoney(stockCostValue)} readOnly aria-label="Cout stock" /></div></div></div>
            <div className="admin-product-stock-adjust"><span>Valeur stock vente</span><div className="admin-product-stock-adjust-inline"><div className="admin-product-stock-adjust-row"><input type="text" value={formatMoney(stockSaleValue)} readOnly aria-label="Valeur stock vente" /></div></div></div>
            <label className={`admin-product-stock-adjust ${dirtyFields.stock ? 'is-dirty' : ''}`}><span>Stock</span><div className="admin-product-stock-adjust-inline"><div className="admin-product-stock-adjust-row"><input id="product-stock" name="productStock" type="number" step="1" min="0" value={form.stock} onChange={(event) => onFieldChange('stock', event.target.value)} placeholder="Stock" /></div></div></label>
          </div>
        </div>
      </div>
    </div>
  )

  const mediaSection = (
    <div className="admin-product-media-fields">
      <div className="admin-product-ops-grid admin-product-media-grid">
        <div className="admin-product-media-group">
          <div className="admin-product-ops-head">
            <span>Album photo</span>
            <strong>{imageUrls.length} image(s)</strong>
          </div>
          <div className="admin-product-image-list" aria-label="Liste des photos du produit">
            <div className={`admin-product-image-composer-row ${dirtyFields.imageUrlsText ? 'is-dirty' : ''}`}>
              <div className="admin-product-inline-input">
                <input id="product-image-url" name="productImageUrl" type="text" inputMode="url" autoComplete="off" autoCapitalize="off" autoCorrect="off" spellCheck={false} value={imageUrlDraft} onChange={(event) => onImageUrlDraftChange(event.target.value)} placeholder="https://image..." />
                <button type="button" className="admin-product-icon-btn" onClick={onAddImageUrl} disabled={!imageUrlDraft.trim()} aria-label="Ajouter l'URL" title="Ajouter l'URL"><ActionIcon><path d="M10 4.5v11" /><path d="M4.5 10h11" /></ActionIcon></button>
                <label className={`admin-product-icon-btn admin-product-upload-btn ${isUploadingImages ? 'is-busy' : ''}`} aria-label="Ajouter des images locales" title="Ajouter des images locales">
                  <input name="productImageUpload" type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple onChange={onImagesUpload} disabled={isUploadingImages} />
                  {isUploadingImages ? <ActionIcon><path d="M10 4.5v6.5" /><path d="M7.25 7.25 10 4.5l2.75 2.75" /><path d="M4.5 14.5h11" /></ActionIcon> : <ActionIcon><path d="M10 4.5v7" /><path d="M7.25 8.25 10 11l2.75-2.75" /><path d="M4.5 14.5h11" /></ActionIcon>}
                </label>
                <button
                  type="button"
                  className="admin-product-icon-btn admin-product-icon-btn-danger"
                  onClick={handleRemoveSelectedImages}
                  disabled={!hasSelectedImages}
                  aria-label={hasSelectedImages ? `Supprimer ${selectedImageCount} image(s) selectionnee(s)` : "Selectionnez au moins une image pour la supprimer"}
                  title={hasSelectedImages ? `Supprimer ${selectedImageCount} image(s) selectionnee(s)` : "Selectionnez au moins une image pour la supprimer"}
                >
                  <ActionIcon><path d="M5.5 6.5h9" /><path d="M8 6.5v-2h4v2" /><path d="M7 6.5v8" /><path d="M10 6.5v8" /><path d="M13 6.5v8" /><path d="M6.5 6.5 7 16h6l.5-9.5" /></ActionIcon>
                </button>
              </div>
            </div>

            {imageUrls.length > 0 ? imageUrls.map((url, index) => {
              const isPrimary = url === primaryImageUrl
              const isSelected = url === activeImageUrl
              const isChecked = normalizedSelectedImageUrls.includes(url)
              return (
                <div key={url} className={`admin-product-image-item ${isPrimary ? 'is-primary' : ''} ${isSelected ? 'is-selected' : ''}`}>
                  <div className="admin-product-image-card" role="button" tabIndex={0} onClick={() => handleToggleImageSelection(url)} onKeyDown={(event) => {
                    if (event.key !== 'Enter' && event.key !== ' ') return
                    event.preventDefault()
                    handleToggleImageSelection(url)
                  }}>
                    <label className="admin-product-select-checkbox admin-product-image-checkbox" aria-label={isChecked ? "Deselectionner l'image" : "Selectionner l'image"} onClick={(event) => event.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleImageSelection(url)}
                      />
                      <span aria-hidden="true" />
                    </label>
                    <div
                      className="admin-product-image-card-media"
                      onClick={(event) => {
                        event.stopPropagation()
                        onSelectPreviewImage(url)
                      }}
                    >
                      <img src={url} alt={`Image produit ${index + 1}`} />
                    </div>
                    <div className="admin-product-image-card-body">
                      <div className="admin-product-image-card-head">
                        <div className="admin-product-image-card-copy">
                          <strong>{isPrimary ? 'Image principale' : `Image ${index + 1}`}</strong>
                          <small>{isPrimary ? 'Photo mise en avant' : 'Photo de galerie'}</small>
                          <p className="admin-product-image-card-url">{url}</p>
                        </div>
                        <div className="admin-product-image-item-actions">
                          <button
                            type="button"
                            className={`admin-product-icon-btn admin-product-primary-toggle ${isPrimary ? 'is-active' : ''}`}
                            onClick={(event) => {
                              event.preventDefault()
                              event.stopPropagation()
                              if (isPrimary) return
                              onSelectPrimaryImage(url)
                            }}
                            disabled={isPrimary}
                            aria-label={isPrimary ? "Image principale active" : "Definir comme image principale"}
                            title={isPrimary ? "Image principale active" : "Definir comme image principale"}
                          >
                            <ActionIcon><path d="m10 3.5 1.95 3.95 4.36.63-3.16 3.08.74 4.34L10 13.45 6.1 15.5l.74-4.34-3.16-3.08 4.36-.63L10 3.5Z" /></ActionIcon>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            }) : null}
          </div>
        </div>

      </div>
    </div>
  )

  if (sections === 'secondary') {
    return <>{commerceSection}{mediaSection}</>
  }

  return <div className="admin-product-details-grid">{sections !== 'secondary' ? identitySection : null}{sections !== 'identity' ? commerceSection : null}{sections !== 'identity' ? mediaSection : null}</div>
}

export const ProductFormIdentitySection = memo(function ProductFormIdentitySection(props) {
  const { form, dirtyFields, categoryDraft, onCategoryDraftChange, onCategoryFocus, onCategoryKeyDown, onCreateCategory, isCreatingCategory, isDeletingCategory, selectedCategoryLabel, categoryMenuOpen, filteredCategories, onSelectCategory, onClearCategory, descriptionValue, onDescriptionChange } = props
  const isCategoryBusy = isCreatingCategory || isDeletingCategory

  return (
    <div className="admin-product-identity-fields">
      <div className="admin-product-identity-row">
        <label className={`admin-product-field ${dirtyFields.nom ? 'is-dirty' : ''}`}>
          <span>Nom</span>
          <input id="product-name" name="productName" type="text" value={form.nom} onChange={(event) => props.onFieldChange('nom', event.target.value)} />
        </label>
        <label className={`admin-product-field ${dirtyFields.categorieId ? 'is-dirty' : ''}`}>
          <span>Categorie</span>
          <div className="admin-product-toolbar-select admin-product-field-dropdown">
            <div className="admin-product-inline-input admin-product-inline-input-single-action">
              <input id="product-category" name="productCategory" type="text" value={categoryDraft} onFocus={onCategoryFocus} onChange={(event) => onCategoryDraftChange(event.target.value)} onKeyDown={onCategoryKeyDown} placeholder="Choisir ou ajouter une categorie" maxLength={100} disabled={isCategoryBusy} aria-label={`Choisir ou ajouter une categorie, valeur actuelle ${selectedCategoryLabel}`} />
              <button type="button" className="admin-product-icon-btn admin-product-category-add-btn" onClick={() => void onCreateCategory()} disabled={!categoryDraft.trim() || isCategoryBusy} aria-label="Ajouter la categorie" title={isCreatingCategory ? 'Creation...' : 'Ajouter la categorie'}>
                <span aria-hidden="true">{isCreatingCategory ? '…' : '+'}</span>
              </button>
            </div>
            {categoryMenuOpen && (
              <div className="admin-product-toolbar-menu" role="listbox" aria-label="Choisir une categorie">
                <button type="button" className={`admin-product-toolbar-option ${form.categorieId ? '' : 'is-selected'}`} onClick={onClearCategory}>
                  <span>Sans categorie</span>
                  {!form.categorieId ? <strong>•</strong> : null}
                </button>
                {filteredCategories.map((category) => (
                  <button key={category.id} type="button" className={`admin-product-toolbar-option ${String(form.categorieId) === String(category.id) ? 'is-selected' : ''}`} onClick={() => onSelectCategory(category)}>
                    <span>{category.libelle}</span>
                    {String(form.categorieId) === String(category.id) ? <strong>•</strong> : null}
                  </button>
                ))}
                {filteredCategories.length === 0 ? <div className="admin-product-toolbar-menu-empty">Aucune categorie trouvee. Utilisez `+` pour l ajouter.</div> : null}
              </div>
            )}
          </div>
        </label>
      </div>
      <label className={`admin-product-field ${dirtyFields.description ? 'is-dirty' : ''}`}>
        <span>Description</span>
        <textarea id="product-description" name="productDescription" rows="6" value={descriptionValue} onChange={(event) => onDescriptionChange(event.target.value)} />
      </label>
    </div>
  )
})

export const ProductFormCommerceMediaSection = memo(function ProductFormCommerceMediaSection(props) {
  return <ProductFormFields {...props} sections="secondary" />
})
