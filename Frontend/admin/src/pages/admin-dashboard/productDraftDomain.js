import { EMPTY_PRODUCT_FORM_SNAPSHOT_JSON } from './constants.js'
import { getProductFormValidationMessage } from './feedbackMessages.js'
import { buildProductMutationPayload } from './productMutationState.js'
import { buildEditFormSnapshot } from './utils.js'

export function buildProductSnapshot(form = {}, descriptionOverride = undefined) {
  return JSON.stringify(buildEditFormSnapshot({
    ...(form || {}),
    description: descriptionOverride ?? form?.description ?? '',
  }))
}

export function isEditDraftDirty(draft) {
  if (!draft?.initialForm || !draft?.form) return false
  return buildProductSnapshot(draft.form, draft.descriptionInputValue) !== buildProductSnapshot(draft.initialForm)
}

export function collectDirtyEditDraftEntries(editDraftsByProductId = {}) {
  return Object.entries(editDraftsByProductId).filter(([, draft]) => isEditDraftDirty(draft))
}

export function collectDirtyEditDraftProductIds(editDraftsByProductId = {}) {
  return collectDirtyEditDraftEntries(editDraftsByProductId)
    .map(([productId]) => Number(productId))
    .filter((productId) => Number.isFinite(productId))
}

export function isCreateDraftDirty(draft, savedCreateDraftIds = []) {
  if (!draft?.id || savedCreateDraftIds.includes(draft.id)) return false
  return buildProductSnapshot(draft.form) !== EMPTY_PRODUCT_FORM_SNAPSHOT_JSON
}

export function collectDirtyCreateDrafts(createDrafts = [], savedCreateDraftIds = []) {
  return createDrafts.filter((draft) => isCreateDraftDirty(draft, savedCreateDraftIds))
}

export function getProductValidationMessageForForm(form = {}, options = {}) {
  return getProductFormValidationMessage({
    nom: form.nom,
    description: options.description ?? form.description,
    prixAchat: form.prixAchat,
    prix: form.prix,
    promotionPercent: form.promotionPercent,
    stock: form.stock,
    categorieId: form.categorieId,
    imageUrl: form.imageUrl,
    imageUrlsText: form.imageUrlsText,
  })
}

export function resolveProductCategory(categories = [], categorieId) {
  return categories.find((category) => String(category?.id) === String(categorieId)) || null
}

export function buildDraftMutationPayload({
  categories = [],
  description,
  draft = null,
  form = null,
  productId = undefined,
}) {
  const sourceForm = form || draft?.form || {}

  return buildProductMutationPayload({
    category: resolveProductCategory(categories, sourceForm.categorieId),
    description,
    form: sourceForm,
    productId,
  })
}

export function buildProductDraftsById({
  createDrafts = [],
  editDraftsByProductId = {},
  savedCreateDraftIds = [],
}) {
  const draftsById = {}

  createDrafts.forEach((draft) => {
    if (!draft?.id) return
    draftsById[`create:${draft.id}`] = {
      dirty: isCreateDraftDirty(draft, savedCreateDraftIds),
      kind: 'create',
      value: draft,
    }
  })

  Object.entries(editDraftsByProductId || {}).forEach(([productId, draft]) => {
    draftsById[`edit:${productId}`] = {
      dirty: isEditDraftDirty(draft),
      kind: 'edit',
      value: draft,
    }
  })

  return draftsById
}

export function buildProductWorkspaceModel({
  products = [],
  selectedProductIds = [],
  createDrafts = [],
  editDraftsByProductId = {},
  savedCreateDraftIds = [],
  uiState = {},
}) {
  return {
    draftsById: buildProductDraftsById({
      createDrafts,
      editDraftsByProductId,
      savedCreateDraftIds,
    }),
    products,
    selectedIds: Array.from(new Set(
      (Array.isArray(selectedProductIds) ? selectedProductIds : [])
        .map((productId) => Number(productId))
        .filter((productId) => Number.isFinite(productId))
    )),
    uiState,
  }
}
