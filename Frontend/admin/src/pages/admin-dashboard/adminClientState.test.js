import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildClientCatalogInsights,
  buildClientFilterSummary,
  buildClientDirectoryQuery,
  buildClientFullName,
  buildClientTagList,
  filterClientCatalogItems,
  getClientStatusLabel,
  normalizeClientCatalogResponse,
  normalizeDeliveryAddresses,
  normalizePaymentMethods,
} from './adminClientState.js'

test('buildClientFullName falls back gracefully', () => {
  assert.equal(buildClientFullName({ prenom: 'Aya', nom: 'Lahlou' }), 'Aya Lahlou')
  assert.equal(buildClientFullName({ email: 'client@example.com' }), 'client@example.com')
})

test('normalize client catalog response coerces numeric values and full name', () => {
  const response = normalizeClientCatalogResponse({
    items: [{
      id: 3,
      prenom: 'Nora',
      nom: 'Ait',
      compteActif: false,
      orderCount: '4',
      totalSpent: '250.5',
      averageBasket: '62.625',
      pendingOrders: '1',
      deliveredOrders: '2',
    }],
    page: '2',
    size: '24',
    totalItems: '30',
    totalPages: '2',
  })

  assert.equal(response.items[0].fullName, 'Nora Ait')
  assert.equal(response.items[0].compteActif, false)
  assert.equal(response.items[0].online, false)
  assert.equal(response.items[0].orderCount, 4)
  assert.equal(response.items[0].pendingOrders, 1)
  assert.equal(response.page, 2)
  assert.equal(response.size, 24)
})

test('normalize delivery addresses keeps primary first and handles aliases', () => {
  const addresses = normalizeDeliveryAddresses([
    { adresse: 'Rue 2', city: 'Casablanca', isActive: false },
    { address: 'Rue 1', city: 'Rabat', isActive: true },
  ])

  assert.equal(addresses[0].address, 'Rue 1')
  assert.equal(addresses[1].address, 'Rue 2')
})

test('normalize payment methods supports card and paypal entries', () => {
  const methods = normalizePaymentMethods([
    { method: 'card', cardBrand: 'visa', cardNumberLast4: '4242', expiry: '12/28', holder: 'Client A' },
    { method: 'paypal', paypalEmail: 'pay@example.com' },
  ])

  assert.equal(methods[0].typeLabel, 'Visa')
  assert.match(methods[0].details, /4242/)
  assert.equal(methods[1].typeLabel, 'PayPal')
})

test('build client directory query omits empty search and preserves params', () => {
  assert.equal(
    buildClientDirectoryQuery({ search: '  ', sort: 'orders_desc', page: 2, size: 24 }),
    'sort=orders_desc&page=2&size=24&connectionFilter=all&statusFilter=all&verificationFilter=all'
  )

  assert.equal(
    buildClientDirectoryQuery({
      search: 'nora',
      sort: 'activity_desc',
      page: 1,
      size: 12,
      connectionFilter: 'online',
      statusFilter: 'active',
      verificationFilter: 'verified',
    }),
    'search=nora&sort=activity_desc&page=1&size=12&connectionFilter=online&statusFilter=active&verificationFilter=verified'
  )
})

test('client status label and tag list reflect admin status', () => {
  const client = {
    compteActif: true,
    online: true,
    emailVerifie: true,
    marketingOptIn: true,
    orderCount: 6,
    totalSpent: 2600,
    pendingOrders: 0,
  }

  assert.equal(getClientStatusLabel(client), 'Compte active')
  assert.ok(buildClientTagList(client).includes('En ligne'))
})

test('client filters support online and verification states', () => {
  const filtered = filterClientCatalogItems([
    { id: 1, online: true, emailVerifie: false },
    { id: 2, online: false, emailVerifie: true },
  ], {
    connectionFilter: 'online',
    verificationFilter: 'pending',
  })

  assert.deepEqual(filtered.map((client) => client.id), [1])
})

test('client filter summary concatenates active filters', () => {
  const summary = buildClientFilterSummary({
    clientStatusFilter: 'active',
    connectionFilter: 'online',
    verificationFilter: 'verified',
    selectedClientStatusFilter: { label: 'Comptes actifs' },
    selectedClientConnectionFilter: { label: 'En ligne' },
    selectedClientVerificationFilter: { label: 'Emails verifies' },
  })

  assert.equal(summary, 'Comptes actifs • En ligne • Emails verifies')
})

test('client catalog insights aggregate health segments', () => {
  const insights = buildClientCatalogInsights([
    { id: 1, compteActif: true, emailVerifie: true, pendingOrders: 1, orderCount: 0, totalSpent: 0 },
    { id: 2, compteActif: false, emailVerifie: false, pendingOrders: 0, orderCount: 6, totalSpent: 2400 },
  ], new Set([1]))

  assert.deepEqual(insights, {
    activeCount: 1,
    followUpCount: 1,
    onlineCount: 1,
    verifiedCount: 1,
    vipCount: 1,
  })
})
