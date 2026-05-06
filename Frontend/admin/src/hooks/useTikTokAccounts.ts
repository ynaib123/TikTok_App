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

export function useTikTokAccounts() {
  const queryClient = useQueryClient();
  const cachedOverview = queryClient.getQueryData<AccountsOverview>(VIDEO_OPS_QUERY_KEYS.accountsOverview);

  const bootstrapQuery = useQuery({
    queryKey: VIDEO_OPS_QUERY_KEYS.bootstrap,
    queryFn: () => fetchAndPrimeVideoOpsBootstrap(queryClient),
    staleTime: VIDEO_OPS_STALE_TIMES.bootstrap,
    placeholderData: (previousData) => previousData,
  });

  const overviewQuery = useQuery<AccountsOverview>({
    queryKey: VIDEO_OPS_QUERY_KEYS.accountsOverview,
    queryFn: fetchAccountsOverview,
    enabled: !bootstrapQuery.isPending || Boolean(cachedOverview),
    initialData: () => queryClient.getQueryData<AccountsOverview>(VIDEO_OPS_QUERY_KEYS.accountsOverview),
    staleTime: VIDEO_OPS_STALE_TIMES.accountsOverview,
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
