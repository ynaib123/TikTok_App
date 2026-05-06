import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import {
  activateServiceConnection,
  deleteServiceConnection,
  fetchAccountsOverview,
  saveServiceConnection,
  validateServiceConnection,
} from '../services/videoOpsSupabase.js';
import { SERVICE_CONNECTION_FIELDS } from '../types/services';
import type {
  AccountsOverview,
  ServiceConnection,
  ServiceConnectionForm,
  ServiceProvider,
} from '../types';
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

export function useServiceConnections() {
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

  const save = useCallback(async (providerKey: ServiceProvider, payload: ServiceConnectionForm) => {
    const response = await saveServiceConnection(providerKey, payload);
    await refresh();
    return response;
  }, [refresh]);

  const activate = useCallback(async (providerKey: ServiceProvider, connectionId: number | string) => {
    const response = await activateServiceConnection(providerKey, connectionId);
    await refresh();
    return response;
  }, [refresh]);

  const validate = useCallback(async (providerKey: ServiceProvider, connectionId: number | string) => {
    const response = await validateServiceConnection(providerKey, connectionId);
    await refresh();
    return response;
  }, [refresh]);

  const remove = useCallback(async (providerKey: ServiceProvider, connectionId: number | string) => {
    await deleteServiceConnection(providerKey, connectionId);
    await refresh();
  }, [refresh]);

  const connections = useMemo<ServiceConnection[]>(
    () => overviewQuery.data?.serviceConnections ?? EMPTY_OVERVIEW.serviceConnections,
    [overviewQuery.data],
  );

  const connectionsByProvider = useMemo(
    () =>
      (Object.keys(SERVICE_CONNECTION_FIELDS) as ServiceProvider[]).reduce(
        (accumulator, providerKey) => {
          accumulator[providerKey] = connections.filter(
            (connection) => String(connection.providerKey || '').toUpperCase() === providerKey,
          );
          return accumulator;
        },
        {} as Record<ServiceProvider, ServiceConnection[]>,
      ),
    [connections],
  );

  const activeConnectionsByProvider = useMemo(
    () =>
      (Object.keys(connectionsByProvider) as ServiceProvider[]).reduce(
        (accumulator, providerKey) => {
          accumulator[providerKey] = connectionsByProvider[providerKey].find((connection) => connection.active) ?? null;
          return accumulator;
        },
        {} as Record<ServiceProvider, ServiceConnection | null>,
      ),
    [connectionsByProvider],
  );

  return {
    activeConnectionsByProvider,
    connections,
    connectionsByProvider,
    error: overviewQuery.error,
    isLoading: overviewQuery.isLoading,
    isRefetching: overviewQuery.isRefetching,
    activate,
    refresh,
    remove,
    save,
    validate,
  };
}
