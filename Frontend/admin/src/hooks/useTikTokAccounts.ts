import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { disconnectTikTokAccount, fetchAccountsOverview } from '../services/videoOpsSupabase.js';
import { createTikTokAuthorizationUrl } from '../services/tiktokOAuthApi.js';
import type { AccountsOverview, TikTokAccount } from '../types';
import {
  fetchAndPrimeVideoOpsBootstrap,
  VIDEO_OPS_QUERY_KEYS,
  VIDEO_OPS_STALE_TIMES,
} from '../services/videoOpsQueries';

const EMPTY_OVERVIEW: AccountsOverview = {
  tiktokAccounts: [],
  serviceConnections: [],
  readiness: {
    ready: false,
    connectedTikTokAccounts: 0,
    missingItems: [],
  },
};

// Politique de recuperation : retry exponentiel + refetch agressif sur erreur
// pour que la page se reanime en ~5s apres un blip backend (vs jamais sans
// focus de la fenetre dans la config par defaut react-query).
const RECOVERY_RETRY = 3;
const RECOVERY_RETRY_DELAY = (attempt: number) => Math.min(1000 * 2 ** attempt, 10_000);
const RECOVERY_REFETCH_ON_ERROR_MS = 5_000;
const RECOVERY_REFETCH_HEALTHY_MS = 30_000;
function recoveryRefetchInterval<T>(query: { state: { error: Error | null; data: T | undefined } }): number {
  return query.state.error ? RECOVERY_REFETCH_ON_ERROR_MS : RECOVERY_REFETCH_HEALTHY_MS;
}

export function useTikTokAccounts() {
  const queryClient = useQueryClient();
  const cachedOverview = queryClient.getQueryData<AccountsOverview>(VIDEO_OPS_QUERY_KEYS.accountsOverview);

  const bootstrapQuery = useQuery({
    queryKey: VIDEO_OPS_QUERY_KEYS.bootstrap,
    queryFn: () => fetchAndPrimeVideoOpsBootstrap(queryClient),
    staleTime: VIDEO_OPS_STALE_TIMES.bootstrap,
    refetchInterval: recoveryRefetchInterval,
    retry: RECOVERY_RETRY,
    retryDelay: RECOVERY_RETRY_DELAY,
    placeholderData: (previousData) => previousData,
  });

  const overviewQuery = useQuery<AccountsOverview>({
    queryKey: VIDEO_OPS_QUERY_KEYS.accountsOverview,
    queryFn: fetchAccountsOverview,
    enabled: !bootstrapQuery.isPending || Boolean(cachedOverview),
    initialData: () => queryClient.getQueryData<AccountsOverview>(VIDEO_OPS_QUERY_KEYS.accountsOverview),
    staleTime: VIDEO_OPS_STALE_TIMES.accountsOverview,
    refetchInterval: recoveryRefetchInterval,
    retry: RECOVERY_RETRY,
    retryDelay: RECOVERY_RETRY_DELAY,
    placeholderData: (previousData) => previousData,
  });

  const refresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: VIDEO_OPS_QUERY_KEYS.bootstrap }),
      queryClient.invalidateQueries({ queryKey: VIDEO_OPS_QUERY_KEYS.accountsOverview }),
      queryClient.invalidateQueries({ queryKey: VIDEO_OPS_QUERY_KEYS.accountsReadiness }),
      queryClient.invalidateQueries({ queryKey: VIDEO_OPS_QUERY_KEYS.tiktokAccounts }),
      queryClient.invalidateQueries({ queryKey: VIDEO_OPS_QUERY_KEYS.contentIdeas }),
    ]);
  }, [queryClient]);

  const connect = useCallback(async (redirectPath = '/accounts') => {
    const response = await createTikTokAuthorizationUrl(redirectPath);
    return response;
  }, []);

  const disconnect = useCallback(async (accountId: number | string) => {
    await disconnectTikTokAccount(accountId);
    await refresh();
  }, [refresh]);

  const accounts = useMemo<TikTokAccount[]>(
    () => overviewQuery.data?.tiktokAccounts ?? EMPTY_OVERVIEW.tiktokAccounts,
    [overviewQuery.data],
  );

  return {
    accounts,
    error: overviewQuery.error,
    isLoading: overviewQuery.isLoading,
    isRefetching: overviewQuery.isRefetching,
    overview: overviewQuery.data ?? EMPTY_OVERVIEW,
    connect,
    disconnect,
    refresh,
  };
}
