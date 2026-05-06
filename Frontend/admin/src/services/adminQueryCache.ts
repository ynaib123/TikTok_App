import type { Query, QueryKey } from '@tanstack/react-query'
import { adminQueryClient } from './adminQueryClient'

function serializeKey(key: QueryKey | undefined): string {
  return typeof key === 'string' ? key : JSON.stringify(key)
}

function getSerializedQueryKey(query: Query): string {
  return serializeKey(query?.queryKey)
}

export function clearAdminQueryCache(): void {
  adminQueryClient.clear()
}

export function getAdminQueryData<T = unknown>(key: QueryKey): T | undefined {
  return adminQueryClient.getQueryData<T>(key)
}

export function setAdminQueryData<T = unknown>(key: QueryKey, value: T): T {
  adminQueryClient.setQueryData<T>(key, value)
  return value
}

export function invalidateAdminQueries(predicate?: (serializedKey: string) => boolean): void {
  if (typeof predicate !== 'function') {
    adminQueryClient.invalidateQueries()
    return
  }

  adminQueryClient.invalidateQueries({
    predicate: (query: Query) => predicate(getSerializedQueryKey(query)),
  })
}

export interface FetchAdminQueryOptions<T> {
  key: QueryKey
  fetcher: () => Promise<T>
  force?: boolean
  staleTime?: number
}

export async function fetchAdminQuery<T = unknown>({
  key,
  fetcher,
  force = false,
  staleTime = 0,
}: FetchAdminQueryOptions<T>): Promise<T> {
  if (force) {
    adminQueryClient.removeQueries({ queryKey: key, exact: true })
  }

  return adminQueryClient.fetchQuery<T>({
    queryKey: key,
    queryFn: fetcher,
    staleTime,
  })
}
