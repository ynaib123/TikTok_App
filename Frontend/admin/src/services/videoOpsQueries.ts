import type { InfiniteData, QueryClient } from '@tanstack/react-query'

import type {
  AccountsOverview,
  AccountsReadiness,
  ContentIdea,
  ManualAction,
  SpringPageResponse,
  TikTokAccount,
  VideoOpsBootstrapResponse,
} from '../types'
import {
  fetchDashboardData,
  fetchVideoOpsBootstrap,
  fetchVideoOpsHealth,
  fetchVideoOpsObservability,
} from './videoOpsSupabase'

/**
 * Single source of truth for every React Query key used by the admin UI.
 * Keys are organized as a hierarchical factory so invalidating a parent
 * (e.g. `videoDashboardRoot`) cascades to its children.
 */
export const VIDEO_OPS_QUERY_KEYS = {
  bootstrap: ['video-ops', 'bootstrap'] as const,
  accountsOverview: ['accounts-overview'] as const,
  accountsReadiness: ['accounts-readiness'] as const,
  tiktokAccounts: ['tiktok-accounts'] as const,
  manualActions: ['manual-actions'] as const,
  contentIdeas: ['content-ideas'] as const,
  videoDashboardRoot: ['video-dashboard'] as const,
  dashboard: ['video-dashboard', 'dashboard'] as const,
  health: ['video-dashboard', 'health'] as const,
  observability: ['video-dashboard', 'observability'] as const,
  workflowRunStatus: (runId: number | string | null | undefined) =>
    ['workflow-run-status', runId] as const,
  pexelsVideos: (
    query: string,
    orientation: 'portrait' | 'landscape' | 'square' = 'portrait',
    perPage = 18,
  ) => ['pexels-videos', query, orientation, perPage] as const,
  pexelsVideosRoot: ['pexels-videos'] as const,
  audioVoices: ['audio', 'voices'] as const,
  audioAssets: (contentIdeaId: number | null) =>
    ['audio', 'assets', contentIdeaId] as const,
  audioRoot: ['audio'] as const,
}

export const VIDEO_OPS_STALE_TIMES = {
  bootstrap: 15_000,
  accountsOverview: 30_000,
  accountsReadiness: 10_000,
  tiktokAccounts: 30_000,
  manualActions: 15_000,
  contentIdeas: 15_000,
  dashboard: 30_000,
  health: 30_000,
  observability: 30_000,
}

type ContentIdeasInfiniteData = InfiniteData<SpringPageResponse<ContentIdea>, number>

export function buildBootstrapContentIdeasData(
  contentIdeas: SpringPageResponse<ContentIdea>,
): ContentIdeasInfiniteData {
  return {
    pages: [contentIdeas],
    pageParams: [0],
  }
}

/**
 * Sticky write : refuse d'ecraser un tableau cache non-vide par un tableau vide.
 * Les collections vides retournees par le backend ne sont JAMAIS ecrasantes —
 * elles sont presque toujours symptomatiques d'une defaillance transitoire
 * (blip DB / restart / race condition) et n'apparaissent jamais comme un etat
 * legitime sans une mutation explicite (delete) cote frontend.
 */
function stickyWriteArray<T>(
  queryClient: QueryClient,
  key: readonly unknown[],
  incoming: T[] | undefined | null,
): void {
  const next = Array.isArray(incoming) ? incoming : []
  if (next.length > 0) {
    queryClient.setQueryData<T[]>(key, next)
    return
  }
  const previous = queryClient.getQueryData<T[]>(key)
  if (previous && previous.length > 0) {
    // Suspect : le backend renvoie [] alors qu'on avait des donnees. On garde le cache.
    if (typeof console !== 'undefined') {
      console.warn(`[videoOpsQueries] sticky cache : refus d'ecraser ${JSON.stringify(key)} (avait ${previous.length} items, recu vide)`)
    }
    return
  }
  queryClient.setQueryData<T[]>(key, next)
}

function stickyWritePage(
  queryClient: QueryClient,
  key: readonly unknown[],
  incoming: ContentIdeasInfiniteData,
): void {
  const incomingCount = incoming.pages.reduce((sum, p) => sum + (p.content?.length ?? 0), 0)
  if (incomingCount > 0) {
    queryClient.setQueryData<ContentIdeasInfiniteData>(key, incoming)
    return
  }
  const previous = queryClient.getQueryData<ContentIdeasInfiniteData>(key)
  const previousCount = previous?.pages.reduce((sum, p) => sum + (p.content?.length ?? 0), 0) ?? 0
  if (previousCount > 0) {
    if (typeof console !== 'undefined') {
      console.warn(`[videoOpsQueries] sticky cache : refus d'ecraser content-ideas (avait ${previousCount} items, recu vide)`)
    }
    return
  }
  queryClient.setQueryData<ContentIdeasInfiniteData>(key, incoming)
}

export function primeVideoOpsBootstrapCache(
  queryClient: QueryClient,
  bootstrap: VideoOpsBootstrapResponse,
) {
  queryClient.setQueryData(VIDEO_OPS_QUERY_KEYS.bootstrap, bootstrap)
  // Singletons (objets, pas tableaux) : on les ecrase toujours
  queryClient.setQueryData<AccountsOverview>(
    VIDEO_OPS_QUERY_KEYS.accountsOverview,
    bootstrap.accountsOverview,
  )
  queryClient.setQueryData<AccountsReadiness>(
    VIDEO_OPS_QUERY_KEYS.accountsReadiness,
    bootstrap.accountsReadiness,
  )
  // Tableaux : sticky write contre les ecrasements vides transitoires
  stickyWriteArray<TikTokAccount>(
    queryClient,
    VIDEO_OPS_QUERY_KEYS.tiktokAccounts,
    bootstrap.accountsOverview.tiktokAccounts,
  )
  stickyWriteArray<ManualAction>(
    queryClient,
    VIDEO_OPS_QUERY_KEYS.manualActions,
    bootstrap.manualActions,
  )
  stickyWritePage(
    queryClient,
    VIDEO_OPS_QUERY_KEYS.contentIdeas,
    buildBootstrapContentIdeasData(bootstrap.contentIdeas),
  )
}

export async function fetchAndPrimeVideoOpsBootstrap(queryClient: QueryClient) {
  const bootstrap = await fetchVideoOpsBootstrap()

  primeVideoOpsBootstrapCache(queryClient, bootstrap)
  return bootstrap
}

export async function prefetchVideoOpsDashboard(queryClient: QueryClient) {
  await Promise.allSettled([
    queryClient.prefetchQuery({
      queryKey: VIDEO_OPS_QUERY_KEYS.health,
      queryFn: fetchVideoOpsHealth,
      staleTime: VIDEO_OPS_STALE_TIMES.health,
    }),
    queryClient.prefetchQuery({
      queryKey: VIDEO_OPS_QUERY_KEYS.observability,
      queryFn: fetchVideoOpsObservability,
      staleTime: VIDEO_OPS_STALE_TIMES.observability,
    }),
    queryClient.prefetchQuery({
      queryKey: VIDEO_OPS_QUERY_KEYS.dashboard,
      queryFn: fetchDashboardData,
      staleTime: VIDEO_OPS_STALE_TIMES.dashboard,
    }),
  ])
}
