import { MAX_PRODUCT_IMAGES } from './constants.js'

export const PRODUCT_IMAGE_DIMENSION_RULE = {
  minWidth: 1200,
  minHeight: 900,
  maxWidth: 2400,
  maxHeight: 1800,
}

export const ADMIN_ERROR_MESSAGES = {
  loadOverview: 'Impossible de charger les donnees. Reessayez.',
  loadProducts: 'Impossible de charger les produits.',
  loadProduct: 'Impossible de charger le produit.',
  productNotFound: 'Produit introuvable.',
  saveProduct: "Impossible d'enregistrer le produit.",
  createProduct: 'Impossible de creer le produit.',
  createProducts: 'Impossible de creer les produits.',
  deleteProducts: 'Impossible de supprimer les produits selectionnes.',
  updateProductPublishStatus: "Impossible de modifier l'etat de mise en ligne des produits selectionnes.",
  selectProduct: 'Selectionnez au moins un produit.',
  completeRequiredProductFields: "Completez les champs obligatoires avant de continuer.",
  categoryLabelRequired: 'Saisissez un libelle de categorie.',
  categoryNameRequired: 'Saisissez un nom de categorie avant de l ajouter.',
  selectCategory: 'Selectionnez au moins une categorie.',
  selectCategoriesForMerge: 'Selectionnez au moins deux categories a fusionner.',
  updateCategory: 'Impossible de modifier la categorie.',
  createCategory: 'Impossible de creer la categorie.',
  deleteCategory: 'Impossible de supprimer les categories selectionnees.',
  mergeCategory: 'Impossible de fusionner les categories selectionnees.',
  loadCategories: 'Impossible de charger les categories.',
  loadClients: 'Impossible de charger les clients.',
  updateClientAccountStatus: 'Impossible de modifier le statut du compte.',
  updateClientAccountStatuses: 'Impossible de modifier le statut des comptes selectionnes.',
  uploadImages: "Impossible d'envoyer les images.",
}

export const ADMIN_INFO_MESSAGES = {
  productSaved: 'Produit enregistre avec succes.',
  productCreated: 'Produit cree avec succes.',
  productsCreated: 'Produits crees avec succes.',
  productsDeleted: 'Produits supprimes avec succes.',
  productsPublished: 'Produits mis en ligne avec succes.',
  productsUnpublished: 'Produits retires de la mise en ligne avec succes.',
  categoryCreated: 'Categorie creee avec succes.',
  categoryUpdated: 'Categorie mise a jour avec succes.',
  categoriesDeleted: 'Categories supprimees avec succes.',
  categoriesMerged: 'Categories fusionnees avec succes.',
  clientsActivated: 'Comptes clients reactives avec succes.',
  clientsDeactivated: 'Comptes clients desactives avec succes.',
  imageAdded: 'Image ajoutee avec succes.',
  imagesAdded: 'Images ajoutees avec succes.',
  draftsReset: 'Modifications reinitialisees.',
  filtersReset: 'Filtres reinitialises.',
}

export function productRequiredFieldsMessage(index = null) {
  if (Number.isFinite(index) && index > 0) {
    return `Completez le nom, le prix d'achat, le prix de vente et le stock du produit ${index} avant de creer les brouillons.`
  }

  return ADMIN_ERROR_MESSAGES.completeRequiredProductFields
}

export function imageLimitMessage(limit) {
  return `Un produit ne peut pas avoir plus de ${limit} images.`
}

export function productImageDimensionMessage() {
  const { minWidth, minHeight, maxWidth, maxHeight } = PRODUCT_IMAGE_DIMENSION_RULE
  return `L'image doit mesurer entre ${minWidth} x ${minHeight} px et ${maxWidth} x ${maxHeight} px.`
}

export function productImageFileTypeMessage() {
  return "Le fichier doit etre une image au format JPG, PNG, WEBP ou GIF."
}

export function productImageInvalidFileMessage() {
  return "Le fichier selectionne n'est pas une image valide."
}

export function productImageUrlMessage() {
  return "L'image doit etre une URL valide commencant par http:// ou https://."
}

export function partialImageUploadMessage(remainingSlots, limit) {
  return `Seulement ${remainingSlots} image(s) ont ete ajoutees. Maximum ${limit} images par produit.`
}

export function normalizeProductValidationError(errorMessage, fallbackMessage) {
  const message = String(errorMessage || '').trim()
  if (!message) return fallbackMessage

  const normalizedMessage = message.toLowerCase()

  if (normalizedMessage.includes('propertypath=prixachat')) {
    return "Le prix d'achat est obligatoire et doit etre positif."
  }

  if (normalizedMessage.includes('propertypath=prix')) {
    return 'Le prix de vente est obligatoire et doit etre positif.'
  }

  if (normalizedMessage.includes('propertypath=stock')) {
    return 'Le stock est obligatoire et doit etre positif ou nul.'
  }

  if (normalizedMessage.includes('propertypath=nom')) {
    return 'Le nom du produit est obligatoire.'
  }

  if (normalizedMessage.includes('propertypath=description')) {
    return 'La description du produit est obligatoire.'
  }

  if (
    normalizedMessage.includes('propertypath=categorie')
    || normalizedMessage.includes('propertypath=categorieid')
    || normalizedMessage.includes('propertypath=categoryselectionvalid')
  ) {
    return 'Selectionnez une categorie valide.'
  }

  if (normalizedMessage.includes('propertypath=imageurls')) {
    return 'Ajoutez au moins une photo du produit.'
  }

  if (normalizedMessage.includes('prix positif obligatoire')) {
    return 'Le prix de vente est obligatoire et doit etre positif.'
  }

  if (normalizedMessage.includes("prix d'achat")) {
    return "Le prix d'achat est obligatoire et doit etre positif."
  }

  if (normalizedMessage.includes('description obligatoire')) {
    return 'La description du produit est obligatoire.'
  }

  if (normalizedMessage.includes('categorie obligatoire')) {
    return 'Selectionnez une categorie valide.'
  }

  if (
    normalizedMessage.includes('au moins une image')
    || normalizedMessage.includes('une photo du produit')
  ) {
    return 'Ajoutez au moins une photo du produit.'
  }

  if (normalizedMessage.includes('stock')) {
    return 'Le stock est obligatoire et doit etre positif ou nul.'
  }

  return message || fallbackMessage
}

export function normalizeUploadError(errorMessage, fallbackMessage) {
  const message = String(errorMessage || '').trim()
  if (!message) return fallbackMessage

  const normalizedMessage = message.toLowerCase()

  if (
    normalizedMessage.includes('maximum upload size exceeded')
    || normalizedMessage.includes('max upload size exceeded')
    || normalizedMessage.includes('size exceeded')
    || normalizedMessage.includes('file too large')
  ) {
    return productImageDimensionMessage()
  }

  if (
    normalizedMessage.includes("dimensions d'image invalides")
    || normalizedMessage.includes("dimensions d image invalides")
  ) {
    return productImageDimensionMessage()
  }

  if (
    normalizedMessage.includes("format d'image non supporte")
    || normalizedMessage.includes('format d image non supporte')
    || normalizedMessage.includes('unsupported media type')
  ) {
    return productImageFileTypeMessage()
  }

  if (
    normalizedMessage.includes('impossible de lire les dimensions')
    || normalizedMessage.includes('fichier image invalide')
    || normalizedMessage.includes('aucun fichier image')
  ) {
    return productImageInvalidFileMessage()
  }

  return message || fallbackMessage
}

export function getProductFormValidationMessage({
  nom,
  description,
  prixAchat,
  prix,
  promotionPercent,
  stock,
  categorieId,
  imageUrlsText,
}) {
  const missingFields = []

  if (!String(nom || '').trim()) missingFields.push('nom')
  if (!String(description || '').trim()) missingFields.push('description')
  if (String(prixAchat || '').trim() === '') missingFields.push('prixAchat')
  if (String(prix || '').trim() === '') missingFields.push('prix')
  if (String(stock || '').trim() === '') missingFields.push('stock')
  if (!String(categorieId || '').trim()) missingFields.push('categorieId')
  if (normalizeImageUrls(imageUrlsText).length === 0) missingFields.push('imageUrlsText')

  if (missingFields.length > 1) {
    return 'Tous les champs doivent etre remplis.'
  }

  if (missingFields.includes('nom')) return 'Le nom du produit est obligatoire.'
  if (missingFields.includes('description')) return 'La description du produit est obligatoire.'
  if (missingFields.includes('prixAchat')) return "Le prix d'achat est obligatoire."
  if (missingFields.includes('prix')) return 'Le prix de vente est obligatoire.'
  if (missingFields.includes('stock')) return 'Le stock est obligatoire.'
  if (missingFields.includes('categorieId')) return 'La categorie est obligatoire.'
  if (missingFields.includes('imageUrlsText')) return 'Ajoutez au moins une photo du produit.'

  if (normalizeImageUrls(imageUrlsText).length > MAX_PRODUCT_IMAGES) {
    return imageLimitMessage(MAX_PRODUCT_IMAGES)
  }

  const purchasePrice = Number(prixAchat)
  if (!Number.isFinite(purchasePrice) || purchasePrice < 0) {
    return "Le prix d'achat doit etre positif ou nul."
  }

  const salePrice = Number(prix)
  if (!Number.isFinite(salePrice) || salePrice <= 0) {
    return 'Le prix de vente doit etre positif.'
  }

  if (salePrice < purchasePrice) {
    return "Le prix de vente doit etre superieur ou egal au prix d'achat."
  }

  if (String(promotionPercent || '').trim() !== '') {
    const promotionValue = Number(promotionPercent)
    if (!Number.isFinite(promotionValue) || promotionValue < 0 || promotionValue > 100) {
      return 'La reduction doit etre comprise entre 0 et 100 %.'
    }
  }

  const stockValue = Number(stock)
  if (!Number.isFinite(stockValue) || stockValue < 0) {
    return 'Le stock doit etre positif ou nul.'
  }

  return ''
}

function normalizeImageUrls(imageUrlsText) {
  return String(imageUrlsText || '')
    .split('\n')
    .map((value) => value.trim())
    .filter(Boolean)
}
