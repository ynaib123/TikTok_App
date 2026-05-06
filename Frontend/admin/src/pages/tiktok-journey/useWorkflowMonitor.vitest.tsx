import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'

import type { ContentIdea } from '../../types'
import { useWorkflowMonitor } from './useWorkflowMonitor'

describe('useWorkflowMonitor', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  test('waitForNewIdeas retries after a transient fetch failure and returns the new idea', async () => {
    vi.useFakeTimers()

    const createdIdea: ContentIdea = {
      id: 84,
      category: 'Food',
      topic: 'Food topic',
      script: null,
      caption: null,
      keyword: null,
      shotstackStatus: null,
      tiktokStatus: null,
      finalVideoStatus: null,
      shotstackUrl: null,
      uploadUrl: null,
      tiktokAccountOpenId: null,
      pipelineStatus: null,
      lastError: null,
    }

    const fetchRecentContentIdeas = vi
      .fn<() => Promise<ContentIdea[]>>()
      .mockRejectedValueOnce(new Error('temporary auth refresh'))
      .mockResolvedValueOnce([createdIdea])

    const { result } = renderHook(() => useWorkflowMonitor({
      fetchContentIdeaById: vi.fn().mockResolvedValue(null),
      fetchManualActions: vi.fn().mockResolvedValue([]),
      fetchContentIdeaStatus: vi.fn().mockResolvedValue(null),
      fetchRecentContentIdeas,
      fetchWorkflowRun: vi.fn().mockResolvedValue(null),
    }))

    const pendingResult = result.current.waitForNewIdeas(83, 1, 'Food')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500)
    })

    await expect(pendingResult).resolves.toEqual([
      createdIdea,
    ])
    expect(fetchRecentContentIdeas).toHaveBeenCalledTimes(2)
  })
})
