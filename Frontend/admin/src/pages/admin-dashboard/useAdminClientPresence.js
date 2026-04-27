import { useEffect, useMemo, useState } from 'react'
import {
  apiGet,
  createAuthenticatedAdminRequest,
} from '../../services/adminApiClient.js'
import {
  applyPresenceSnapshot,
  parseSseEventChunk,
} from './adminClientPresenceState.js'

const PRESENCE_STREAM_RETRY_DELAY = 3_000

export default function useAdminClientPresence() {
  const [onlineClientIds, setOnlineClientIds] = useState([])
  const [presenceSnapshotAt, setPresenceSnapshotAt] = useState(null)

  useEffect(() => {
    let cancelled = false
    let reconnectTimeoutId = null
    let streamAbortController = null

    const clearReconnectTimeout = () => {
      if (reconnectTimeoutId == null) return
      window.clearTimeout(reconnectTimeoutId)
      reconnectTimeoutId = null
    }

    const loadPresenceSnapshot = async () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return

      try {
        const response = await apiGet('/clients/admin/presence')
        if (cancelled) return
        applyPresenceSnapshot(response, setOnlineClientIds, setPresenceSnapshotAt)
      } catch {
        if (cancelled) return
      }
    }

    const consumePresenceStream = async (response) => {
      if (!response?.ok || !response.body) {
        throw new Error('Presence stream unavailable.')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (!cancelled) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const chunks = buffer.replace(/\r/g, '').split('\n\n')
        buffer = chunks.pop() || ''

        chunks.forEach((chunk) => {
          const event = parseSseEventChunk(chunk)
          if (event.type !== 'presence-snapshot' || !event.data) return

          try {
            const payload = JSON.parse(event.data)
            applyPresenceSnapshot(payload, setOnlineClientIds, setPresenceSnapshotAt)
          } catch {
            // Ignore malformed SSE payloads and keep the stream open.
          }
        })
      }

      reader.releaseLock()
    }

    const connectPresenceStream = async () => {
      if (cancelled) return
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return

      clearReconnectTimeout()
      streamAbortController?.abort()
      streamAbortController = new AbortController()

      try {
        const request = await createAuthenticatedAdminRequest('/clients/admin/presence/stream', {
          method: 'GET',
          cache: 'no-store',
          signal: streamAbortController.signal,
          headers: {
            Accept: 'text/event-stream',
          },
        })
        const response = await fetch(request.url, request.options)
        if (cancelled) return
        await consumePresenceStream(response)
      } catch {
        if (cancelled || streamAbortController?.signal.aborted) return
        await loadPresenceSnapshot()
      }

      if (cancelled) return
      clearReconnectTimeout()
      reconnectTimeoutId = window.setTimeout(() => {
        void connectPresenceStream()
      }, PRESENCE_STREAM_RETRY_DELAY)
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        clearReconnectTimeout()
        streamAbortController?.abort()
        return
      }

      void loadPresenceSnapshot()
      void connectPresenceStream()
    }

    void loadPresenceSnapshot()
    void connectPresenceStream()
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange)
    }

    return () => {
      cancelled = true
      clearReconnectTimeout()
      streamAbortController?.abort()
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
      }
    }
  }, [])

  const onlineClientIdSet = useMemo(() => new Set(onlineClientIds.map(Number)), [onlineClientIds])

  return {
    onlineClientIdSet,
    onlineClientIds,
    presenceSnapshotAt,
  }
}
