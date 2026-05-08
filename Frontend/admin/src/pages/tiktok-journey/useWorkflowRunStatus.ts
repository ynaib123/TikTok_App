import { useQuery } from '@tanstack/react-query'

import { fetchWorkflowRunStatus, type WorkflowRunStatus } from '../../services/videoOpsSupabase'

/**
 * Polls the lightweight `GET /workflow-runs/:id/status` endpoint while a run
 * is not in a terminal state.
 *
 * - Disabled when `runId` is null/undefined or `enabled` is false.
 * - Stops polling once the response reports `terminal: true`.
 * - Default interval is 6 s — short enough that the UI feels live, long enough
 *   that a long render (10+ min) doesn't hammer the backend.
 *
 * The hook intentionally does NOT replace `useRenderProgress` (which talks to
 * the Remotion render service for fine-grained progress percent). It is the
 * fallback that surfaces a stuck / dropped run to the user before the backend
 * StuckWorkflowRunDetector flips it to FAILED.
 */
export interface UseWorkflowRunStatusOptions {
  runId: number | string | null | undefined
  enabled?: boolean
  intervalMs?: number
}

export interface UseWorkflowRunStatusResult {
  status: WorkflowRunStatus | undefined
  isPolling: boolean
  isError: boolean
  error: Error | null
}

const DEFAULT_INTERVAL_MS = 6000
const STALE_AGE_WARN_MS = 60_000

export function useWorkflowRunStatus({
  runId,
  enabled = true,
  intervalMs = DEFAULT_INTERVAL_MS,
}: UseWorkflowRunStatusOptions): UseWorkflowRunStatusResult & { isStale: boolean } {
  const id = runId == null ? null : Number(runId) || null

  const query = useQuery<WorkflowRunStatus, Error>({
    queryKey: ['workflow-run-status', id],
    queryFn: () => fetchWorkflowRunStatus(id as number),
    enabled: Boolean(id) && enabled,
    // Poll while the run is non-terminal; stop the moment we see terminal=true.
    refetchInterval: (next) => {
      const data = next.state.data
      if (!data) return intervalMs
      return data.terminal ? false : intervalMs
    },
    refetchOnWindowFocus: false,
    staleTime: 0,
    retry: 1,
  })

  return {
    status: query.data,
    isPolling: query.isFetching && !(query.data?.terminal ?? false),
    isError: query.isError,
    error: query.error ?? null,
    // The user has been waiting > 60 s without terminal — surface a hint in the
    // UI so the StuckDetector grace period (~10 min) is not silent.
    isStale: Boolean(query.data && !query.data.terminal && query.data.ageMs > STALE_AGE_WARN_MS),
  }
}
