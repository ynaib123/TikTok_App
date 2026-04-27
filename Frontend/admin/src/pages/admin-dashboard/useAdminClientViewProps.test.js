import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildClientDirectoryPanelProps,
  buildClientSelectionSidebarProps,
} from './clientPanelProps.js'

test('buildClientDirectoryPanelProps keeps client directory contract stable', () => {
  const noop = () => {}
  const result = buildClientDirectoryPanelProps({
    actionInfo: 'Info',
    activeClient: { id: 4 },
    activeClientId: 4,
    catalog: { items: [], totalItems: 12 },
    clientConnectionFilter: 'online',
    clientPage: 2,
    clientSearch: 'nora',
    clientSort: 'activity_desc',
    clientStatusFilter: 'active',
    clientVerificationFilter: 'verified',
    clientsPerPage: 24,
    isCatalogLoading: false,
    isBulkAccountStatusSubmitting: true,
    onlineClientIdSet: new Set([4]),
    onlineClientTotal: 1,
    selectedClientConnectionFilter: { value: 'online', label: 'En ligne' },
    selectedClientIds: [4],
    selectedClientSort: { value: 'activity_desc', label: 'Activite recente' },
    selectedClientStatusFilter: { value: 'active', label: 'Comptes actifs' },
    selectedClientSummary: { totalCount: 1, activeCount: 1, inactiveCount: 0 },
    selectedClientVerificationFilter: { value: 'verified', label: 'Verifies' },
    selectedClientsPerPage: { value: 24, label: '24 clients par page' },
    visibleClients: [{ id: 4 }],
    onActivateSelectedClients: noop,
    onChangeConnectionFilter: noop,
    onChangePage: noop,
    onChangePageSize: noop,
    onChangeSearch: noop,
    onChangeSort: noop,
    onChangeStatusFilter: noop,
    onChangeVerificationFilter: noop,
    onDeactivateSelectedClients: noop,
    onToggleSelectedClients: noop,
    onClearVisibleSelection: noop,
    onSelectClient: noop,
    onSelectVisibleClients: noop,
    onToggleClientSelection: noop,
    openCatalogMenu: 'client-sort',
    setActionInfo: noop,
    setOpenCatalogMenu: noop,
  })

  assert.equal(result.clientPage, 2)
  assert.equal(result.clientSearch, 'nora')
  assert.equal(result.isBulkAccountStatusSubmitting, true)
  assert.equal(result.selectedClientsPerPage.value, 24)
  assert.equal(result.onSelectClient, noop)
})

test('buildClientSelectionSidebarProps keeps sidebar contract stable', () => {
  const noop = () => {}
  const result = buildClientSelectionSidebarProps({
    activeClient: { id: 4 },
    clientProfile: { client: { id: 4 } },
    deliveryAddresses: [{ id: 'address-1' }],
    deliveryError: null,
    isAccountStatusSubmitting: true,
    isDeliveryLoading: false,
    isPaymentLoading: true,
    isProfileLoading: false,
    onToggleClientAccountStatus: noop,
    onlineClientIdSet: new Set([4]),
    paymentError: null,
    paymentMethods: [{ id: 'payment-1' }],
    profileError: null,
  })

  assert.equal(result.isAccountStatusSubmitting, true)
  assert.equal(result.isPaymentLoading, true)
  assert.equal(result.onToggleClientAccountStatus, noop)
})
