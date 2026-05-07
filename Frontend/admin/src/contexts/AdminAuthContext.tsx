/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  getAdminRememberPreference,
  loginAdmin,
  logoutAdminSession,
  refreshAdminSession,
} from '../services/adminAuthService'
import {
  getAdminSession,
  isAdminAccessTokenExpired,
  subscribeAdminSession,
  type AdminSessionState,
  type AdminSessionUser,
} from '../services/adminSessionStore'
import { isAdminRole } from '../utils/adminRoles'

interface AdminAuthContextValue {
  error: string | null
  isAuthenticated: boolean
  loading: boolean
  login: (email: string, motDePasse: string, rememberMe?: boolean) => Promise<string | null>
  logout: () => Promise<void>
  role: string | null
  setError: (message: string | null) => void
  user: AdminSessionUser | null
}

const AdminAuthContext = createContext<AdminAuthContextValue | undefined>(undefined)

interface AdminAuthProviderProps {
  children: ReactNode
}

export function AdminAuthProvider({ children }: AdminAuthProviderProps) {
  const [session, setSession] = useState<AdminSessionState>(() => getAdminSession())
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return subscribeAdminSession((nextSession) => {
      setSession(nextSession)
    })
  }, [])

  useEffect(() => {
    let isActive = true

    const bootstrapSession = async () => {
      const currentSession = getAdminSession()
      const hasRestoredSession = Boolean(
        currentSession.token
        && currentSession.user
        && isAdminRole(currentSession.role),
      )

      if (hasRestoredSession && !isAdminAccessTokenExpired()) {
        if (isActive) {
          setSession(currentSession)
          setLoading(false)
        }
        return
      }

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

  const login = useCallback(async (
    email: string,
    motDePasse: string,
    rememberMe: boolean = getAdminRememberPreference(),
  ): Promise<string | null> => {
    setError(null)
    try {
      const nextSession = await loginAdmin(email, motDePasse, rememberMe)
      setSession(nextSession)
      return nextSession.role
    } catch (err) {
      const errorMessage = (err as Error)?.message || 'Erreur de connexion administrateur'
      setError(errorMessage)
      return null
    }
  }, [])

  const logout = useCallback(async (): Promise<void> => {
    setError(null)
    try {
      await logoutAdminSession()
    } finally {
      setSession(getAdminSession())
    }
  }, [])

  const value = useMemo<AdminAuthContextValue>(() => ({
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

export function useAdminAuth(): AdminAuthContextValue {
  const context = useContext(AdminAuthContext)
  if (!context) {
    throw new Error('useAdminAuth must be used within AdminAuthProvider')
  }
  return context
}
