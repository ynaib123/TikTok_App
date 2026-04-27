import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildClientBulkActionHandlers,
  getPendingClientHydrationId,
  shouldRedirectToClientDirectory,
} from './adminClientsPageControllerState.js'

test('buildClientBulkActionHandlers keeps empty selections inert', async () => {
  const calls = []
  const actions = buildClientBulkActionHandlers({
    handleSelectClient: () => calls.push('select'),
    selectedClientIds: [],
    toggleClientAccountStatus: () => calls.push('toggle-one'),
    toggleSelectedClientAccountStatuses: () => calls.push('toggle-many'),
    updateSelectedClientAccountStatuses: (...args) => calls.push(args),
  })

  assert.equal(actions.onActivateSelectedClients(), undefined)
  assert.equal(actions.onDeactivateSelectedClients(), undefined)
  assert.equal(actions.onToggleSelectedClients(), undefined)
  assert.deepEqual(calls, [])
})

test('buildClientBulkActionHandlers forwards bulk account actions with the selected ids', () => {
  const calls = []
  const actions = buildClientBulkActionHandlers({
    handleSelectClient: () => undefined,
    selectedClientIds: [7, 9],
    toggleClientAccountStatus: () => undefined,
    toggleSelectedClientAccountStatuses: (ids) => calls.push(['toggle', ids]),
    updateSelectedClientAccountStatuses: (ids, active) => calls.push(['update', ids, active]),
  })

  actions.onActivateSelectedClients()
  actions.onDeactivateSelectedClients()
  actions.onToggleSelectedClients()

  assert.deepEqual(calls, [
    ['update', [7, 9], true],
    ['update', [7, 9], false],
    ['toggle', [7, 9]],
  ])
})

test('client page controller helpers keep route hydration rules stable', () => {
  assert.equal(
    getPendingClientHydrationId({ activeClientId: 8, clientMap: new Map() }),
    8
  )
  assert.equal(
    getPendingClientHydrationId({ activeClientId: 8, clientMap: new Map([[8, { id: 8 }]]) }),
    null
  )
  assert.equal(
    shouldRedirectToClientDirectory({ routeClientId: 4, totalItems: 0 }),
    true
  )
  assert.equal(
    shouldRedirectToClientDirectory({ routeClientId: null, totalItems: 0 }),
    false
  )
})
