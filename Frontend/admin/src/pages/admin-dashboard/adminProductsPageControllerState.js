import { buildProductHydrationIds } from './productPageState.js'

export function buildProductControllerHydrationIds({
  deleteModalProductIds,
  editDraftsByProductId,
  managedEditProductId,
  resolvedEditProductId,
  selectedProductIds,
}) {
  return buildProductHydrationIds({
    deleteModalProductIds,
    editDraftsByProductId,
    managedEditProductId,
    resolvedEditProductId,
    selectedProductIds,
  })
}

export function buildProductControllerResult({
  actionModalProps,
  activeSectionId,
  blockingMessage,
  blockingProgress,
  error,
  guardedNavigate,
  info,
  isBlocking,
  managementSectionProps,
  pageType,
  productCreatePanelProps,
  productDeletePanelProps,
  productEditPanelProps,
  productSelectionSidebarProps,
  setError,
  setInfo,
  showProductSelectionSidebar,
}) {
  return {
    actionModalProps,
    activeAdminNavId: pageType === 'products' ? 'products' : null,
    activeSectionId,
    blockingMessage,
    blockingProgress,
    createPanelFallbackText: "Chargement de l'atelier de creation...",
    editPanelFallbackText: "Chargement de l'atelier d'edition...",
    deletePanelFallbackText: 'Chargement des actions de suppression...',
    error,
    info,
    isBlocking,
    managementSectionFallbackText: 'Chargement de la gestion des produits...',
    managementSectionProps,
    handleReturnToProducts: () => guardedNavigate('/products'),
    productCreatePanelProps,
    productDeletePanelProps,
    productEditPanelProps,
    productSelectionSidebarProps,
    setError,
    setInfo,
    showProductSelectionSidebar,
  }
}
