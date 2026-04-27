import AdminShell from '../components/AdminShell'
import AdminClientDirectoryPanel from './admin-dashboard/AdminClientDirectoryPanel'
import AdminClientSelectionSidebar from './admin-dashboard/AdminClientSelectionSidebar'
import useAdminClientsPageController from './admin-dashboard/useAdminClientsPageController.js'
import '../styles/features/catalog.css'
import '../styles/features/catalog-shared.css'
import '../styles/features/clients.css'

export default function AdminClientsPage() {
  const controller = useAdminClientsPageController()

  return (
    <div className="admin-page admin-page-clients">
      <AdminShell
        activeNavId="clients"
        feedbackItems={[
          {
            type: 'error',
            message: controller.activeErrorBanner?.message,
            onClose: controller.activeErrorBanner?.onClose,
          },
          {
            type: 'success',
            message: controller.directoryPanelProps.actionInfo,
            onClose: () => controller.directoryPanelProps.setActionInfo?.(null),
          },
        ]}
      >
        <div className="admin-console-layout has-selection-sidebar">
          <div className="admin-console-shell is-products-page admin-clients-page-shell">
            <AdminClientDirectoryPanel {...controller.directoryPanelProps} />
          </div>

          <AdminClientSelectionSidebar
            key={controller.activeClientId != null ? `client-sidebar-${controller.activeClientId}` : 'client-sidebar-empty'}
            {...controller.selectionSidebarProps}
          />
        </div>
      </AdminShell>
    </div>
  )
}
