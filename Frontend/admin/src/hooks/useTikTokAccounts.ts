import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { disconnectTikTokAccount, fetchAccountsOverview } from '../services/videoOpsSupabase.js';
import { createTikTokAuthorizationUrl } from '../services/tiktokOAuthApi.js';
import type { AccountsOverview, TikTokAccount } from '../types';

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

  const overviewQuery = useQuery<AccountsOverview>({
    queryKey: ['accounts-overview'],
    queryFn: fetchAccountsOverview,
  });

  const refresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['accounts-overview'] }),
      queryClient.invalidateQueries({ queryKey: ['accounts-readiness'] }),
      queryClient.invalidateQueries({ queryKey: ['tiktok-accounts'] }),
      queryClient.invalidateQueries({ queryKey: ['content-ideas'] }),
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
