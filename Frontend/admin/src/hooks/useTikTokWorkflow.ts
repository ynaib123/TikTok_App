import { useCallback, useMemo, useState } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InfiniteData } from '@tanstack/react-query';

import {
  fetchAccountsReadiness,
  fetchContentIdeasPage,
  fetchManualActions,
  fetchTikTokAccounts,
  fetchVideoOpsObservability,
} from '../services/videoOpsSupabase.js';
import type {
  AccountsReadiness,
  ContentIdea,
  FetchContentIdeasPageParams,
  ManualAction,
  SpringPageResponse,
  TikTokAccount,
  VideoObservability,
  WorkflowState,
} from '../types';

const EMPTY_READINESS: AccountsReadiness = {
  ready: false,
  connectedTikTokAccounts: 0,
  missingItems: [],
};

const EMPTY_OBSERVABILITY: VideoObservability = {
  recentRuns: [],
  failedRuns: [],
  recentErrors: [],
  recentEvents: [],
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

  const contentIdeasQuery = useInfiniteQuery<
    SpringPageResponse<ContentIdea>,
    Error,
    InfiniteData<SpringPageResponse<ContentIdea>>,
    [string],
    number
  >({
    queryKey: ['content-ideas'],
    initialPageParam: 0,
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
  });

  const tiktokAccountsQuery = useQuery<TikTokAccount[]>({
    queryKey: ['tiktok-accounts'],
    queryFn: fetchTikTokAccounts,
  });

  const readinessQuery = useQuery<AccountsReadiness>({
    queryKey: ['accounts-readiness'],
    queryFn: fetchAccountsReadiness,
    refetchInterval: 15_000,
  });

  const observabilityQuery = useQuery<VideoObservability>({
    queryKey: ['video-ops-observability'],
    queryFn: fetchVideoOpsObservability,
    refetchInterval: 10_000,
  });

  const manualActionsQuery = useQuery<ManualAction[]>({
    queryKey: ['manual-actions'],
    queryFn: fetchManualActions,
  });

  const contentIdeas = useMemo(
    () => contentIdeasQuery.data?.pages.flatMap((page: SpringPageResponse<ContentIdea>) => page.content) ?? [],
    [contentIdeasQuery.data],
  );

  const refreshPipelineData = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['content-ideas'] }),
      queryClient.invalidateQueries({ queryKey: ['manual-actions'] }),
      queryClient.invalidateQueries({ queryKey: ['video-dashboard'] }),
      queryClient.invalidateQueries({ queryKey: ['video-ops-observability'] }),
      queryClient.invalidateQueries({ queryKey: ['accounts-readiness'] }),
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
    observability: observabilityQuery.data ?? EMPTY_OBSERVABILITY,
    selectedGeneratedIdea,
    state,
    tiktokAccounts: tiktokAccountsQuery.data ?? [],
    contentIdeasQuery,
    manualActionsQuery,
    observabilityQuery,
    patchState,
    readinessQuery,
    refreshPipelineData,
    resetFlowState,
    setState,
    tiktokAccountsQuery,
  };
}
