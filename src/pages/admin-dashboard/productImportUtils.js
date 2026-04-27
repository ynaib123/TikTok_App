import { EMPTY_PRODUCT_FORM, createProductDraft } from './constants.js'
import { normalizeImageUrlsText } from './utils.js'

const IMPORT_FIELD_ALIASES = {
  nom: ['nom', 'name', 'product', 'productname', 'producttitle', 'designation', 'titre'],
  description: ['description', 'details', 'detail', 'resume', 'summary'],
  categorie: ['categorie', 'category', 'categoryname', 'categorielibelle', 'categorylabel', 'categorieid', 'categoryid'],
  prixAchat: ['prixachat', 'prixachatht', 'cout', 'cost', 'purchaseprice', 'buyprice'],
  prix: ['prix', 'prixvente', 'price', 'saleprice', 'sellingprice'],
  promotionPercent: ['promotion', 'promotionpercent', 'promo', 'promopercent', 'discount', 'discountpercent', 'remise'],
  stock: ['stock', 'quantity', 'qty', 'quantite'],
  imageUrl: ['image', 'imageprincipale', 'mainimage', 'imageurl', 'cover', 'photo'],
  imageUrlsText: ['images', 'galerie', 'gallery', 'imageurls', 'imagegallery'],
}

function normalizeImportHeader(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}

function getImportedRowValue(row, aliases) {
  const normalizedAliasSet = new Set(aliases.map((alias) => normalizeImportHeader(alias)))

  for (const [key, value] of Object.entries(row || {})) {
    if (normalizedAliasSet.has(normalizeImportHeader(key))) {
      return value
    }
  }

  return ''
}

function normalizeImportCell(value) {
  if (value == null) return ''
  return String(value).trim()
}

function normalizeCategoryLabel(value) {
  return normalizeImportCell(value).toLowerCase()
}

function normalizeImportedImageList(primaryImage, galleryImages) {
  const combinedValue = [primaryImage, galleryImages]
    .map((value) => normalizeImportCell(value))
    .filter(Boolean)
    .join('\n')

  return normalizeImageUrlsText(
    combinedValue
      .replace(/[;,|]/g, '\n')
      .split('\n')
      .map((value) => value.trim())
      .filter(Boolean)
      .join('\n')
  )
}

export function resolveImportedCategoryId(rawValue, categories = []) {
  const normalizedValue = normalizeImportCell(rawValue)
  if (!normalizedValue) return ''

  const numericValue = Number(normalizedValue)
  if (Number.isFinite(numericValue)) {
    const matchingCategoryById = categories.find((category) => Number(category?.id) === numericValue)
    if (matchingCategoryById) return String(matchingCategoryById.id)
  }

  const lowerValue = normalizedValue.toLowerCase()
  const matchingCategoryByLabel = categories.find((category) => (
    String(category?.libelle || '').trim().toLowerCase() === lowerValue
  ))

  return matchingCategoryByLabel ? String(matchingCategoryByLabel.id) : ''
}

export function collectImportedCategoryLabels(rows = []) {
  const labels = []
  const seen = new Set()

  ;(Array.isArray(rows) ? rows : []).forEach((row) => {
    if (!row || typeof row !== 'object') return

    const rawValue = getImportedRowValue(row, IMPORT_FIELD_ALIASES.categorie)
    const normalizedValue = normalizeImportCell(rawValue)
    if (!normalizedValue) return

    const key = normalizeCategoryLabel(normalizedValue)
    if (!key || seen.has(key)) return

    seen.add(key)
    labels.push(normalizedValue)
  })

  return labels
}

export function buildImportedProductDrafts({ rows, categories = [], createDraft = createProductDraft }) {
  const normalizedRows = Array.isArray(rows) ? rows : []
  const drafts = []
  let skippedRowCount = 0

  normalizedRows.forEach((row) => {
    if (!row || typeof row !== 'object') {
      skippedRowCount += 1
      return
    }

    const nom = normalizeImportCell(getImportedRowValue(row, IMPORT_FIELD_ALIASES.nom))
    const description = normalizeImportCell(getImportedRowValue(row, IMPORT_FIELD_ALIASES.description))
    const categorieId = resolveImportedCategoryId(getImportedRowValue(row, IMPORT_FIELD_ALIASES.categorie), categories)
    const prixAchat = normalizeImportCell(getImportedRowValue(row, IMPORT_FIELD_ALIASES.prixAchat))
    const prix = normalizeImportCell(getImportedRowValue(row, IMPORT_FIELD_ALIASES.prix))
    const promotionPercent = normalizeImportCell(getImportedRowValue(row, IMPORT_FIELD_ALIASES.promotionPercent))
    const stock = normalizeImportCell(getImportedRowValue(row, IMPORT_FIELD_ALIASES.stock))
    const imageUrlsText = normalizeImportedImageList(
      getImportedRowValue(row, IMPORT_FIELD_ALIASES.imageUrl),
      getImportedRowValue(row, IMPORT_FIELD_ALIASES.imageUrlsText)
    )

    const hasMeaningfulContent = [
      nom,
      description,
      categorieId,
      prixAchat,
      prix,
      promotionPercent,
      stock,
      imageUrlsText,
    ].some(Boolean)

    if (!hasMeaningfulContent) {
      skippedRowCount += 1
      return
    }

    const imageList = imageUrlsText
      ? imageUrlsText.split('\n').map((value) => value.trim()).filter(Boolean)
      : []
    const primaryImage = imageList[0] || ''
    const draft = createDraft()

    draft.form = {
      ...EMPTY_PRODUCT_FORM,
      nom,
      description,
      imageUrl: primaryImage,
      imageUrlsText,
      prixAchat,
      prix,
      promotionActive: Number(promotionPercent || 0) > 0,
      promotionPercent,
      stock,
      categorieId,
    }
    draft.selectedPreviewImage = primaryImage
    draft.persistedProductId = null
    drafts.push(draft)
  })

  return {
    drafts,
    importedCount: drafts.length,
    skippedRowCount,
  }
}
