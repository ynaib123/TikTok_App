import { ProviderGlyph } from './AccountsPresenters'
import { Button } from '../../design-system'
import type { ServiceProvider } from '../../types'

type AvailableProvider = { key: string; title: string; kind: string }

export function AccountsHeader({
  availableProviders,
  connectMenuOpen,
  setConnectMenuOpen,
  isConnectingTikTok,
  onConnectTikTok,
  onStartNewServiceProfile,
}: {
  availableProviders: AvailableProvider[]
  connectMenuOpen: boolean
  setConnectMenuOpen: (updater: (v: boolean) => boolean) => void
  isConnectingTikTok: boolean
  onConnectTikTok: () => void | Promise<void>
  onStartNewServiceProfile: (key: ServiceProvider) => void
}) {
  return (
    <header className="journey-page-head">
      <div className="journey-page-head-copy">
        <h1>Tous tes comptes et services en un seul endroit</h1>
        <p>Connecte, surveille et fais tourner TikTok et tes services automatises depuis une seule console.</p>
      </div>
      <div className="journey-page-head-actions">
        <div className="accounts-connect-menu">
          <Button
            variant="primary"
            onClick={() => setConnectMenuOpen((v) => !v)}
            disabled={isConnectingTikTok}
            loading={isConnectingTikTok}
          >
            + Connecter un service
          </Button>
          {connectMenuOpen ? (
            <div className="accounts-connect-menu-popover" role="menu">
              {availableProviders.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  className="accounts-connect-menu-item"
                  onClick={() => {
                    setConnectMenuOpen(() => false)
                    if (p.key === 'TIKTOK') {
                      void onConnectTikTok()
                    } else {
                      onStartNewServiceProfile(p.key as ServiceProvider)
                    }
                  }}
                >
                  <ProviderGlyph providerKey={p.key} />
                  <span className="accounts-connect-menu-item-text">
                    <strong>{p.title}</strong>
                    <small>{p.kind}</small>
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  )
}
