import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { BatchPublish } from '../types/batchPublish';

vi.mock('../services/batchPublishApi', () => ({
  startBatchPublish: vi.fn(),
  fetchBatchPublish: vi.fn(),
}));

import { useBatchPublish } from './useBatchPublish';
import * as api from '../services/batchPublishApi';

const startMock = api.startBatchPublish as unknown as ReturnType<typeof vi.fn>;
const fetchMock = api.fetchBatchPublish as unknown as ReturnType<typeof vi.fn>;

function makeBatch(overrides: Partial<BatchPublish> = {}): BatchPublish {
  return {
    batchId: 'batch-1',
    status: 'RUNNING',
    totalCount: 2,
    completedCount: 0,
    failedCount: 0,
    pendingCount: 2,
    createdAt: '2026-05-04T10:00:00Z',
    updatedAt: '2026-05-04T10:00:00Z',
    completedAt: null,
    items: [
      { contentIdeaId: 1, status: 'PENDING', errorMessage: null, workflowRunId: null, attemptNumber: 1, completedAt: null },
      { contentIdeaId: 2, status: 'PENDING', errorMessage: null, workflowRunId: null, attemptNumber: 1, completedAt: null },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  startMock.mockReset();
  fetchMock.mockReset();
  try { sessionStorage.clear(); } catch { /* noop */ }
});

describe('useBatchPublish', () => {
  it('starts in idle phase', () => {
    const { result } = renderHook(() => useBatchPublish());
    expect(result.current.phase).toBe('idle');
    expect(result.current.batch).toBeNull();
  });

  it('start() transitions through running and reaches completed via polling', async () => {
    startMock.mockResolvedValue(makeBatch({ status: 'RUNNING' }));
    fetchMock.mockResolvedValueOnce(
      makeBatch({
        status: 'COMPLETED',
        completedCount: 2,
        failedCount: 0,
        pendingCount: 0,
        items: [
          { contentIdeaId: 1, status: 'PUBLISHED', errorMessage: null, workflowRunId: 10, attemptNumber: 1, completedAt: '2026-05-04T10:01:00Z' },
          { contentIdeaId: 2, status: 'PUBLISHED', errorMessage: null, workflowRunId: 11, attemptNumber: 1, completedAt: '2026-05-04T10:01:01Z' },
        ],
      }),
    );

    const { result } = renderHook(() => useBatchPublish());
    await act(async () => {
      await result.current.start({ contentIdeaIds: [1, 2] });
    });
    expect(result.current.phase).toBe('running');

    await waitFor(() => expect(result.current.phase).toBe('completed'), { timeout: 5000 });
    expect(result.current.batch?.completedCount).toBe(2);
  });

  it('reports partial_failure phase when polling returns mixed results', async () => {
    startMock.mockResolvedValue(makeBatch({ status: 'RUNNING' }));
    fetchMock.mockResolvedValueOnce(
      makeBatch({
        status: 'PARTIAL_FAILURE',
        completedCount: 1,
        failedCount: 1,
        pendingCount: 0,
        items: [
          { contentIdeaId: 1, status: 'PUBLISHED', errorMessage: null, workflowRunId: 10, attemptNumber: 1, completedAt: 'x' },
          { contentIdeaId: 2, status: 'FAILED', errorMessage: 'TikTok 401', workflowRunId: null, attemptNumber: 1, completedAt: 'y' },
        ],
      }),
    );

    const { result } = renderHook(() => useBatchPublish());
    await act(async () => { await result.current.start({ contentIdeaIds: [1, 2] }); });
    await waitFor(() => expect(result.current.phase).toBe('partial_failure'), { timeout: 5000 });
    expect(result.current.batch?.failedCount).toBe(1);
  });

  it('retryFailed() reissues start() with only the FAILED ids', async () => {
    startMock
      .mockResolvedValueOnce(
        makeBatch({
          status: 'PARTIAL_FAILURE',
          completedCount: 1,
          failedCount: 1,
          pendingCount: 0,
          items: [
            { contentIdeaId: 1, status: 'PUBLISHED', errorMessage: null, workflowRunId: 10, attemptNumber: 1, completedAt: 'x' },
            { contentIdeaId: 2, status: 'FAILED', errorMessage: 'boom', workflowRunId: null, attemptNumber: 1, completedAt: 'y' },
          ],
        }),
      )
      .mockResolvedValueOnce(
        makeBatch({
          batchId: 'batch-2',
          status: 'RUNNING',
          totalCount: 1,
          pendingCount: 1,
          items: [
            { contentIdeaId: 2, status: 'PENDING', errorMessage: null, workflowRunId: null, attemptNumber: 1, completedAt: null },
          ],
        }),
      );

    const { result } = renderHook(() => useBatchPublish());
    await act(async () => { await result.current.start({ contentIdeaIds: [1, 2] }); });
    await waitFor(() => expect(result.current.phase).toBe('partial_failure'), { timeout: 5000 });

    await act(async () => { await result.current.retryFailed(); });

    expect(startMock).toHaveBeenLastCalledWith({
      contentIdeaIds: [2],
      tiktokAccountOpenId: undefined,
    });
    expect(result.current.batch?.batchId).toBe('batch-2');
  });

  it('start() in error state when API throws', async () => {
    startMock.mockRejectedValueOnce(new Error('network down'));
    const { result } = renderHook(() => useBatchPublish());
    await act(async () => { await result.current.start({ contentIdeaIds: [1] }); });
    expect(result.current.phase).toBe('error');
    expect(result.current.errorMessage).toMatch(/network down/);
  });

  it('reset() clears state and persisted batch id', async () => {
    startMock.mockResolvedValue(makeBatch({ status: 'COMPLETED', completedCount: 2, pendingCount: 0 }));
    const { result } = renderHook(() => useBatchPublish());
    await act(async () => { await result.current.start({ contentIdeaIds: [1, 2] }); });
    act(() => result.current.reset());
    expect(result.current.phase).toBe('idle');
    expect(result.current.batch).toBeNull();
  });
});
