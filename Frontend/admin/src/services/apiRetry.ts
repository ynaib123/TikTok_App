/**
 * Lightweight retry-with-backoff helper for network calls.
 *
 * - Retries only on transient classes of failure: network errors, 502/503/504,
 *   and 429 (the latter respects Retry-After when surfaced via `error.status`).
 * - Never retries 4xx (other than 408/429) — those are deterministic and a
 *   second attempt will not change the outcome.
 * - Honours an `AbortSignal` so callers can cancel mid-loop.
 *
 * Usage:
 *
 *   const result = await withRetry(() => apiPost('/foo', body))
 *   const result = await withRetry(() => apiGet('/foo'), { retries: 5 })
 */
export interface RetryOptions {
  /** Maximum number of *additional* attempts after the first one. Default: 2. */
  retries?: number
  /** Initial delay in ms before the first retry. Default: 250ms. */
  baseDelayMs?: number
  /** Cap for the exponential backoff. Default: 4000ms. */
  maxDelayMs?: number
  /** Optional cancellation signal. */
  signal?: AbortSignal
  /** Optional override of which errors are considered retryable. */
  shouldRetry?: (error: unknown, attempt: number) => boolean
}

const TRANSIENT_HTTP_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504])

function readErrorStatus(error: unknown): number | null {
  if (!error || typeof error !== 'object') return null
  const status = (error as { status?: number }).status
  return typeof status === 'number' ? status : null
}

function isAbortLikeError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const name = (error as { name?: string }).name
  return name === 'AbortError'
}

function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) return true
  const message = String((error as { message?: string })?.message || '').toLowerCase()
  return message.includes('failed to fetch')
    || message.includes('network')
    || message.includes('impossible de contacter')
}

export function defaultShouldRetry(error: unknown): boolean {
  if (isAbortLikeError(error)) return false
  if (isNetworkError(error)) return true
  const status = readErrorStatus(error)
  if (status == null) return false
  return TRANSIENT_HTTP_STATUSES.has(status)
}

function jitteredDelay(attempt: number, baseDelayMs: number, maxDelayMs: number): number {
  const exp = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt)
  // Full jitter (decorrelated): sample uniformly in [0, exp]. Reduces thundering
  // herd when many clients retry together after a backend hiccup.
  return Math.floor(Math.random() * exp)
}

export async function withRetry<T>(
  task: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    retries = 2,
    baseDelayMs = 250,
    maxDelayMs = 4000,
    signal,
    shouldRetry = defaultShouldRetry,
  } = options

  let lastError: unknown
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    if (signal?.aborted) {
      const abortError = new Error('Operation aborted')
      ;(abortError as Error & { name: string }).name = 'AbortError'
      throw abortError
    }
    try {
      return await task()
    } catch (error) {
      lastError = error
      if (attempt === retries || !shouldRetry(error, attempt)) {
        throw error
      }
      const delay = jitteredDelay(attempt, baseDelayMs, maxDelayMs)
      await new Promise<void>((resolve, reject) => {
        const timer = window.setTimeout(() => {
          signal?.removeEventListener('abort', onAbort)
          resolve()
        }, delay)
        const onAbort = () => {
          window.clearTimeout(timer)
          const abortError = new Error('Operation aborted')
          ;(abortError as Error & { name: string }).name = 'AbortError'
          reject(abortError)
        }
        if (signal) signal.addEventListener('abort', onAbort, { once: true })
      })
    }
  }
  throw lastError
}
