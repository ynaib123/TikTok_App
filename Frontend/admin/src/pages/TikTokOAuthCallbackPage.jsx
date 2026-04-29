import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { completeTikTokAuthorization } from '../services/tiktokOAuthApi'

export default function TikTokOAuthCallbackPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [message, setMessage] = useState('Connexion TikTok en cours...')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let isActive = true

    async function run() {
      const code = searchParams.get('code')
      const state = searchParams.get('state')
      const oauthError = searchParams.get('error')
      const oauthDescription = searchParams.get('error_description')

      if (oauthError) {
        if (!isActive) return
        setErrorMessage(oauthDescription || oauthError || 'La connexion TikTok a ete refusee.')
        return
      }

      if (!code || !state) {
        if (!isActive) return
        setErrorMessage('Parametres OAuth TikTok manquants dans le callback.')
        return
      }

      try {
        const response = await completeTikTokAuthorization({ code, state })
        if (!isActive) return

        setMessage(response?.message || 'Compte TikTok connecte.')
        const redirectPath = response?.redirectPath || '/accounts'
        window.setTimeout(() => navigate(redirectPath, {
          replace: true,
          state: {
            tiktokOAuthSuccess: response?.displayName
              ? `Compte TikTok connecte: ${response.displayName}.`
              : 'Compte TikTok connecte avec succes.',
          },
        }), 800)
      } catch (error) {
        if (!isActive) return
        setErrorMessage(error?.message || 'Impossible de terminer la connexion TikTok.')
      }
    }

    void run()

    return () => {
      isActive = false
    }
  }, [navigate, searchParams])

  return (
    <div className="admin-mobile-blocked-page">
      <div className="admin-mobile-blocked-box" role="status" aria-live="polite">
        <p className="admin-auth-card-kicker">TikTok OAuth</p>
        <p className="admin-mobile-blocked-title">{errorMessage || message}</p>
        <p className="admin-mobile-blocked-copy">
          {errorMessage
            ? 'Reviens au backoffice pour relancer la connexion.'
            : 'Redirection vers le backoffice...'}
        </p>
      </div>
    </div>
  )
}
