import { Fragment, Suspense, lazy } from 'react'
import AdminRouteFallback from '../components/AdminRouteFallback'
import AdminShell from '../components/AdminShell'
import AdminStatePanel from '../components/AdminStatePanel'
import useAdminProductsPageController from './admin-dashboard/useAdminProductsPageController'
import ProductActionModals from './admin-dashboard/ProductActionModals'
import ProductManagementSection from './admin-dashboard/ProductManagementSection'
import ProductSelectionSidebar from './admin-dashboard/ProductSelectionSidebar'
import '../styles/features/catalog.css'
import '../styles/components/forms.css'
import '../styles/features/catalog-shared.css'
import '../styles/features/products.css'
import '../styles/themes/products-dark.css'

const ProductCreatePanel = lazy(() => import('./admin-dashboard/ProductFormPanels').then((module) => ({
  default: module.ProductCreatePanel,
})))
const ProductEditPanel = lazy(() => import('./admin-dashboard/ProductFormPanels').then((module) => ({
  default: module.ProductEditPanel,
})))
const ProductDeletePanel = lazy(() => import('./admin-dashboard/ProductDeletePanel'))

export default function AdminProductsPage({ pageType = 'products', embedded = false }) {
  const controller = useAdminProductsPageController({ pageType })
  const sectionFallback = <AdminRouteFallback compact message="Chargement de la section produits..." />

  return (
    <div className={embedded ? 'admin-dashboard-embedded' : 'admin-page admin-page-products'}>
      <AdminShell
        activeNavId={controller.activeAdminNavId}
        blockingMessage={controller.blockingMessage}
        blockingProgress={controller.blockingProgress}
        feedbackItems={[
          { type: 'error', message: controller.error, onClose: () => controller.setError(null) },
          { type: 'success', message: controller.info, onClose: () => controller.setInfo(null) },
        ]}
        isBlocking={controller.isBlocking}
      >
        <div className={`admin-console-layout ${controller.showProductSelectionSidebar ? 'has-selection-sidebar' : 'is-full-width'}`}>
          <div className={`admin-console-shell ${controller.showProductSelectionSidebar ? 'is-products-page admin-products-page-shell' : 'is-standard-page admin-products-page-shell'}`}>
            {controller.error && !controller.loading ? (
              <AdminStatePanel
                variant="error"
                tone="critical"
                title="Le module produits a rencontre une erreur"
                message={controller.error}
                action={(
                  <button type="button" className="admin-console-btn" onClick={() => window.location.reload()}>
                    Recharger la vue
                  </button>
                )}
              />
            ) : null}
            {['products', 'product-create'].includes(pageType) ? (
              <Fragment>
                {controller.activeSectionId === 'add-products' ? (
                  <Suspense fallback={sectionFallback}>
                    <ProductCreatePanel {...controller.productCreatePanelProps} />
                  </Suspense>
                ) : controller.activeSectionId === 'delete-products' ? (
                  <Suspense fallback={sectionFallback}>
                    <ProductDeletePanel {...controller.productDeletePanelProps} />
                  </Suspense>
                ) : controller.activeSectionId === 'product-management' ? (
                  <Suspense fallback={sectionFallback}>
                    <ProductManagementSection {...controller.managementSectionProps} />
                  </Suspense>
                ) : (
                  <AdminStatePanel
                    title="Section indisponible"
                    message="Cette section produits n'est pas encore configuree."
                  />
                )}
              </Fragment>
            ) : pageType === 'product-edit' ? (
              <Suspense fallback={sectionFallback}>
                <ProductEditPanel {...controller.productEditPanelProps} />
              </Suspense>
            ) : (
              <AdminStatePanel
                title="Vue indisponible"
                message="Cette vue produits n'est pas disponible pour le moment. Revenez a la gestion des produits."
                action={(
                  <button type="button" className="admin-console-btn" onClick={controller.handleReturnToProducts}>
                    Retour aux produits
                  </button>
                )}
              />
            )}
          </div>

          {controller.showProductSelectionSidebar ? (
            <Suspense fallback={<AdminRouteFallback compact message="Chargement de la selection..." />}>
              <ProductSelectionSidebar {...controller.productSelectionSidebarProps} />
            </Suspense>
          ) : null}

          <Suspense fallback={<AdminRouteFallback compact message="Chargement des actions..." />}>
            <ProductActionModals {...controller.actionModalProps} />
          </Suspense>
        </div>
      </AdminShell>
    </div>
  )
}
