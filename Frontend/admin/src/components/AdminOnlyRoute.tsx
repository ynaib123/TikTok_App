import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAdminAuth } from '../contexts/AdminAuthContext'
import { isAdminRole } from '../utils/adminRoles'

interface AdminOnlyRouteProps {
  children: ReactNode
}

export default function AdminOnlyRoute({ children }: AdminOnlyRouteProps) {
  const { isAuthenticated, loading, role } = useAdminAuth()

  if (loading) {
    return null
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (!isAdminRole(role)) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
