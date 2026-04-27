import { buildProductFormState, normalizePersistedProduct } from './productMutationState.js'
import { buildEditFormSnapshot, getProductImage, isPromotionEnabled } from './utils.js'

export function buildLoadedEditWorkspaceState({
  apiProduct,
  draft,
  listProduct,
}) {
  const sourceProduct = apiProduct || listProduct || {}
  const normalizedProduct = normalizePersistedProduct(sourceProduct, {
    prixAchat: listProduct?.prixAchat,
    prix: listProduct?.prix,
    promotionActive: isPromotionEnabled(sourceProduct?.promotionPercent != null ? sourceProduct.promotionPercent : listProduct?.promotionPercent),
    promotionPercent: listProduct?.promotionPercent,
    stock: listProduct?.stock,
    rating: sourceProduct?.rating ?? listProduct?.rating,
  })
  const nextEditForm = buildProductFormState(normalizedProduct)
  const fallbackPreviewImage = nextEditForm.imageUrl || getProductImage(normalizedProduct)

  if (draft) {
    const draftForm = draft.form || nextEditForm
    return {
      editingProduct: normalizedProduct,
      editForm: draftForm,
      editCategoryDraft: draft.editCategoryDraft != null
        ? String(draft.editCategoryDraft)
        : (normalizedProduct?.categorie?.libelle ? String(normalizedProduct.categorie.libelle) : ''),
      initialEditForm: buildEditFormSnapshot(draft.initialForm || nextEditForm),
      descriptionInputValue: draft.descriptionInputValue != null
        ? String(draft.descriptionInputValue)
        : String(draftForm.description || ''),
      selectedPreviewImage: draft.selectedPreviewImage || fallbackPreviewImage,
    }
  }

  return {
    editingProduct: normalizedProduct,
    editForm: nextEditForm,
    editCategoryDraft: normalizedProduct?.categorie?.libelle ? String(normalizedProduct.categorie.libelle) : '',
    initialEditForm: buildEditFormSnapshot(nextEditForm),
    descriptionInputValue: String(nextEditForm.description || ''),
    selectedPreviewImage: fallbackPreviewImage,
  }
}
