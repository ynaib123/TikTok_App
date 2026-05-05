import { MAX_PRODUCT_IMAGES } from './constants.js'

export const PRODUCT_IMAGE_DIMENSION_RULE = {
  minWidth: 1200,
  minHeight: 900,
  maxWidth: 2400,
  maxHeight: 1800,
}

export const ADMIN_ERROR_MESSAGES = {
  loadOverview: 'Impossible de charger les données. Réessayez.',
  loadProducts: 'Impossible de charger les produits.',
  loadProduct: 'Impossible de charger le produit.',
  productNotFound: 'Produit introuvable.',
  saveProduct: "Impossible d'enregistrer le produit.",
  createProduct: 'Impossible de créer le produit.',
  createProducts: 'Impossible de créer les produits.',
  deleteProducts: 'Impossible de supprimer les produits sélectionnés.',
  updateProductPublishStatus: "Impossible de modifier l'état de mise en ligne des produits sélectionnés.",
  selectProduct: 'Sélectionnez au moins un produit.',
  completeRequiredProductFields: "Complétez les champs obligatoires avant de continuer.",
  categoryLabelRequired: 'Saisissez un libellé de catégorie.',
  categoryNameRequired: 'Saisissez un nom de catégorie avant de l’ajouter.',
  selectCategory: 'Sélectionnez au moins une catégorie.',
  selectCategoriesForMerge: 'Sélectionnez au moins deux catégories à fusionner.',
  updateCategory: 'Impossible de modifier la catégorie.',
  createCategory: 'Impossible de créer la catégorie.',
  deleteCategory: 'Impossible de supprimer les catégories sélectionnées.',
  mergeCategory: 'Impossible de fusionner les catégories sélectionnées.',
  loadCategories: 'Impossible de charger les catégories.',
  loadClients: 'Impossible de charger les clients.',
  updateClientAccountStatus: 'Impossible de modifier le statut du compte.',
  updateClientAccountStatuses: 'Impossible de modifier le statut des comptes sélectionnés.',
  uploadImages: "Impossible d'envoyer les images.",
}

export const ADMIN_INFO_MESSAGES = {
  productSaved: 'Produit enregistré avec succès.',
  productCreated: 'Produit créé avec succès.',
  productsCreated: 'Produits créés avec succès.',
  productsDeleted: 'Produits supprimés avec succès.',
  productsPublished: 'Produits mis en ligne avec succès.',
  productsUnpublished: 'Produits retirés de la mise en ligne avec succès.',
  categoryCreated: 'Catégorie créée avec succès.',
  categoryUpdated: 'Catégorie mise à jour avec succès.',
  categoriesDeleted: 'Catégories supprimées avec succès.',
  categoriesMerged: 'Catégories fusionnées avec succès.',
  clientsActivated: 'Comptes clients réactivés avec succès.',
  clientsDeactivated: 'Comptes clients désactivés avec succès.',
  imageAdded: 'Image ajoutée avec succès.',
  imagesAdded: 'Images ajoutées avec succès.',
  draftsReset: 'Modifications réinitialisées.',
  filtersReset: 'Filtres réinitialisés.',
}

export function productRequiredFieldsMessage(index = null) {
  if (Number.isFinite(index) && index > 0) {
    return `Complétez le nom, le prix d'achat, le prix de vente et le stock du produit ${index} avant de créer les brouillons.`
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
  return "Le fichier doit être une image au format JPG, PNG, WEBP ou GIF."
}

export function productImageInvalidFileMessage() {
  return "Le fichier sélectionné n'est pas une image valide."
}

export function productImageUrlMessage() {
  return "L'image doit être une URL valide commençant par http:// ou https://."
}

export function partialImageUploadMessage(remainingSlots, limit) {
  return `Seulement ${remainingSlots} image(s) ont été ajoutées. Maximum ${limit} images par produit.`
}

export function normalizeProductValidationError(errorMessage, fallbackMessage) {
  const message = String(errorMessage || '').trim()
  if (!message) return fallbackMessage

  const normalizedMessage = message.toLowerCase()

  if (normalizedMessage.includes('propertypath=prixachat')) {
    return "Le prix d'achat est obligatoire et doit être positif."
  }

  if (normalizedMessage.includes('propertypath=prix')) {
    return 'Le prix de vente est obligatoire et doit être positif.'
  }

  if (normalizedMessage.includes('propertypath=stock')) {
    return 'Le stock est obligatoire et doit être positif ou nul.'
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
    return 'Sélectionnez une catégorie valide.'
  }

  if (normalizedMessage.includes('propertypath=imageurls')) {
    return 'Ajoutez au moins une photo du produit.'
  }

  if (normalizedMessage.includes('prix positif obligatoire')) {
    return 'Le prix de vente est obligatoire et doit être positif.'
  }

  if (normalizedMessage.includes("prix d'achat")) {
    return "Le prix d'achat est obligatoire et doit être positif."
  }

  if (normalizedMessage.includes('description obligatoire')) {
    return 'La description du produit est obligatoire.'
  }

  if (normalizedMessage.includes('categorie obligatoire')) {
    return 'Sélectionnez une catégorie valide.'
  }

  if (
    normalizedMessage.includes('au moins une image')
    || normalizedMessage.includes('une photo du produit')
  ) {
    return 'Ajoutez au moins une photo du produit.'
  }

  if (normalizedMessage.includes('stock')) {
    return 'Le stock est obligatoire et doit être positif ou nul.'
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
    || normalizedMessage.includes('format d’image non supporté')
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
    return 'Tous les champs doivent être remplis.'
  }

  if (missingFields.includes('nom')) return 'Le nom du produit est obligatoire.'
  if (missingFields.includes('description')) return 'La description du produit est obligatoire.'
  if (missingFields.includes('prixAchat')) return "Le prix d'achat est obligatoire."
  if (missingFields.includes('prix')) return 'Le prix de vente est obligatoire.'
  if (missingFields.includes('stock')) return 'Le stock est obligatoire.'
  if (missingFields.includes('categorieId')) return 'La catégorie est obligatoire.'
  if (missingFields.includes('imageUrlsText')) return 'Ajoutez au moins une photo du produit.'

  if (normalizeImageUrls(imageUrlsText).length > MAX_PRODUCT_IMAGES) {
    return imageLimitMessage(MAX_PRODUCT_IMAGES)
  }

  const purchasePrice = Number(prixAchat)
  if (!Number.isFinite(purchasePrice) || purchasePrice < 0) {
    return "Le prix d'achat doit être positif ou nul."
  }

  const salePrice = Number(prix)
  if (!Number.isFinite(salePrice) || salePrice <= 0) {
    return 'Le prix de vente doit être positif.'
  }

  if (salePrice < purchasePrice) {
    return "Le prix de vente doit être supérieur ou égal au prix d'achat."
  }

  if (String(promotionPercent || '').trim() !== '') {
    const promotionValue = Number(promotionPercent)
    if (!Number.isFinite(promotionValue) || promotionValue < 0 || promotionValue > 100) {
      return 'La réduction doit être comprise entre 0 et 100 %.'
    }
  }

  const stockValue = Number(stock)
  if (!Number.isFinite(stockValue) || stockValue < 0) {
    return 'Le stock doit être positif ou nul.'
  }

  return ''
}

function normalizeImageUrls(imageUrlsText) {
  return String(imageUrlsText || '')
    .split('\n')
    .map((value) => value.trim())
    .filter(Boolean)
}
