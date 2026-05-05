import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAdminAuth } from '../contexts/AdminAuthContext'
import AdminFeedbackBanner from '../components/AdminFeedbackBanner'
import AdminRouteFallback from '../components/AdminRouteFallback'
import { getAdminRememberPreference } from '../services/adminAuthService'
import '../styles/features/auth.css'
import '../styles/themes/shell-openai.css'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const ADMIN_LOGIN_FALLBACK_MIN_DURATION_MS = 5000
const ADMIN_LOGOUT_FALLBACK_STORAGE_KEY = 'admin-logout-fallback-until'

function resolveMinimumDurationProgress({
  actualProgress,
  startedAt,
  minDurationMs = ADMIN_LOGIN_FALLBACK_MIN_DURATION_MS,
}) {
  const normalizedActual = Math.max(0, Math.min(100, Number(actualProgress || 0)))
  if (!startedAt) return normalizedActual

  const elapsed = Math.max(0, Date.now() - startedAt)
  const ratio = Math.max(0, Math.min(1, elapsed / minDurationMs))
  const timeCap = ratio >= 1 ? 100 : Math.max(8, Math.round(ratio * 95))

  if (normalizedActual >= 100 && ratio >= 1) {
    return 100
  }

  return Math.min(normalizedActual, timeCap)
}

export default function AdminLogin() {
  const navigate = useNavigate()
  const { isAuthenticated, loading, login, error, role, setError } = useAdminAuth()
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(() => getAdminRememberPreference())
  const [isLoading, setIsLoading] = useState(false)
  const [loginProgressValue, setLoginProgressValue] = useState(null)
  const [loginStartedAt, setLoginStartedAt] = useState(0)
  const [logoutFallbackUntil, setLogoutFallbackUntil] = useState(() => {
    if (typeof window === 'undefined') return 0
    return Number(window.sessionStorage.getItem(ADMIN_LOGOUT_FALLBACK_STORAGE_KEY) || 0)
  })
  const [, forceProgressTick] = useState(0)

  useEffect(() => {
    if (!error) return undefined
    const timer = setTimeout(() => setError(null), 5000)
    return () => clearTimeout(timer)
  }, [error, setError])

  useEffect(() => {
    if (loginProgressValue != null) return
    if (loading) return
    if (isAuthenticated && role === 'ADMIN') {
      navigate('/dashboard', { replace: true })
    }
  }, [isAuthenticated, loading, loginProgressValue, navigate, role])

  useEffect(() => {
    if (!logoutFallbackUntil || logoutFallbackUntil <= Date.now()) {
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem(ADMIN_LOGOUT_FALLBACK_STORAGE_KEY)
      }
      return undefined
    }

    const remaining = logoutFallbackUntil - Date.now()
    const timer = window.setTimeout(() => {
      window.sessionStorage.removeItem(ADMIN_LOGOUT_FALLBACK_STORAGE_KEY)
      setLogoutFallbackUntil(0)
    }, remaining)

    return () => window.clearTimeout(timer)
  }, [logoutFallbackUntil])

  useEffect(() => {
    if (loginProgressValue == null && logoutFallbackUntil <= Date.now()) return undefined

    const intervalId = window.setInterval(() => {
      forceProgressTick((value) => value + 1)
    }, 80)

    return () => window.clearInterval(intervalId)
  }, [loginProgressValue, logoutFallbackUntil])

  const canSubmit = useMemo(() => email.trim() && motDePasse.trim().length >= 6, [email, motDePasse])

  if (loginProgressValue == null && !loading && isAuthenticated && role === 'ADMIN') {
    return <Navigate to="/dashboard" replace />
  }

  if (logoutFallbackUntil > Date.now()) {
    return (
      <AdminRouteFallback
        message="Enregistrement de l'espace admin..."
        progressValue={resolveMinimumDurationProgress({
          actualProgress: 100,
          startedAt: logoutFallbackUntil - ADMIN_LOGIN_FALLBACK_MIN_DURATION_MS,
        })}
      />
    )
  }

  if (loginProgressValue != null) {
    return (
      <AdminRouteFallback
        message="Chargement de l'espace admin..."
        progressValue={resolveMinimumDurationProgress({
          actualProgress: loginProgressValue,
          startedAt: loginStartedAt,
        })}
      />
    )
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError(null)

    if (!EMAIL_REGEX.test(email.trim())) {
      setError('Veuillez entrer un email administrateur valide.')
      return
    }

    if (motDePasse.trim().length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caracteres.')
      return
    }

    const startedAt = Date.now()
    setLoginStartedAt(startedAt)
    setIsLoading(true)
    setLoginProgressValue(34)

    try {
      const nextRole = await login(email.trim(), motDePasse, rememberMe)
      setIsLoading(false)

      if (nextRole === 'ADMIN') {
        setLoginProgressValue(100)
        const elapsed = Date.now() - startedAt
        const remaining = Math.max(0, ADMIN_LOGIN_FALLBACK_MIN_DURATION_MS - elapsed)
        if (remaining > 0) {
          await new Promise((resolve) => window.setTimeout(resolve, remaining))
        }
        navigate('/dashboard', { replace: true })
        return
      }
    } finally {
      setIsLoading(false)
    }

    setLoginProgressValue(null)
  }

  return (
    <div className="admin-auth-page">
      <div className="admin-auth-shell">
        <section className="admin-auth-card">
          <div className="admin-auth-card-head">
            <p className="admin-auth-card-kicker">TikTok App Backoffice</p>
            <h2>Connexion</h2>
          </div>

          <AdminFeedbackBanner type="error" message={error} onClose={() => setError(null)} />

          <form onSubmit={handleSubmit} className="admin-auth-form">
            <div className="admin-auth-field">
              <label className="admin-auth-label" htmlFor="admin-email">Email</label>
              <input
                id="admin-email"
                name="email"
                type="email"
                className="admin-auth-input"
                placeholder="admin@tiktokapp.local"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={isLoading}
                autoComplete="username"
              />
            </div>

            <div className="admin-auth-field">
              <label className="admin-auth-label" htmlFor="admin-password">Mot de passe</label>
              <div className="admin-auth-password-wrap">
                <input
                  id="admin-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  className="admin-auth-input admin-auth-input-password"
                  placeholder="Mot de passe"
                  value={motDePasse}
                  onChange={(event) => setMotDePasse(event.target.value)}
                  disabled={isLoading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="admin-auth-password-toggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  disabled={isLoading}
                >
                  {showPassword ? 'Masquer' : 'Afficher'}
                </button>
              </div>
            </div>

            <label className="admin-auth-remember">
              <input
                id="admin-remember-me"
                name="rememberMe"
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
                disabled={isLoading}
              />
              <span>Garder ma session</span>
            </label>

            <button type="submit" className="admin-auth-submit" disabled={isLoading || !canSubmit}>
              <span className="admin-auth-submit-text">{isLoading ? 'Connexion en cours...' : 'Se connecter'}</span>
              <span className="admin-auth-submit-icon" aria-hidden="true">
                {isLoading ? '...' : '->'}
              </span>
            </button>
          </form>

          <div className="admin-auth-demo-hint">
            <p className="admin-auth-card-kicker">Accès démo</p>
            <p>Renseigne les identifiants locaux via `VITE_MOCK_ADMIN_EMAIL` et `VITE_MOCK_ADMIN_PASSWORD` si tu actives `VITE_USE_MOCK_ADMIN_AUTH=true`.</p>
          </div>
        </section>
      </div>
    </div>
  )
}
