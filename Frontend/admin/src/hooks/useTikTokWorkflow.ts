import { useCallback, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import {
  fetchAccountsReadiness,
  fetchContentIdeas,
  fetchManualActions,
  fetchTikTokAccounts,
  fetchVideoOpsObservability,
} from '../services/videoOpsSupabase.js';
import type {
  AccountsReadiness,
  ContentIdea,
  ManualAction,
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

  const contentIdeasQuery = useQuery<ContentIdea[]>({
    queryKey: ['content-ideas'],
    queryFn: fetchContentIdeas,
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
    contentIdeas: contentIdeasQuery.data ?? [],
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
