import { useCallback, useMemo, useState } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InfiniteData } from '@tanstack/react-query';

import {
  fetchAccountsReadiness,
  fetchContentIdeasPage,
  fetchManualActions,
  fetchTikTokAccounts,
} from '../services/videoOpsSupabase.js';
import type {
  AccountsReadiness,
  ContentIdea,
  FetchContentIdeasPageParams,
  ManualAction,
  SpringPageResponse,
  TikTokAccount,
  WorkflowState,
} from '../types';
import {
  buildBootstrapContentIdeasData,
  fetchAndPrimeVideoOpsBootstrap,
  VIDEO_OPS_QUERY_KEYS,
  VIDEO_OPS_STALE_TIMES,
} from '../services/videoOpsQueries';
import { pollIntervalForCollection } from './useAdaptivePolling';

// Politique de recuperation : retry exponentiel + refetch agressif quand
// la derniere tentative est en erreur, pour que la page se "reanime" toute
// seule en ~5s apres un blip backend (au lieu de rester bloquee jusqu'au
// prochain focus de la fenetre).
const RECOVERY_RETRY = 3;
const RECOVERY_RETRY_DELAY = (attempt: number) => Math.min(1000 * 2 ** attempt, 10_000);
const RECOVERY_REFETCH_ON_ERROR_MS = 5_000;
const RECOVERY_REFETCH_HEALTHY_MS = 30_000;
function recoveryRefetchInterval<T>(query: { state: { error: Error | null; data: T | undefined } }): number {
  return query.state.error ? RECOVERY_REFETCH_ON_ERROR_MS : RECOVERY_REFETCH_HEALTHY_MS;
}

const EMPTY_READINESS: AccountsReadiness = {
  ready: false,
  connectedTikTokAccounts: 0,
  missingItems: [],
};

const CONTENT_IDEAS_PAGE_SIZE = 20;
const CONTENT_IDEAS_SORT = 'id,DESC';

const INITIAL_WORKFLOW_STATE: WorkflowState = {
  generatedIdeas: [],
  selectedGeneratedIdeaId: null,
  scriptedIdea: null,
  manualAction: null,
  uploadResult: null,
  errorMessage: null,
  successMessage: null,
};

export function useTikTokWorkflow() {
  const queryClient = useQueryClient();
  const [state, setState] = useState<WorkflowState>(INITIAL_WORKFLOW_STATE);
  const cachedBootstrapContentIdeas = queryClient.getQueryData<
    InfiniteData<SpringPageResponse<ContentIdea>, number>
  >(VIDEO_OPS_QUERY_KEYS.contentIdeas);
  const cachedAccountsReadiness =
    queryClient.getQueryData<AccountsReadiness>(VIDEO_OPS_QUERY_KEYS.accountsReadiness);
  const cachedTikTokAccounts =
    queryClient.getQueryData<TikTokAccount[]>(VIDEO_OPS_QUERY_KEYS.tiktokAccounts);
  const cachedManualActions =
    queryClient.getQueryData<ManualAction[]>(VIDEO_OPS_QUERY_KEYS.manualActions);

  const bootstrapQuery = useQuery({
    queryKey: VIDEO_OPS_QUERY_KEYS.bootstrap,
    queryFn: () => fetchAndPrimeVideoOpsBootstrap(queryClient),
    staleTime: VIDEO_OPS_STALE_TIMES.bootstrap,
    refetchInterval: recoveryRefetchInterval,
    retry: RECOVERY_RETRY,
    retryDelay: RECOVERY_RETRY_DELAY,
    placeholderData: (previousData) => previousData,
  });

  const contentIdeasQuery = useInfiniteQuery<
    SpringPageResponse<ContentIdea>,
    Error,
    InfiniteData<SpringPageResponse<ContentIdea>, number>,
    typeof VIDEO_OPS_QUERY_KEYS.contentIdeas,
    number
  >({
    queryKey: VIDEO_OPS_QUERY_KEYS.contentIdeas,
    initialPageParam: 0,
    enabled: !bootstrapQuery.isPending || Boolean(cachedBootstrapContentIdeas),
    initialData: () =>
      queryClient.getQueryData<InfiniteData<SpringPageResponse<ContentIdea>, number>>(
        VIDEO_OPS_QUERY_KEYS.contentIdeas,
      ),
    queryFn: ({ pageParam }) => {
      const params: FetchContentIdeasPageParams = {
        page: pageParam,
        size: CONTENT_IDEAS_PAGE_SIZE,
        sort: CONTENT_IDEAS_SORT,
      };
      return fetchContentIdeasPage(params);
    },
    getNextPageParam: (lastPage) => {
      const nextPageNumber = lastPage.page.number + 1;
      return nextPageNumber < lastPage.page.totalPages ? nextPageNumber : undefined;
    },
    staleTime: VIDEO_OPS_STALE_TIMES.contentIdeas,
    refetchInterval: (query) => {
      if (query.state.error) return RECOVERY_REFETCH_ON_ERROR_MS;
      const data = query.state.data as
        | InfiniteData<SpringPageResponse<ContentIdea>, number>
        | undefined;
      const ideas = data?.pages.flatMap((page) => page.content) ?? [];
      return pollIntervalForCollection(ideas);
    },
    retry: RECOVERY_RETRY,
    retryDelay: RECOVERY_RETRY_DELAY,
    placeholderData: (previousData) =>
      previousData
      ?? (bootstrapQuery.data
        ? buildBootstrapContentIdeasData(bootstrapQuery.data.contentIdeas)
        : undefined),
  });

  const tiktokAccountsQuery = useQuery<TikTokAccount[]>({
    queryKey: VIDEO_OPS_QUERY_KEYS.tiktokAccounts,
    queryFn: fetchTikTokAccounts,
    enabled: !bootstrapQuery.isPending || Boolean(cachedTikTokAccounts),
    initialData: () => queryClient.getQueryData<TikTokAccount[]>(VIDEO_OPS_QUERY_KEYS.tiktokAccounts),
    staleTime: VIDEO_OPS_STALE_TIMES.tiktokAccounts,
    refetchInterval: recoveryRefetchInterval,
    retry: RECOVERY_RETRY,
    retryDelay: RECOVERY_RETRY_DELAY,
    placeholderData: (previousData) => previousData,
  });

  const readinessQuery = useQuery<AccountsReadiness>({
    queryKey: VIDEO_OPS_QUERY_KEYS.accountsReadiness,
    queryFn: fetchAccountsReadiness,
    refetchInterval: (query) => (query.state.error ? RECOVERY_REFETCH_ON_ERROR_MS : 15_000),
    retry: RECOVERY_RETRY,
    retryDelay: RECOVERY_RETRY_DELAY,
    enabled: !bootstrapQuery.isPending || Boolean(cachedAccountsReadiness),
    initialData: () =>
      queryClient.getQueryData<AccountsReadiness>(VIDEO_OPS_QUERY_KEYS.accountsReadiness),
    staleTime: VIDEO_OPS_STALE_TIMES.accountsReadiness,
    placeholderData: (previousData) => previousData,
  });

  const manualActionsQuery = useQuery<ManualAction[]>({
    queryKey: VIDEO_OPS_QUERY_KEYS.manualActions,
    queryFn: fetchManualActions,
    enabled: !bootstrapQuery.isPending || Boolean(cachedManualActions),
    initialData: () => queryClient.getQueryData<ManualAction[]>(VIDEO_OPS_QUERY_KEYS.manualActions),
    staleTime: VIDEO_OPS_STALE_TIMES.manualActions,
    refetchInterval: recoveryRefetchInterval,
    retry: RECOVERY_RETRY,
    retryDelay: RECOVERY_RETRY_DELAY,
    placeholderData: (previousData) => previousData,
  });

  const contentIdeas = useMemo(
    () => contentIdeasQuery.data?.pages.flatMap((page: SpringPageResponse<ContentIdea>) => page.content) ?? [],
    [contentIdeasQuery.data],
  );

  const refreshPipelineData = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: VIDEO_OPS_QUERY_KEYS.bootstrap }),
      queryClient.invalidateQueries({ queryKey: VIDEO_OPS_QUERY_KEYS.contentIdeas }),
      queryClient.invalidateQueries({ queryKey: VIDEO_OPS_QUERY_KEYS.manualActions }),
      queryClient.invalidateQueries({ queryKey: ['video-dashboard'] }),
      queryClient.invalidateQueries({ queryKey: VIDEO_OPS_QUERY_KEYS.accountsReadiness }),
    ]);
  }, [queryClient]);

  const resetFlowState = useCallback(() => {
    setState(INITIAL_WORKFLOW_STATE);
  }, []);

  const patchState = useCallback((patch: Partial<WorkflowState>) => {
    setState((currentState) => ({
      ...currentState,
      ...patch,
    }));
  }, []);

  const selectedGeneratedIdea = useMemo(
    () =>
      state.generatedIdeas.find((idea) => Number(idea.id) === Number(state.selectedGeneratedIdeaId))
      ?? state.generatedIdeas[0]
      ?? null,
    [state.generatedIdeas, state.selectedGeneratedIdeaId],
  );

  return {
    accountsReadiness: readinessQuery.data ?? EMPTY_READINESS,
    contentIdeas,
    manualActions: manualActionsQuery.data ?? [],
    selectedGeneratedIdea,
    state,
    tiktokAccounts: tiktokAccountsQuery.data ?? [],
    contentIdeasQuery,
    manualActionsQuery,
    patchState,
    readinessQuery,
    refreshPipelineData,
    resetFlowState,
    setState,
    tiktokAccountsQuery,
  };
}
