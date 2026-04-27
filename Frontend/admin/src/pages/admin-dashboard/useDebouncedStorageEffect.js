import { useEffect } from 'react'

export default function useDebouncedStorageEffect({
  delay = 250,
  key,
  removeWhenNull = false,
  serialize = 'json',
  storage = 'local',
  value,
}) {
  useEffect(() => {
    if (typeof window === 'undefined' || !key) return undefined

    const targetStorage = storage === 'session' ? window.sessionStorage : window.localStorage
    const timeoutId = window.setTimeout(() => {
      try {
        if (removeWhenNull && (value == null || value === '')) {
          targetStorage.removeItem(key)
          return
        }

        targetStorage.setItem(
          key,
          serialize === 'raw' ? String(value) : JSON.stringify(value)
        )
      } catch {
        // Ignore storage write failures and keep the in-memory state.
      }
    }, delay)

    return () => window.clearTimeout(timeoutId)
  }, [delay, key, removeWhenNull, serialize, storage, value])
}
