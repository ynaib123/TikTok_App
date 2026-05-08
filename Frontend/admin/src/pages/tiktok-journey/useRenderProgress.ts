import { useEffect, useRef, useState } from 'react'
import { fetchRenderVideoProgress, type RenderProgress } from '../../services/videoOpsSupabase'

const POLL_INTERVAL_MS = 700

export interface UseRenderProgressResult {
  progress: number // 0..1
  status: RenderProgress['status']
  outputUrl: string | null
  error: string | null
  startedAt: number | null // epoch ms du démarrage du rendu côté RenderVideo
}

/**
 * Poll l'endpoint /render-video/progress/:runId pour suivre l'avancement
 * d'un rendu en cours. S'arrete automatiquement quand le rendu est `done`
 * ou `error`, ou quand `enabled` repasse a false.
 */
export function useRenderProgress(runId: number | string | null | undefined, enabled: boolean): UseRenderProgressResult {
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<RenderProgress['status']>('unknown')
  const [outputUrl, setOutputUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const cancelRef = useRef(false)

  useEffect(() => {
    cancelRef.current = false
    if (!enabled || !runId) {
      // Reset propre quand on quitte ou qu on n a pas de run a suivre.
      setProgress(0)
      setStatus('unknown')
      setOutputUrl(null)
      setError(null)
      setStartedAt(null)
      return () => {
        cancelRef.current = true
      }
    }

    const poll = async () => {
      while (!cancelRef.current) {
        try {
          const result = await fetchRenderVideoProgress(runId)
          if (cancelRef.current) return
          setProgress(Math.max(0, Math.min(1, result.progress)))
          setStatus(result.status)
          setOutputUrl(result.outputUrl)
          setError(result.error)
          setStartedAt(result.startedAt)
          if (result.status === 'done' || result.status === 'error') {
            return
          }
        } catch (err) {
          // Ignore — on retentera au prochain tick. Le hook reste vivant.
          if (cancelRef.current) return
        }
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
      }
    }
    void poll()

    return () => {
      cancelRef.current = true
    }
  }, [runId, enabled])

  return { progress, status, outputUrl, error, startedAt }
}
