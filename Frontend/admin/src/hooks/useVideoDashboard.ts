import { useQueries, useQueryClient } from '@tanstack/react-query';
import type { Query } from '@tanstack/react-query';
import { useCallback } from 'react';

import {
  fetchDashboardData,
  fetchVideoOpsHealth,
  fetchVideoOpsObservability,
} from '../services/videoOpsSupabase';
import type {
  VideoOpsDashboard,
  VideoOpsHealth,
  VideoOpsObservability,
} from '../types';
import { VIDEO_OPS_QUERY_KEYS, VIDEO_OPS_STALE_TIMES } from '../services/videoOpsQueries';
import { pollIntervalForCollection } from './useAdaptivePolling';

const REFRESH_INTERVAL_MS = 30_000;

const ACTIVE_DASHBOARD_INTERVAL_MS = 5_000;

function adaptiveDashboardInterval(observability: VideoOpsObservability | undefined): number {
  if (!observability) return REFRESH_INTERVAL_MS;
  const runs = observability.recentRuns ?? [];
  const hasActiveRun = runs.some((r) => r.status !== 'SUCCEEDED' && r.status !== 'FAILED');
  return hasActiveRun ? ACTIVE_DASHBOARD_INTERVAL_MS : REFRESH_INTERVAL_MS;
}

export interface UseVideoDashboardResult {
  health: VideoOpsHealth | null;
  observability: VideoOpsObservability | null;
  dashboard: VideoOpsDashboard | null;
  isLoading: boolean;
  isFetching: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

function toErrorMessage(err: unknown): string | null {
  if (!err) return null;
  if (err instanceof Error) return err.message;
  return String(err);
}

export function useVideoDashboard(): UseVideoDashboardResult {
  const queryClient = useQueryClient();

  const results = useQueries({
    queries: [
      {
        queryKey: VIDEO_OPS_QUERY_KEYS.health,
        queryFn: fetchVideoOpsHealth as () => Promise<VideoOpsHealth>,
        refetchInterval: REFRESH_INTERVAL_MS,
        staleTime: VIDEO_OPS_STALE_TIMES.health,
        placeholderData: (previousData: VideoOpsHealth | undefined) => previousData,
      },
      {
        queryKey: VIDEO_OPS_QUERY_KEYS.observability,
        queryFn: fetchVideoOpsObservability as () => Promise<VideoOpsObservability>,
        refetchInterval: (query: Query<VideoOpsObservability>) =>
          adaptiveDashboardInterval(query.state.data),
        staleTime: VIDEO_OPS_STALE_TIMES.observability,
        placeholderData: (previousData: VideoOpsObservability | undefined) => previousData,
      },
      {
        queryKey: VIDEO_OPS_QUERY_KEYS.dashboard,
        queryFn: fetchDashboardData as () => Promise<VideoOpsDashboard>,
        refetchInterval: (query: Query<VideoOpsDashboard>) => {
          const data = query.state.data;
          const obs: VideoOpsObservability | undefined = data
            ? { recentRuns: data.recentRuns ?? [] }
            : undefined;
          return adaptiveDashboardInterval(obs);
        },
        staleTime: VIDEO_OPS_STALE_TIMES.dashboard,
        placeholderData: (previousData: VideoOpsDashboard | undefined) => previousData,
      },
    ],
  });

  const [healthQuery, observabilityQuery, dashboardQuery] = results;

  const refresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: VIDEO_OPS_QUERY_KEYS.health }),
      queryClient.invalidateQueries({ queryKey: VIDEO_OPS_QUERY_KEYS.observability }),
      queryClient.invalidateQueries({ queryKey: VIDEO_OPS_QUERY_KEYS.dashboard }),
    ]);
  }, [queryClient]);

  const firstError =
    healthQuery.error || observabilityQuery.error || dashboardQuery.error;

  return {
    health: (healthQuery.data ?? null) as VideoOpsHealth | null,
    observability: (observabilityQuery.data ?? null) as VideoOpsObservability | null,
    dashboard: (dashboardQuery.data ?? null) as VideoOpsDashboard | null,
    isLoading: results.some((r) => r.isLoading),
    isFetching: results.some((r) => r.isFetching),
    error: toErrorMessage(firstError),
    refresh,
  };
}
