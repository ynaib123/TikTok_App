import { useEffect } from 'react'
import { buildProductControllerHydrationIds } from './adminProductsPageControllerState.js'

export default function useAdminProductSelectionModule({
  deleteModalProductIds,
  editDraftsByProductId,
  loadProductsByIds,
  managedEditProductId,
  resolvedEditProductId,
  selectedProductIds,
}) {
  useEffect(() => {
    const idsToHydrate = buildProductControllerHydrationIds({
      deleteModalProductIds,
      editDraftsByProductId,
      managedEditProductId,
      resolvedEditProductId,
      selectedProductIds,
    })

    void loadProductsByIds(idsToHydrate)
  }, [
    deleteModalProductIds,
    editDraftsByProductId,
    loadProductsByIds,
    managedEditProductId,
    resolvedEditProductId,
    selectedProductIds,
  ])
}
