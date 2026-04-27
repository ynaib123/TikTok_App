/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  getAdminRememberPreference,
  loginAdmin,
  logoutAdminSession,
  refreshAdminSession,
} from '../services/adminAuthService'
import {
  getAdminSession,
  subscribeAdminSession,
} from '../services/adminSessionStore'
import { isAdminRole } from '../utils/adminRoles'

const AdminAuthContext = createContext()

export function AdminAuthProvider({ children }) {
  const [session, setSession] = useState(() => getAdminSession())
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return subscribeAdminSession((nextSession) => {
      setSession(nextSession)
    })
  }, [])

  useEffect(() => {
    let isActive = true

    const bootstrapSession = async () => {
      try {
        await refreshAdminSession()
      } catch {
        // Anonymous admin sessions simply land on the login page.
      } finally {
        if (isActive) {
          setSession(getAdminSession())
          setLoading(false)
        }
      }
    }

    void bootstrapSession()

    return () => {
      isActive = false
    }
  }, [])

  const login = useCallback(async (email, motDePasse, rememberMe = getAdminRememberPreference()) => {
    setError(null)
    try {
      const nextSession = await loginAdmin(email, motDePasse, rememberMe)
      setSession(nextSession)
      return nextSession.role
    } catch (err) {
      const errorMessage = err.message || 'Erreur de connexion administrateur'
      setError(errorMessage)
      return null
    }
  }, [])

  const logout = useCallback(async () => {
    setError(null)
    try {
      await logoutAdminSession()
    } finally {
      setSession(getAdminSession())
    }
  }, [])

  const value = useMemo(() => ({
    error,
    isAuthenticated: Boolean(session.token && session.user && isAdminRole(session.role)),
    loading,
    login,
    logout,
    role: session.role,
    setError,
    user: session.user,
  }), [
    error,
    loading,
    login,
    logout,
    session.role,
    session.token,
    session.user,
  ])

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext)
  if (!context) {
    throw new Error('useAdminAuth must be used within AdminAuthProvider')
  }
  return context
}
