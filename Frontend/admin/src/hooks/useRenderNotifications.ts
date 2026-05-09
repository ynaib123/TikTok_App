import { useEffect } from 'react'

interface RenderFinishedPayload {
  runId?: number
  contentIdeaId?: number | null
  status?: 'SUCCEEDED' | 'FAILED' | string
  errorMessage?: string | null
  completedAt?: string | null
}

/**
 * Lot 7 / H3 — wires the browser Notification API to the
 * `/api/video-ops/render-events/stream` SSE channel.
 *
 * The hook does three things :
 *  1. Asks for Notification permission once when {@code enabled} flips true.
 *  2. Subscribes to the SSE stream for the lifetime of the component.
 *  3. Posts a Notification on every {@code render_finished} event when the
 *     tab is hidden (no point notifying a user already looking at the page).
 *
 * Returns the current permission state so the caller can show a graceful
 * fallback when the operator denies notifications.
 */
export function useRenderNotifications(enabled: boolean = true): NotificationPermission | 'unavailable' {
  useEffect(() => {
    if (!enabled) return undefined
    if (typeof window === 'undefined' || !('Notification' in window)) return undefined

    if (Notification.permission === 'default') {
      Notification.requestPermission().catch(() => undefined)
    }

    const source = new EventSource('/api/video-ops/render-events/stream', { withCredentials: true })
    const handler = (e: MessageEvent) => {
      let payload: RenderFinishedPayload = {}
      try { payload = JSON.parse(e.data) } catch { /* ignore */ }
      if (Notification.permission !== 'granted') return
      if (typeof document !== 'undefined' && !document.hidden) return
      const ok = payload.status === 'SUCCEEDED'
      const title = ok ? '✅ Vidéo rendue' : '⚠️ Rendu échoué'
      const body = ok
        ? `Run #${payload.runId ?? '?'} terminé. Idée ${payload.contentIdeaId ?? '?'}.`
        : `Run #${payload.runId ?? '?'} : ${payload.errorMessage ?? 'erreur inconnue'}.`
      try {
        const notification = new Notification(title, {
          body,
          tag: `render-${payload.runId ?? Date.now()}`,
        })
        notification.onclick = () => {
          window.focus()
          notification.close()
        }
      } catch {
        // Some browsers throw when permission is granted but the page is in a
        // private window — silently ignore.
      }
    }
    source.addEventListener('render_finished', handler as EventListener)
    return () => {
      source.removeEventListener('render_finished', handler as EventListener)
      source.close()
    }
  }, [enabled])

  if (typeof window === 'undefined' || !('Notification' in window)) return 'unavailable'
  return Notification.permission
}
