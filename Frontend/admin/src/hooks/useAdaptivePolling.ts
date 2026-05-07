/**
 * Phase 2.10 — adaptive polling helper. Returns a refetchInterval value
 * suitable for react-query, based on the current pipeline stage of the
 * watched content idea. Active stages poll fast; terminal stages stop.
 */
export function pollIntervalForStage(stage?: string | null): number | false {
  const normalised = String(stage ?? '').toUpperCase()
  switch (normalised) {
    case 'RENDERING_REQUESTED':
    case 'UPLOAD_PREPARING':
      return 1500
    case 'RENDER_READY':
    case 'PUBLISH_INITIALIZED':
    case 'UPLOAD_COMPLETED':
      return 5000
    case 'PUBLISHED':
    case 'FAILED':
      return false
    default:
      return 30_000
  }
}

interface StageBearing {
  pipelineStatus?: string | null
  status?: string | null
}

const IDLE_INTERVAL_MS = 30_000

/**
 * Picks the most "active" interval among a collection of stage-bearing items.
 * - Returns the smallest positive interval found (fastest polling wins).
 * - Falls back to IDLE_INTERVAL_MS when nothing is in flight.
 * - Never returns `false` — collection-level polling stays alive so newly
 *   started ideas pick up their fast cadence on the next tick.
 */
export function pollIntervalForCollection(items: ReadonlyArray<StageBearing> | undefined | null): number {
  if (!items || items.length === 0) return IDLE_INTERVAL_MS
  let best = IDLE_INTERVAL_MS
  for (const item of items) {
    const stage = item.pipelineStatus ?? item.status ?? null
    const interval = pollIntervalForStage(stage)
    if (interval === false) continue
    if (interval < best) best = interval
  }
  return best
}
