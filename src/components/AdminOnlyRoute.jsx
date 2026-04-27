import { Navigate } from 'react-router-dom'
import { useAdminAuth } from '../contexts/AdminAuthContext'
import { isAdminRole } from '../utils/adminRoles'

export default function AdminOnlyRoute({ children }) {
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

  return children
}
