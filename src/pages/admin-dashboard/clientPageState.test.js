import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildActiveClientErrorBanner,
  getVisibleClients,
  parseRouteClientId,
} from './clientPageState.js'

test('parseRouteClientId normalizes numeric params only', () => {
  assert.equal(parseRouteClientId('14'), 14)
  assert.equal(parseRouteClientId('abc'), null)
})

test('getVisibleClients falls back to an empty list', () => {
  assert.deepEqual(getVisibleClients({ items: [{ id: 1 }] }), [{ id: 1 }])
  assert.deepEqual(getVisibleClients({ items: null }), [])
})

test('buildActiveClientErrorBanner returns the first available error handler', () => {
  let cleared = false
  const banner = buildActiveClientErrorBanner({
    actionError: null,
    catalogError: 'catalog failed',
    deliveryError: 'delivery failed',
    paymentError: null,
    profileError: null,
    setActionError: () => {},
    setCatalogError: () => {
      cleared = true
    },
    setDeliveryError: () => {},
    setPaymentError: () => {},
    setProfileError: () => {},
  })

  assert.equal(banner.message, 'catalog failed')
  banner.onClose()
  assert.equal(cleared, true)
})
