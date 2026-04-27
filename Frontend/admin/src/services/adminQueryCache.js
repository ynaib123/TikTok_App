import { adminQueryClient } from './adminQueryClient.js'

function serializeKey(key) {
  return typeof key === 'string' ? key : JSON.stringify(key)
}

function getSerializedQueryKey(query) {
  return serializeKey(query?.queryKey)
}

export function clearAdminQueryCache() {
  adminQueryClient.clear()
}

export function getAdminQueryData(key) {
  return adminQueryClient.getQueryData(key)
}

export function setAdminQueryData(key, value) {
  adminQueryClient.setQueryData(key, value)
  return value
}

export function invalidateAdminQueries(predicate) {
  if (typeof predicate !== 'function') {
    adminQueryClient.invalidateQueries()
    return
  }

  adminQueryClient.invalidateQueries({
    predicate: (query) => predicate(getSerializedQueryKey(query)),
  })
}

export async function fetchAdminQuery({
  key,
  fetcher,
  force = false,
  staleTime = 0,
}) {
  if (force) {
    adminQueryClient.removeQueries({ queryKey: key, exact: true })
  }

  return adminQueryClient.fetchQuery({
    queryKey: key,
    queryFn: fetcher,
    staleTime,
  })
}
