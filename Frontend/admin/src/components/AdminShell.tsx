import { useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAdminAuth } from '../contexts/AdminAuthContext'
import { ADMIN_NAV_ITEMS } from './adminNavItems'
import AdminFeedbackBanner, { type AdminFeedbackBannerType } from './AdminFeedbackBanner'
import AdminRouteFallback from './AdminRouteFallback'
import { prefetchAdminRoute } from '../services/adminPrefetch'
import '../styles/layout/shell.css'
import '../styles/themes/shell-openai.css'

const ADMIN_SIDEBAR_COLLAPSED_STORAGE_KEY = 'admin-sidebar-collapsed'
const ADMIN_BLOCKING_FALLBACK_MIN_DURATION_MS = 400
const ADMIN_LOGOUT_FALLBACK_STORAGE_KEY = 'admin-logout-fallback-until'

export interface AdminShellFeedbackItem {
  type: AdminFeedbackBannerType
  message?: string | null
  onClose?: () => void
}

export interface AdminShellProps {
  activeNavId?: string
  children: ReactNode
  blockingMessage?: string
  blockingProgress?: number | null
  feedbackItems?: AdminShellFeedbackItem[]
  isBlocking?: boolean
  onBeforeNavigate?: (path: string) => void | boolean | Promise<void | boolean>
  onBeforeLogout?: () => void | boolean | Promise<void | boolean>
}

interface BlockingFallbackSnapshot {
  message: string
  progress: number | null
  startedAt: number
}

interface MinimumDurationProgressInput {
  actualProgress: number | null | undefined
  startedAt: number
  minDurationMs?: number
}

function resolveMinimumDurationProgress({
  actualProgress,
  startedAt,
  minDurationMs = ADMIN_BLOCKING_FALLBACK_MIN_DURATION_MS,
}: MinimumDurationProgressInput): number {
  const normalizedActual = Math.max(0, Math.min(100, Number(actualProgress || 0)))
  if (!startedAt) return normalizedActual

  const elapsed = Math.max(0, Date.now() - startedAt)
  const ratio = Math.max(0, Math.min(1, elapsed / minDurationMs))
  const timeProgress = ratio >= 1 ? 95 : Math.max(8, Math.round(ratio * 95))

  if (normalizedActual >= 100) {
    return ratio >= 1 ? 100 : timeProgress
  }

  return Math.max(Math.min(normalizedActual, 96), timeProgress)
}

function DashboardIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 13.5 12 5l8 8.5" />
      <path d="M5.5 12.5V20h13v-7.5" />
      <path d="M10 20v-4.5h4V20" />
    </svg>
  )
}

function PipelineIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="5" width="6" height="4" rx="1.2" />
      <rect x="14.5" y="5" width="6" height="4" rx="1.2" />
      <rect x="9" y="15" width="6" height="4" rx="1.2" />
      <path d="M9.5 7h5" />
      <path d="M12 9.5V15" />
    </svg>
  )
}

function AccountsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5 19.5v-1.2A4.8 4.8 0 0 1 9.8 13.5h4.4a4.8 4.8 0 0 1 4.8 4.8v1.2" />
      <path d="M18.5 6.5h2" />
      <path d="M19.5 5.5v2" />
    </svg>
  )
}

function ActionsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12h10" />
      <path d="m10 6 6 6-6 6" />
      <rect x="16.5" y="4.5" width="3" height="3" rx="0.8" />
      <rect x="16.5" y="16.5" width="3" height="3" rx="0.8" />
    </svg>
  )
}

function TikTokIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 4v8.2a4.2 4.2 0 1 1-3.4-4.1" />
      <path d="M14 4c1.1 2.4 2.8 3.8 5 4.2" />
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 7V5.8A1.8 1.8 0 0 0 12.2 4H7.8A1.8 1.8 0 0 0 6 5.8v12.4A1.8 1.8 0 0 0 7.8 20h4.4a1.8 1.8 0 0 0 1.8-1.8V17" />
      <path d="M10 12h10" />
      <path d="m17 8 4 4-4 4" />
    </svg>
  )
}

const ADMIN_NAV_ICONS: Record<string, ComponentType> = {
  dashboard: DashboardIcon,
  tiktok: TikTokIcon,
  'content-pipeline': PipelineIcon,
  accounts: AccountsIcon,
  'manual-actions': ActionsIcon,
}

function formatAdminRoleLabel(role: string | null | undefined): string {
  const normalizedRole = String(role || 'ADMIN').trim().toUpperCase()
  if (normalizedRole === 'SUPER_ADMIN') return 'Super Admin'
  if (normalizedRole === 'ADMIN') return 'Admin'
  return normalizedRole.replaceAll('_', ' ') || 'Admin'
}

export default function AdminShell({
  activeNavId,
  children,
  blockingMessage = "Chargement de l'espace admin...",
  blockingProgress = null,
  feedbackItems = [],
  isBlocking = false,
  onBeforeNavigate,
  onBeforeLogout,
}: AdminShellProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const location = useLocation()
  const { logout, user } = useAdminAuth()
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem(ADMIN_SIDEBAR_COLLAPSED_STORAGE_KEY) === 'true'
  })
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const [logoutProgressValue, setLogoutProgressValue] = useState<number | null>(null)
  const [showBlockingFallback, setShowBlockingFallback] = useState(false)
  const [blockingFallbackSnapshot, setBlockingFallbackSnapshot] = useState<BlockingFallbackSnapshot>({
    message: blockingMessage,
    progress: blockingProgress,
    startedAt: 0,
  })
  const [logoutStartedAt, setLogoutStartedAt] = useState(0)
  const profileMenuRef = useRef<HTMLDivElement | null>(null)
  const profileMenuButtonRef = useRef<HTMLButtonElement | null>(null)
  const blockingFallbackShownAtRef = useRef(0)
  const [, forceProgressTick] = useState(0)
  const userWithRole = user as (typeof user & { role?: string | null }) | null
  const adminRoleLabel = useMemo(() => formatAdminRoleLabel(userWithRole?.role), [userWithRole?.role])
  const visibleFeedbackItems = useMemo(
    () => feedbackItems.filter((item) => Boolean(item?.message)),
    [feedbackItems],
  )

  const resolvedActiveNavId = useMemo(() => {
    if (activeNavId !== undefined) return activeNavId
    return ADMIN_NAV_ITEMS.find((item) => location.pathname.startsWith(item.path))?.id || ADMIN_NAV_ITEMS[0]?.id
  }, [activeNavId, location.pathname])

  const navSections = useMemo(() => {
    const navItemsById = Object.fromEntries(ADMIN_NAV_ITEMS.map((item) => [item.id, item]))

    return [
      {
        id: 'production',
        label: 'Production',
        items: ['dashboard', 'tiktok'].map((id) => navItemsById[id]).filter(Boolean),
      },
      {
        id: 'configuration',
        label: 'Configuration',
        items: ['accounts'].map((id) => navItemsById[id]).filter(Boolean),
      },
    ]
  }, [])

  useEffect(() => {
    if (!isProfileMenuOpen) return undefined

    const handleDocumentClick = (event: MouseEvent) => {
      if (profileMenuRef.current?.contains(event.target as Node)) return
      setIsProfileMenuOpen(false)
    }

    document.addEventListener('click', handleDocumentClick)
    return () => document.removeEventListener('click', handleDocumentClick)
  }, [isProfileMenuOpen])

  useEffect(() => {
    if (!isProfileMenuOpen) return undefined

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setIsProfileMenuOpen(false)
      profileMenuButtonRef.current?.focus()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isProfileMenuOpen])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(ADMIN_SIDEBAR_COLLAPSED_STORAGE_KEY, String(isSidebarCollapsed))
  }, [isSidebarCollapsed])

  useEffect(() => {
    if (!isBlocking) {
      if (!showBlockingFallback) return undefined

      const elapsed = Date.now() - blockingFallbackShownAtRef.current
      const remaining = Math.max(0, ADMIN_BLOCKING_FALLBACK_MIN_DURATION_MS - elapsed)
      const timeoutId = window.setTimeout(() => {
        setShowBlockingFallback(false)
        blockingFallbackShownAtRef.current = 0
      }, remaining)

      return () => window.clearTimeout(timeoutId)
    }

    if (showBlockingFallback) {
      return undefined
    }

    const startedAt = Date.now()
    blockingFallbackShownAtRef.current = startedAt
    let isCancelled = false
    const frameId = window.requestAnimationFrame(() => {
      if (isCancelled) return
      setBlockingFallbackSnapshot({
        message: blockingMessage,
        progress: blockingProgress,
        startedAt,
      })
      setShowBlockingFallback(true)
    })

    return () => {
      isCancelled = true
      window.cancelAnimationFrame(frameId)
    }
  }, [blockingMessage, blockingProgress, isBlocking, showBlockingFallback])

  useEffect(() => {
    if (!showBlockingFallback && logoutProgressValue == null) return undefined

    const intervalId = window.setInterval(() => {
      forceProgressTick((value) => value + 1)
    }, 80)

    return () => window.clearInterval(intervalId)
  }, [logoutProgressValue, showBlockingFallback])

  const handleNavigate = async (path: string): Promise<void> => {
    if (typeof onBeforeNavigate === 'function') {
      const shouldContinue = await onBeforeNavigate(path)
      if (shouldContinue === false) return
    }

    navigate(path)
  }

  const handlePrefetch = (path: string): void => {
    void prefetchAdminRoute(path, queryClient)
  }

  const handleLogout = async (): Promise<void> => {
    if (typeof onBeforeLogout === 'function') {
      const shouldContinue = await onBeforeLogout()
      if (shouldContinue === false) return
    }

    const startedAt = Date.now()
    setLogoutStartedAt(startedAt)
    setLogoutProgressValue(12)
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(
        ADMIN_LOGOUT_FALLBACK_STORAGE_KEY,
        String(Date.now() + ADMIN_BLOCKING_FALLBACK_MIN_DURATION_MS),
      )
    }

    try {
      setLogoutProgressValue(36)
      await logout()
      setLogoutProgressValue(100)
      const elapsed = Date.now() - startedAt
      const remaining = Math.max(0, ADMIN_BLOCKING_FALLBACK_MIN_DURATION_MS - elapsed)
      if (remaining > 0) {
        await new Promise((resolve) => window.setTimeout(resolve, remaining))
      }
      navigate('/login', { replace: true })
    } catch (error) {
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem(ADMIN_LOGOUT_FALLBACK_STORAGE_KEY)
      }
      setLogoutProgressValue(null)
      throw error
    }
  }

  if (logoutProgressValue != null) {
    return (
      <AdminRouteFallback
        message="Enregistrement de l'espace admin..."
        progressValue={resolveMinimumDurationProgress({
          actualProgress: logoutProgressValue,
          startedAt: logoutStartedAt,
        })}
      />
    )
  }

  if (showBlockingFallback) {
    return (
      <AdminRouteFallback
        message={isBlocking ? blockingMessage : blockingFallbackSnapshot.message}
        progressValue={resolveMinimumDurationProgress({
          actualProgress: isBlocking ? blockingProgress : blockingFallbackSnapshot.progress,
          startedAt: blockingFallbackSnapshot.startedAt,
        })}
      />
    )
  }

  return (
    <div className={`admin-console-page with-side-nav ${isSidebarCollapsed ? 'sidebar-collapsed' : ''} ${visibleFeedbackItems.length ? 'has-navbar-feedback' : ''}`}>
      <nav className="admin-navbar">
        <div className="admin-navbar-shell">
          <div className="admin-navbar-brand">
            <div className="admin-profile-role-badge admin-navbar-brand-role">
              {adminRoleLabel}
            </div>
            <div className="admin-navbar-brand-copy">
              <span className="admin-navbar-logo">TikTok App Ops</span>
            </div>
          </div>
          <div className="admin-navbar-actions">
            <div ref={profileMenuRef} className="admin-profile-menu">
              <button
                type="button"
                className={`admin-profile-trigger ${isProfileMenuOpen ? 'is-open' : ''}`}
                onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                aria-expanded={isProfileMenuOpen}
                aria-haspopup="menu"
                aria-controls={isProfileMenuOpen ? 'admin-profile-menu-dropdown' : undefined}
                aria-label="Menu profil"
                ref={profileMenuButtonRef}
              >
                <div className="admin-profile-info">
                  <span className="admin-navbar-presence-indicator" aria-label="Admin en ligne" title="En ligne" />
                  <strong className="admin-profile-name">{user?.nom || user?.email || 'Equipe admin'}</strong>
                  <span className="admin-profile-email">{user?.email || 'Session active'}</span>
                </div>
              </button>
              {isProfileMenuOpen && (
                <div
                  id="admin-profile-menu-dropdown"
                  className="admin-profile-dropdown"
                  role="menu"
                  aria-label="Actions du profil"
                >
                  <button
                    type="button"
                    className="admin-profile-menu-item"
                    onClick={() => void handleLogout()}
                    role="menuitem"
                  >
                    <span className="admin-profile-menu-item-icon" aria-hidden="true">
                      <LogoutIcon />
                    </span>
                    <span>Se deconnecter</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        {visibleFeedbackItems.length ? (
          <div className="admin-navbar-feedback" aria-label="Messages admin">
            {visibleFeedbackItems.map((item, index) => (
              <AdminFeedbackBanner
                key={`${item.type || 'info'}-${item.message}-${index}`}
                type={item.type}
                message={item.message}
                onClose={item.onClose}
                placement="navbar"
              />
            ))}
          </div>
        ) : null}
      </nav>

      <aside className={`admin-context-sidebar ${isSidebarCollapsed ? 'is-collapsed' : ''}`}>
        <nav className="admin-context-sidebar-nav" aria-label="Navigation principale admin">
          {navSections.map((section) => (
            <div key={section.id} className="admin-context-sidebar-group">
              <p className="admin-context-sidebar-group-label">{section.label}</p>
              <div className="admin-context-sidebar-group-items">
                {section.items.map((item) => {
                  const isActive = item.id === resolvedActiveNavId
                  const Icon = ADMIN_NAV_ICONS[item.id]

                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`admin-context-nav-item ${isActive ? 'is-active' : ''} ${item.tone ? `is-${item.tone}` : ''}`}
                      onClick={() => void handleNavigate(item.path)}
                      onMouseEnter={() => handlePrefetch(item.path)}
                      onFocus={() => handlePrefetch(item.path)}
                      title={isSidebarCollapsed ? item.label : undefined}
                      aria-label={isSidebarCollapsed ? item.label : undefined}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <span className="admin-context-nav-icon" aria-hidden="true">
                        {Icon ? <Icon /> : null}
                      </span>
                      <span className="admin-context-nav-label">{item.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="admin-context-sidebar-footer">
          <button
            type="button"
            className="admin-context-sidebar-toggle"
            onClick={() => setIsSidebarCollapsed((prev) => !prev)}
            aria-pressed={isSidebarCollapsed}
            aria-label={isSidebarCollapsed ? 'Elargir la barre laterale' : 'Reduire la barre laterale'}
            title={isSidebarCollapsed ? 'Elargir la barre laterale' : 'Reduire la barre laterale'}
          >
            <span className="admin-context-sidebar-toggle-icon" aria-hidden="true">
              <span />
              <span />
            </span>
          </button>
        </div>
      </aside>

      {children}
    </div>
  )
}
