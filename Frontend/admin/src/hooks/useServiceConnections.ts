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
