import { test, expect } from 'vitest'
import {
  clearAdminQueryCache,
  fetchAdminQuery,
  getAdminQueryData,
  invalidateAdminQueries,
  setAdminQueryData,
} from './adminQueryCache'

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

  expect(first).toEqual({ clients: 12 })
  expect(second).toEqual({ clients: 12 })
  expect(getAdminQueryData(['admin-overview'])).toEqual({ clients: 12 })
  expect(fetchCount).toBe(1)

  invalidateAdminQueries((key) => key.includes('"admin-overview"'))

  const third = await fetchAdminQuery({
    key: ['admin-overview'],
    fetcher: async () => {
      fetchCount += 1
      return { clients: 24 }
    },
    staleTime: 10_000,
  })

  expect(getAdminQueryData(['admin-overview'])).toEqual({ clients: 24 })
  expect(third).toEqual({ clients: 24 })
  expect(fetchCount).toBe(2)
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

  expect(first).toEqual({ items: [1, 2] })
  expect(second).toEqual({ items: [1, 2] })
  expect(fetchCount).toBe(1)

  setAdminQueryData(['admin-clients', 'page=1'], { items: [7] })
  expect(getAdminQueryData(['admin-clients', 'page=1'])).toEqual({ items: [7] })

  clearAdminQueryCache()
})
