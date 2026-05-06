import test from 'node:test'
import assert from 'node:assert/strict'
import {
  clearAdminQueryCache,
  fetchAdminQuery,
  getAdminQueryData,
  invalidateAdminQueries,
  setAdminQueryData,
} from './adminQueryCache.js'

test('shared admin query cache reuses cached values across calls', async () => {
  clearAdminQueryCache()
  let fetchCount = 0

  const first = await fetchAdminQuery({
    key: ['admin-overview'],
    fetcher: async () => {
      fetchCount += 1
      return { clients: 12 }
    },
    staleTime: 10_000,
  })

  const second = await fetchAdminQuery({
    key: ['admin-overview'],
    fetcher: async () => {
      fetchCount += 1
      return { clients: 24 }
    },
    staleTime: 10_000,
  })

  assert.deepEqual(first, { clients: 12 })
  assert.deepEqual(second, { clients: 12 })
  assert.deepEqual(getAdminQueryData(['admin-overview']), { clients: 12 })
  assert.equal(fetchCount, 1)

  invalidateAdminQueries((key) => key.includes('"admin-overview"'))

  const third = await fetchAdminQuery({
    key: ['admin-overview'],
    fetcher: async () => {
      fetchCount += 1
      return { clients: 24 }
    },
    staleTime: 10_000,
  })

  assert.deepEqual(getAdminQueryData(['admin-overview']), { clients: 24 })
  assert.deepEqual(third, { clients: 24 })
  assert.equal(fetchCount, 2)
})

test('shared admin query cache deduplicates concurrent requests and supports manual writes', async () => {
  clearAdminQueryCache()
  let fetchCount = 0

  const [first, second] = await Promise.all([
    fetchAdminQuery({
      key: ['admin-clients', 'page=1'],
      fetcher: async () => {
        fetchCount += 1
        await new Promise((resolve) => setTimeout(resolve, 10))
        return { items: [1, 2] }
      },
      force: false,
    }),
    fetchAdminQuery({
      key: ['admin-clients', 'page=1'],
      fetcher: async () => {
        fetchCount += 1
        return { items: [3, 4] }
      },
      force: false,
    }),
  ])

  assert.deepEqual(first, { items: [1, 2] })
  assert.deepEqual(second, { items: [1, 2] })
  assert.equal(fetchCount, 1)

  setAdminQueryData(['admin-clients', 'page=1'], { items: [7] })
  assert.deepEqual(getAdminQueryData(['admin-clients', 'page=1']), { items: [7] })

  clearAdminQueryCache()
})
