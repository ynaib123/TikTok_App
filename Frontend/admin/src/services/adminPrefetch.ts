import type { QueryClient } from '@tanstack/react-query'

import {
  fetchAndPrimeVideoOpsBootstrap,
  prefetchVideoOpsDashboard,
} from './videoOpsQueries'

const ADMIN_ROUTE_IMPORTERS: Record<string, () => Promise<unknown>> = {
  '/dashboard': () => import('../pages/VideoDashboardPage'),
  '/tiktok': () => import('../pages/TikTokJourneyPage'),
  '/accounts': () => import('../pages/TikTokAccountsPage'),
}

export async function prefetchAdminRoute(path: string, queryClient: QueryClient) {
  const tasks: Promise<unknown>[] = []
  const importer = ADMIN_ROUTE_IMPORTERS[path]

  if (importer) {
    tasks.push(importer())
  }

  if (path === '/dashboard') {
    tasks.push(prefetchVideoOpsDashboard(queryClient))
  }

  if (path === '/tiktok' || path === '/accounts' || path === '/dashboard') {
    tasks.push(fetchAndPrimeVideoOpsBootstrap(queryClient))
  }

  await Promise.allSettled(tasks)
}

export async function prefetchAdminEssentials(queryClient: QueryClient) {
  await Promise.allSettled([
    prefetchAdminRoute('/dashboard', queryClient),
    prefetchAdminRoute('/tiktok', queryClient),
    prefetchAdminRoute('/accounts', queryClient),
  ])
}
