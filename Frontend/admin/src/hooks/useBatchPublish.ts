import { useCallback, useEffect, useRef, useState } from 'react';
import type { BatchPublish, BatchPublishStartRequest } from '../types/batchPublish';
import { fetchBatchPublish, startBatchPublish } from '../services/batchPublishApi';

export type BatchPhase = 'idle' | 'starting' | 'running' | 'completed' | 'partial_failure' | 'failed' | 'error';

export interface UseBatchPublishState {
  phase: BatchPhase;
  batch: BatchPublish | null;
  errorMessage: string | null;
  start: (request: BatchPublishStartRequest) => Promise<BatchPublish | null>;
  reset: () => void;
  retryFailed: () => Promise<BatchPublish | null>;
  cancelPolling: () => void;
}

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;
const SESSION_KEY = 'tiktok-app:active-batch-id';

function deriveTerminalPhase(batch: BatchPublish | null): BatchPhase {
  if (!batch) return 'idle';
  switch (batch.status) {
    case 'COMPLETED': return 'completed';
    case 'PARTIAL_FAILURE': return 'partial_failure';
    case 'FAILED': return 'failed';
    case 'CANCELLED': return 'failed';
    case 'RUNNING':
    default: return 'running';
  }
}

export function useBatchPublish(initialAccountOpenId?: string | null): UseBatchPublishState {
  const [batch, setBatch] = useState<BatchPublish | null>(null);
  const [phase, setPhase] = useState<BatchPhase>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const pollTimerRef = useRef<number | null>(null);
  const pollDeadlineRef = useRef<number>(0);
  const accountRef = useRef<string | null>(initialAccountOpenId ?? null);

  useEffect(() => {
    accountRef.current = initialAccountOpenId ?? null;
  }, [initialAccountOpenId]);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current !== null) {
      window.clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const schedulePoll = useCallback((batchId: string) => {
    const queueNextPoll = () => {
      stopPolling();
      pollTimerRef.current = window.setTimeout(async () => {
        pollTimerRef.current = null;
        try {
          const next = await fetchBatchPublish(batchId);
          setBatch(next);
          const nextPhase = deriveTerminalPhase(next);
          setPhase(nextPhase);
          if (nextPhase === 'running' && Date.now() < pollDeadlineRef.current) {
            queueNextPoll();
          } else if (nextPhase !== 'running') {
            try { sessionStorage.removeItem(SESSION_KEY); } catch { /* noop */ }
          }
        } catch (err) {
          setErrorMessage(err instanceof Error ? err.message : 'Erreur de polling');
          setPhase('error');
        }
      }, POLL_INTERVAL_MS);
    };

    queueNextPoll();
  }, [stopPolling]);

  const beginPolling = useCallback((batchId: string) => {
    pollDeadlineRef.current = Date.now() + POLL_TIMEOUT_MS;
    try { sessionStorage.setItem(SESSION_KEY, batchId); } catch { /* noop */ }
    schedulePoll(batchId);
  }, [schedulePoll]);

  const start = useCallback(async (request: BatchPublishStartRequest): Promise<BatchPublish | null> => {
    setErrorMessage(null);
    setPhase('starting');
    try {
      const initial = await startBatchPublish(request);
      setBatch(initial);
      const initialPhase = deriveTerminalPhase(initial);
      setPhase(initialPhase);
      if (initialPhase === 'running') beginPolling(initial.batchId);
      return initial;
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Erreur lors du lancement du lot');
      setPhase('error');
      return null;
    }
  }, [beginPolling]);

  const reset = useCallback(() => {
    stopPolling();
    setBatch(null);
    setPhase('idle');
    setErrorMessage(null);
    try { sessionStorage.removeItem(SESSION_KEY); } catch { /* noop */ }
  }, [stopPolling]);

  const retryFailed = useCallback(async (): Promise<BatchPublish | null> => {
    if (!batch) return null;
    const failedIds = batch.items.filter((i) => i.status === 'FAILED').map((i) => i.contentIdeaId);
    if (failedIds.length === 0) return null;
    return start({
      contentIdeaIds: failedIds,
      tiktokAccountOpenId: accountRef.current ?? undefined,
    });
  }, [batch, start]);

  // Reattach to an in-progress batch on mount (survives F5).
  useEffect(() => {
    let cancelled = false;
    const persistedId = (() => {
      try { return sessionStorage.getItem(SESSION_KEY); } catch { return null; }
    })();
    if (!persistedId) return;
    (async () => {
      try {
        const existing = await fetchBatchPublish(persistedId);
        if (cancelled) return;
        setBatch(existing);
        const ph = deriveTerminalPhase(existing);
        setPhase(ph);
        if (ph === 'running') beginPolling(existing.batchId);
        else { try { sessionStorage.removeItem(SESSION_KEY); } catch { /* noop */ } }
      } catch {
        try { sessionStorage.removeItem(SESSION_KEY); } catch { /* noop */ }
      }
    })();
    return () => { cancelled = true; };
  }, [beginPolling]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  return {
    phase,
    batch,
    errorMessage,
    start,
    reset,
    retryFailed,
    cancelPolling: stopPolling,
  };
}
