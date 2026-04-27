import test from 'node:test'
import assert from 'node:assert/strict'

function createQueryCache() {
  const cache = new Map()
  const isExpired = (entry) => Boolean(entry?.expiresAt) && entry.expiresAt <= Date.now()

  return {
    async fetchQuery({ key, fetcher, force = false, staleTime = 0 }) {
      const serializedKey = typeof key === 'string' ? key : JSON.stringify(key)
      const cachedEntry = cache.get(serializedKey)
      if (!force && cachedEntry && !isExpired(cachedEntry)) {
        return cachedEntry.value
      }

      const value = await fetcher()
      cache.set(serializedKey, {
        value,
        expiresAt: staleTime > 0 ? Date.now() + staleTime : null,
      })
      return value
    },
    invalidateQueries(predicate) {
      if (typeof predicate !== 'function') {
        cache.clear()
        return
      }

      Array.from(cache.keys()).forEach((key) => {
        if (predicate(key)) cache.delete(key)
      })
    },
  }
}

test('query cache reuses cached result until invalidated', async () => {
  const queryCache = createQueryCache()
  let fetchCount = 0

  const first = await queryCache.fetchQuery({
    key: ['category-catalog', 'page=1'],
    fetcher: async () => {
      fetchCount += 1
      return { items: [1] }
    },
  })

  const second = await queryCache.fetchQuery({
    key: ['category-catalog', 'page=1'],
    fetcher: async () => {
      fetchCount += 1
      return { items: [2] }
    },
  })

  assert.deepEqual(first, { items: [1] })
  assert.deepEqual(second, { items: [1] })
  assert.equal(fetchCount, 1)

  queryCache.invalidateQueries((key) => key.includes('"category-catalog"'))

  const third = await queryCache.fetchQuery({
    key: ['category-catalog', 'page=1'],
    fetcher: async () => {
      fetchCount += 1
      return { items: [3] }
    },
  })

  assert.deepEqual(third, { items: [3] })
  assert.equal(fetchCount, 2)
})

test('query cache refetches stale entries after ttl', async () => {
  const queryCache = createQueryCache()
  let fetchCount = 0

  const first = await queryCache.fetchQuery({
    key: ['clients-directory', 'page=1'],
    staleTime: 5,
    fetcher: async () => {
      fetchCount += 1
      return { items: [1] }
    },
  })

  await new Promise((resolve) => setTimeout(resolve, 15))

  const second = await queryCache.fetchQuery({
    key: ['clients-directory', 'page=1'],
    staleTime: 5,
    fetcher: async () => {
      fetchCount += 1
      return { items: [2] }
    },
  })

  assert.deepEqual(first, { items: [1] })
  assert.deepEqual(second, { items: [2] })
  assert.equal(fetchCount, 2)
})
