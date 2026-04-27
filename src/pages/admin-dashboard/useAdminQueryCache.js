import { useMemo } from 'react'
import {
  clearAdminQueryCache,
  fetchAdminQuery,
  getAdminQueryData,
  invalidateAdminQueries,
  setAdminQueryData,
} from '../../services/adminQueryCache.js'

export default function useAdminQueryCache() {
  return useMemo(() => ({
    clearAll: clearAdminQueryCache,
    fetchQuery: fetchAdminQuery,
    getQueryData: getAdminQueryData,
    invalidateQueries: invalidateAdminQueries,
    setQueryData: setAdminQueryData,
  }), [])
}
