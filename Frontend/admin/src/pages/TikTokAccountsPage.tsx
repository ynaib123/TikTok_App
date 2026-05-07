import { useEffect } from 'react'
import AdminShell from '../components/AdminShell'
import { AccountsHeader } from '../components/accounts/AccountsHeader'
import { AccountsToolbar } from '../components/accounts/AccountsToolbar'
import { AccountsCategoryTabs } from '../components/accounts/AccountsCategoryTabs'
import { AccountsStatsSection } from '../components/accounts/AccountsStatsSection'
import { AccountsList } from '../components/accounts/AccountsList'
import { AccountsServiceModal } from '../components/accounts/AccountsServiceModal'
import { useTikTokAccountsController } from '../hooks/useTikTokAccountsController'
import { markAdminRouteReady } from '../services/adminPerformance'
import '../styles/features/journey.css'
import '../styles/features/tiktok-step.css'
import '../styles/features/accounts.css'
import '../styles/features/accounts-modal.css'

export default function TikTokAccountsPage() {
  const c = useTikTokAccountsController()

  useEffect(() => {
    if (c.isBootstrapping) return
    markAdminRouteReady('/accounts', {
      hasError: Boolean(c.accountsError || c.errorMessage),
      rows: c.rows.length,
      filteredRows: c.filteredRows.length,
    })
  }, [c.accountsError, c.errorMessage, c.filteredRows.length, c.isBootstrapping, c.rows.length])

  return (
    <div className="admin-page video-ops-page accounts-page-v2">
      <AdminShell
        activeNavId="accounts"
        feedbackItems={[
          { type: 'error', message: c.accountsError?.message || c.errorMessage || null },
          ...c.feedbackItems.filter((item) => item.type === 'success'),
        ]}
      >
        <div className="video-ops-shell">
          <AccountsHeader
            availableProviders={c.availableProviders}
            connectMenuOpen={c.connectMenuOpen}
            setConnectMenuOpen={c.setConnectMenuOpen}
            isConnectingTikTok={c.isConnectingTikTok}
            onConnectTikTok={c.handleConnectTikTok}
            onStartNewServiceProfile={c.startNewServiceProfile}
          />

          <AccountsStatsSection stats={c.stats} />

          <AccountsCategoryTabs
            activeCategory={c.activeCategory}
            onChange={c.setActiveCategory}
            countsByCategory={c.countsByCategory}
          />

          <AccountsToolbar
            search={c.search}
            onSearchChange={c.setSearch}
            statusFilter={c.statusFilter}
            onStatusFilterChange={c.setStatusFilter}
            viewMode={c.viewMode}
            onViewModeChange={c.setViewMode}
          />

          <AccountsList
            rows={c.filteredRows}
            viewMode={c.viewMode}
            loadFailed={Boolean(c.accountsError) && c.rows.length === 0}
            hasPendingAction={c.hasPendingAction}
            onDisconnectTikTok={(id) => void c.handleDisconnectTikTok(id)}
            onValidateService={(provider, connectionId) =>
              void c.handleValidateService(provider, Number(connectionId))
            }
            onLoadServiceProfile={c.loadServiceProfile}
          />
        </div>

        {c.openModalProviderKey && c.activeProviderConfig && c.activeForm ? (
          <AccountsServiceModal
            providerKey={c.openModalProviderKey}
            providerConfig={c.activeProviderConfig}
            form={c.activeForm}
            isEditing={c.isEditingExistingProfile}
            stepperStep={c.stepperStep}
            setStepperStep={c.setStepperStep}
            confirmName={c.confirmName}
            setConfirmName={c.setConfirmName}
            modalRef={c.modalRef}
            hasPendingAction={c.hasPendingAction}
            onClose={(provider) => c.closeModal(provider)}
            onSave={(provider) => void c.handleSaveService(provider)}
            onDelete={(provider, connectionId) =>
              void c.handleDeleteService(provider, Number(connectionId))
            }
            onUpdateForm={c.updateServiceForm}
          />
        ) : null}
      </AdminShell>
    </div>
  )
}
