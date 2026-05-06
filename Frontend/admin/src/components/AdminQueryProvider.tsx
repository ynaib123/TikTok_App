import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { adminQueryClient } from '../services/adminQueryClient'

interface AdminQueryProviderProps {
  children: ReactNode
}

export default function AdminQueryProvider({ children }: AdminQueryProviderProps) {
  return (
    <QueryClientProvider client={adminQueryClient}>
      {children}
    </QueryClientProvider>
  )
}
