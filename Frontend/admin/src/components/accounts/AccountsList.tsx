import { ProviderGlyph, StatusPill } from './AccountsPresenters'
import type { ServiceConnection, ServiceProvider } from '../../types'
import { formatExpiry, formatRelative, type DerivedStatus } from '../../utils/accountsHelpers'

export interface AccountsListRow {
  key: string
  providerKey: string
  title: string
  detail: string
  status: DerivedStatus
  kind: 'OAuth' | 'API key'
  expiresAt: string | null
  lastUsedAt: string | null
  rateUsage: { used: number; limit: number } | null
  scopes: string[]
  isTikTok: boolean
  accountId?: number
  connection?: ServiceConnection
}

export type AccountsActionStatus = 'saving' | 'disconnecting' | 'activating' | 'validating'

export interface AccountsListProps {
  rows: AccountsListRow[]
  viewMode: 'cards' | 'table'
  /** Si vrai, l'etat vide affiche un message d'indisponibilite plutot que "aucun compte ne correspond". */
  loadFailed?: boolean
  hasPendingAction: (key: string | null | undefined, status: AccountsActionStatus) => boolean
  onDisconnectTikTok: (accountId: number) => void
  onValidateService: (provider: ServiceProvider, connectionId: number | string) => void
  onLoadServiceProfile: (provider: ServiceProvider, connection: ServiceConnection) => void
}

function rateRemainingPercent(rateUsage: AccountsListRow['rateUsage']): number {
  if (!rateUsage || rateUsage.limit <= 0) return 0
  return Math.max(0, 100 - Math.min(100, Math.round((rateUsage.used / rateUsage.limit) * 100)))
}

export function AccountsList({
  rows,
  viewMode,
  loadFailed = false,
  hasPendingAction,
  onDisconnectTikTok,
  onValidateService,
  onLoadServiceProfile,
}: AccountsListProps) {
  const emptyMessage = loadFailed
    ? 'Donnees indisponibles. Le backend est en train de revenir, recharge la page dans quelques secondes.'
    : 'Aucun compte ne correspond aux filtres.'
  if (viewMode === 'cards') {
    return (
      <section className="accounts-cards-grid">
        {rows.length === 0 ? (
          <div className="accounts-empty">{emptyMessage}</div>
        ) : (
          rows.map((row) => {
            const expiry = formatExpiry(row.expiresAt)
            const rateRemaining = rateRemainingPercent(row.rateUsage)
            return (
              <article key={row.key} className="accounts-card">
                <header className="accounts-card-head">
                  <ProviderGlyph providerKey={row.providerKey} />
                  <div className="accounts-card-head-text">
                    <strong>{row.title}</strong>
                    <span>{row.detail}</span>
                  </div>
                  <StatusPill status={row.status} />
                </header>

                <dl className="accounts-card-meta">
                  <div>
                    <dt>Type</dt>
                    <dd>{row.kind}</dd>
                  </div>
                  <div>
                    <dt>Expiration</dt>
                    <dd className={`accounts-tone-${expiry.tone}`}>{expiry.label}</dd>
                  </div>
                  <div>
                    <dt>Dernière utilisation</dt>
                    <dd>{formatRelative(row.lastUsedAt)}</dd>
                  </div>
                </dl>

                {row.scopes.length ? (
                  <div className="accounts-card-scopes">
                    {row.scopes.slice(0, 4).map((s) => (
                      <span key={s} className="accounts-scope-chip">
                        {s}
                      </span>
                    ))}
                    {row.scopes.length > 4 ? (
                      <span className="accounts-scope-chip accounts-scope-chip-more">
                        +{row.scopes.length - 4}
                      </span>
                    ) : null}
                  </div>
                ) : null}

                <div className="accounts-rate">
                  <div className="accounts-rate-label">
                    <span>Quota restant</span>
                    <span>
                      {row.rateUsage && row.rateUsage.limit > 0 ? `${rateRemaining}%` : 'n/a'}
                    </span>
                  </div>
                  <div className="accounts-rate-bar">
                    <div
                      className="accounts-rate-bar-fill"
                      style={{ width: `${rateRemaining}%` }}
                    />
                  </div>
                </div>

                <footer className="accounts-card-actions">
                  {row.isTikTok ? (
                    <button
                      type="button"
                      className="video-action-btn ghost danger"
                      onClick={() => row.accountId && onDisconnectTikTok(row.accountId)}
                      disabled={hasPendingAction(`TIKTOK-${row.accountId}`, 'disconnecting')}
                    >
                      {hasPendingAction(`TIKTOK-${row.accountId}`, 'disconnecting')
                        ? 'Déconnexion…'
                        : 'Déconnecter'}
                    </button>
                  ) : row.connection ? (
                    <>
                      <button
                        type="button"
                        className="video-action-btn ghost"
                        onClick={() =>
                          onValidateService(row.providerKey as ServiceProvider, row.connection!.id)
                        }
                        disabled={hasPendingAction(
                          `${row.providerKey}-${row.connection.id}`,
                          'validating',
                        )}
                      >
                        {hasPendingAction(`${row.providerKey}-${row.connection.id}`, 'validating')
                          ? 'Vérification…'
                          : 'Vérifier'}
                      </button>
                      <button
                        type="button"
                        className="video-action-btn ghost"
                        onClick={() =>
                          onLoadServiceProfile(row.providerKey as ServiceProvider, row.connection!)
                        }
                      >
                        Éditer
                      </button>
                    </>
                  ) : null}
                </footer>
              </article>
            )
          })
        )}
      </section>
    )
  }

  return (
    <section className="accounts-table-wrap">
      <table className="accounts-table">
        <thead>
          <tr>
            <th>Service</th>
            <th>Statut</th>
            <th>Type</th>
            <th>Expiration</th>
            <th>Dernière utilisation</th>
            <th>Quota</th>
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={7} className="accounts-empty">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => {
              const expiry = formatExpiry(row.expiresAt)
              const rateRemaining = rateRemainingPercent(row.rateUsage)
              return (
                <tr key={row.key}>
                  <td>
                    <div className="accounts-table-service">
                      <ProviderGlyph providerKey={row.providerKey} />
                      <div>
                        <strong>{row.title}</strong>
                        <span>{row.detail}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <StatusPill status={row.status} />
                  </td>
                  <td>{row.kind}</td>
                  <td className={`accounts-tone-${expiry.tone}`}>{expiry.label}</td>
                  <td>{formatRelative(row.lastUsedAt)}</td>
                  <td>
                    {row.rateUsage && row.rateUsage.limit > 0 ? (
                      <div className="accounts-rate accounts-rate-inline">
                        <div className="accounts-rate-bar">
                          <div
                            className="accounts-rate-bar-fill"
                            style={{ width: `${rateRemaining}%` }}
                          />
                        </div>
                        <span>{rateRemaining}% restant</span>
                      </div>
                    ) : (
                      <span className="accounts-muted">n/a</span>
                    )}
                  </td>
                  <td className="accounts-table-actions">
                    {row.isTikTok ? (
                      <button
                        type="button"
                        className="video-action-btn ghost danger"
                        onClick={() => row.accountId && onDisconnectTikTok(row.accountId)}
                        disabled={hasPendingAction(`TIKTOK-${row.accountId}`, 'disconnecting')}
                      >
                        Déconnecter
                      </button>
                    ) : row.connection ? (
                      <button
                        type="button"
                        className="video-action-btn ghost"
                        onClick={() =>
                          onLoadServiceProfile(row.providerKey as ServiceProvider, row.connection!)
                        }
                      >
                        Éditer
                      </button>
                    ) : null}
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </section>
  )
}
