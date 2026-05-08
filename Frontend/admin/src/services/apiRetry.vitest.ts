import { describe, expect, test, vi } from 'vitest'

import { defaultShouldRetry, withRetry } from './apiRetry'

describe('defaultShouldRetry', () => {
  test('retries network errors', () => {
    expect(defaultShouldRetry(new TypeError('Failed to fetch'))).toBe(true)
  })

  test('retries 5xx and 429', () => {
    expect(defaultShouldRetry({ status: 502 })).toBe(true)
    expect(defaultShouldRetry({ status: 429 })).toBe(true)
    expect(defaultShouldRetry({ status: 503 })).toBe(true)
  })

  test('does not retry 4xx (except 408/425/429)', () => {
    expect(defaultShouldRetry({ status: 400 })).toBe(false)
    expect(defaultShouldRetry({ status: 401 })).toBe(false)
    expect(defaultShouldRetry({ status: 404 })).toBe(false)
  })

  test('does not retry abort errors', () => {
    const err = new Error('Operation aborted') as Error & { name: string }
    err.name = 'AbortError'
    expect(defaultShouldRetry(err)).toBe(false)
  })
})

describe('withRetry', () => {
  test('returns the result on first success', async () => {
    const task = vi.fn().mockResolvedValue('ok')
    expect(await withRetry(task)).toBe('ok')
    expect(task).toHaveBeenCalledTimes(1)
  })

  test('retries up to the configured count then throws', async () => {
    const task = vi.fn().mockRejectedValue({ status: 503 })
    await expect(withRetry(task, { retries: 2, baseDelayMs: 1, maxDelayMs: 1 })).rejects.toMatchObject({ status: 503 })
    expect(task).toHaveBeenCalledTimes(3)
  })

  test('does not retry deterministic 4xx', async () => {
    const task = vi.fn().mockRejectedValue({ status: 400 })
    await expect(withRetry(task, { retries: 5, baseDelayMs: 1, maxDelayMs: 1 })).rejects.toMatchObject({ status: 400 })
    expect(task).toHaveBeenCalledTimes(1)
  })

  test('eventually succeeds after a transient failure', async () => {
    const task = vi.fn()
      .mockRejectedValueOnce({ status: 502 })
      .mockResolvedValue('ok')
    expect(await withRetry(task, { retries: 3, baseDelayMs: 1, maxDelayMs: 1 })).toBe('ok')
    expect(task).toHaveBeenCalledTimes(2)
  })
})
