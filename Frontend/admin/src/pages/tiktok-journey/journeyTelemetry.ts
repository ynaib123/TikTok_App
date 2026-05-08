import { recordAdminPerf } from '../../services/adminPerformance'

/**
 * Lightweight, replaceable telemetry surface for the TikTok journey.
 *
 * - Each event is a plain `{name, payload}` record so the sink stays trivial
 *   to back with PostHog, Segment, or a custom collector later.
 * - The default sink writes to the existing admin-perf channel (visible from
 *   `window.__adminPerf.entries()`) and to `console.debug` in dev. Production
 *   can call `setJourneyTelemetrySink` once at boot to forward elsewhere.
 * - The helpers (`trackIdeaGenerated`, `trackRenderStarted`, etc.) document
 *   the event vocabulary in one place — call sites import the helpers, never
 *   the raw event names, so renames stay grep-friendly.
 */

export type JourneyTelemetryEventName =
  | 'journey.idea_generated'
  | 'journey.render_started'
  | 'journey.render_completed'
  | 'journey.render_failed'
  | 'journey.video_uploaded'
  | 'journey.video_published'
  | 'journey.bulk_delete'
  | 'journey.workspace_resumed'

export interface JourneyTelemetryEvent {
  name: JourneyTelemetryEventName
  payload: Record<string, unknown>
}

export type JourneyTelemetrySink = (event: JourneyTelemetryEvent) => void

let activeSink: JourneyTelemetrySink = (event) => {
  recordAdminPerf(event.name, 0, event.payload)
  if (import.meta.env?.DEV) {
    // eslint-disable-next-line no-console
    console.debug(`[journey] ${event.name}`, event.payload)
  }
}

/**
 * Replace the active sink. Pass `null` to revert to the default sink.
 */
export function setJourneyTelemetrySink(sink: JourneyTelemetrySink | null) {
  activeSink = sink ?? ((event) => {
    recordAdminPerf(event.name, 0, event.payload)
  })
}

function emit(name: JourneyTelemetryEventName, payload: Record<string, unknown> = {}) {
  try {
    activeSink({ name, payload: { ...payload, ts: Date.now() } })
  } catch {
    // Telemetry must never break the user flow.
  }
}

export const journeyTelemetry = {
  trackIdeaGenerated(payload: { contentIdeaId: number | null; category?: string | null; sceneCount?: number | null; durationMs?: number | null }) {
    emit('journey.idea_generated', payload)
  },
  trackRenderStarted(payload: { contentIdeaId: number | null; templateId?: string | null; qualityProfile?: string | null; sceneCount?: number | null }) {
    emit('journey.render_started', payload)
  },
  trackRenderCompleted(payload: { contentIdeaId: number | null; runId?: number | string | null; durationMs?: number | null }) {
    emit('journey.render_completed', payload)
  },
  trackRenderFailed(payload: { contentIdeaId: number | null; runId?: number | string | null; reason?: string | null }) {
    emit('journey.render_failed', payload)
  },
  trackVideoUploaded(payload: { contentIdeaId: number | null }) {
    emit('journey.video_uploaded', payload)
  },
  trackVideoPublished(payload: { contentIdeaId: number | null }) {
    emit('journey.video_published', payload)
  },
  trackBulkDelete(payload: { count: number; ok: boolean; durationMs?: number | null }) {
    emit('journey.bulk_delete', payload)
  },
  trackWorkspaceResumed(payload: { contentIdeaId: number | null }) {
    emit('journey.workspace_resumed', payload)
  },
}

export type JourneyTelemetry = typeof journeyTelemetry
