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
