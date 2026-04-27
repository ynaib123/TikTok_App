import test from 'node:test'
import assert from 'node:assert/strict'
import { createClientNavigationActions } from './useAdminClientUiActions.js'

function createNavigateSpy() {
  const calls = []
  const navigate = (...args) => {
    calls.push(args)
  }
  return { calls, navigate }
}

test('createClientNavigationActions keeps client routing stable', () => {
  const { calls, navigate } = createNavigateSpy()
  let activeClientId = null
  let infoMessage = 'saved'
  const loggedEntries = []

  const actions = createClientNavigationActions({
    appendClientSessionActivity: (entry) => {
      loggedEntries.push(entry)
    },
    clientMap: new Map([[8, { id: 8, nomComplet: 'Client Huit' }]]),
    navigate,
    routeClientId: null,
    setActionInfo: (value) => {
      infoMessage = value
    },
    setActiveClientId: (value) => {
      activeClientId = value
    },
  })

  actions.handleSelectClient(8)
  actions.syncRouteWithActiveClient(8)
  actions.clearActionInfo()
  actions.redirectToClientDirectory()

  assert.equal(activeClientId, 8)
  assert.equal(infoMessage, null)
  assert.equal(loggedEntries.length, 1)
  assert.equal(loggedEntries[0].action, 'Consultation')
  assert.equal(loggedEntries[0].entityName, 'Client Huit')
  assert.deepEqual(calls[0], ['/clients/8'])
  assert.deepEqual(calls[1], ['/clients/8', { replace: true }])
  assert.deepEqual(calls[2], ['/clients', { replace: true }])
})

test('createClientNavigationActions avoids duplicate replace navigation when route already matches', () => {
  const { calls, navigate } = createNavigateSpy()

  const actions = createClientNavigationActions({
    appendClientSessionActivity: () => {},
    clientMap: new Map(),
    navigate,
    routeClientId: 8,
    setActionInfo: () => {},
    setActiveClientId: () => {},
  })

  actions.syncRouteWithActiveClient(8)

  assert.equal(calls.length, 0)
})
