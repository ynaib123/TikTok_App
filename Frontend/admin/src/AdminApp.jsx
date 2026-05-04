import { Suspense, lazy, useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAdminAuth } from './contexts/AdminAuthContext'
import AdminOnlyRoute from './components/AdminOnlyRoute'
import { isAdminRole } from './utils/adminRoles'
import './styles/layout/loading.css'
import './styles/layout/shell.css'
import './styles/themes/shell-openai.css'
import './styles/features/video-ops.css'
import './contexts/toast.css'
import { ToastProvider } from './contexts/ToastContext'

const AdminLogin = lazy(() => import('./pages/AdminLogin'))
const VideoDashboardPage = lazy(() => import('./pages/VideoDashboardPage'))
const TikTokJourneyPage = lazy(() => import('./pages/TikTokJourneyPage'))
const TikTokOAuthCallbackPage = lazy(() => import('./pages/TikTokOAuthCallbackPage'))
const ContentPipelinePage = lazy(() => import('./pages/ContentPipelinePage'))
const TikTokAccountsPage = lazy(() => import('./pages/TikTokAccountsPage'))
const ManualActionsPage = lazy(() => import('./pages/ManualActionsPage'))
const ADMIN_DESKTOP_ONLY_MEDIA_QUERY = '(max-width: 980px)'

function AdminMobileBlockedPage() {
  return (
    <div className="admin-mobile-blocked-page">
      <div className="admin-mobile-blocked-box" role="alert" aria-live="assertive">
        <div className="admin-mobile-blocked-badge" aria-hidden="true">!</div>
        <p className="admin-auth-card-kicker">Acces refuse</p>
        <p className="admin-mobile-blocked-title">Cette route admin est interdite sur mobile.</p>
        <p className="admin-mobile-blocked-copy">
          Utilisez un ordinateur ou un ecran desktop pour acceder a l interface d administration.
        </p>
      </div>
    </div>
  )
}

function useIsAdminMobileBlocked() {
  const [isBlocked, setIsBlocked] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(ADMIN_DESKTOP_ONLY_MEDIA_QUERY).matches
  })

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const mediaQuery = window.matchMedia(ADMIN_DESKTOP_ONLY_MEDIA_QUERY)
    const updateBlockedState = (event) => {
      setIsBlocked(event.matches)
    }

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', updateBlockedState)
      return () => mediaQuery.removeEventListener('change', updateBlockedState)
    }

    mediaQuery.addListener(updateBlockedState)
    return () => mediaQuery.removeListener(updateBlockedState)
  }, [])

  return isBlocked
}

function AdminIndexRedirect() {
  const { isAuthenticated, loading, role } = useAdminAuth()

  if (loading) {
    return null
  }

  if (isAuthenticated && isAdminRole(role)) {
    return <Navigate to="/dashboard" replace />
  }

  return <Navigate to="/login" replace />
}

export default function AdminApp() {
  const isMobileBlocked = useIsAdminMobileBlocked()

  if (isMobileBlocked) {
    return <AdminMobileBlockedPage />
  }

  return (
    <ToastProvider>
    <Suspense fallback={null}>
      <Routes>
        <Route path="/login" element={<AdminLogin />} />
        <Route
          path="/dashboard"
          element={(
            <AdminOnlyRoute>
              <VideoDashboardPage />
            </AdminOnlyRoute>
          )}
        />
        <Route
          path="/tiktok/*"
          element={(
            <AdminOnlyRoute>
              <TikTokJourneyPage />
            </AdminOnlyRoute>
          )}
        />
        <Route
          path="/tiktok-callback"
          element={(
            <AdminOnlyRoute>
              <TikTokOAuthCallbackPage />
            </AdminOnlyRoute>
          )}
        />
        <Route
          path="/content-pipeline"
          element={(
            <AdminOnlyRoute>
              <ContentPipelinePage />
            </AdminOnlyRoute>
          )}
        />
        <Route
          path="/accounts"
          element={(
            <AdminOnlyRoute>
              <TikTokAccountsPage />
            </AdminOnlyRoute>
          )}
        />
        <Route path="/tiktok-accounts" element={<Navigate to="/accounts" replace />} />
        <Route
          path="/manual-actions"
          element={(
            <AdminOnlyRoute>
              <ManualActionsPage />
            </AdminOnlyRoute>
          )}
        />
        <Route path="/" element={<AdminIndexRedirect />} />
        <Route path="*" element={<AdminIndexRedirect />} />
      </Routes>
    </Suspense>
    </ToastProvider>
  )
}
