import { useQueries, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import {
  fetchDashboardData,
  fetchVideoOpsHealth,
  fetchVideoOpsObservability,
} from '../services/videoOpsSupabase.js';
import type {
  VideoOpsDashboard,
  VideoOpsHealth,
  VideoOpsObservability,
} from '../types';

const REFRESH_INTERVAL_MS = 30_000;

export const VIDEO_DASHBOARD_QUERY_KEYS = {
  health: ['video-dashboard', 'health'] as const,
  observability: ['video-dashboard', 'observability'] as const,
  dashboard: ['video-dashboard', 'dashboard'] as const,
};

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
        queryKey: VIDEO_DASHBOARD_QUERY_KEYS.health,
        queryFn: fetchVideoOpsHealth as () => Promise<VideoOpsHealth>,
        refetchInterval: REFRESH_INTERVAL_MS,
      },
      {
        queryKey: VIDEO_DASHBOARD_QUERY_KEYS.observability,
        queryFn: fetchVideoOpsObservability as () => Promise<VideoOpsObservability>,
        refetchInterval: REFRESH_INTERVAL_MS,
      },
      {
        queryKey: VIDEO_DASHBOARD_QUERY_KEYS.dashboard,
        queryFn: fetchDashboardData as () => Promise<VideoOpsDashboard>,
        refetchInterval: REFRESH_INTERVAL_MS,
      },
    ],
  });

  const [healthQuery, observabilityQuery, dashboardQuery] = results;

  const refresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: VIDEO_DASHBOARD_QUERY_KEYS.health }),
      queryClient.invalidateQueries({ queryKey: VIDEO_DASHBOARD_QUERY_KEYS.observability }),
      queryClient.invalidateQueries({ queryKey: VIDEO_DASHBOARD_QUERY_KEYS.dashboard }),
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
