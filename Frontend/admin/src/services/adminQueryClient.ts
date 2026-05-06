import { QueryClient } from '@tanstack/react-query'

export const adminQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 15 * 60 * 1000,
      staleTime: 10 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})
