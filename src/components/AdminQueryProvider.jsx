import { QueryClientProvider } from '@tanstack/react-query'
import { adminQueryClient } from '../services/adminQueryClient.js'

export default function AdminQueryProvider({ children }) {
  return (
    <QueryClientProvider client={adminQueryClient}>
      {children}
    </QueryClientProvider>
  )
}
