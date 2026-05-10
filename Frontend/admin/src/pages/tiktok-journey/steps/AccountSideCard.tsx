import type { NavigateFunction } from 'react-router-dom'
import type { ContentIdea, TikTokAccount } from '../../../types'
import { Pill } from '../../../design-system'

export function AccountSideCard({
  connectedTikTokAccount,
  hasConnectedTikTokAccount,
  formatShortOpenId,
  activeIdea,
  navigate,
}: {
  connectedTikTokAccount: TikTokAccount | null
  hasConnectedTikTokAccount: boolean
  formatShortOpenId: (v: string | null | undefined) => string
  activeIdea: ContentIdea | null
  navigate: NavigateFunction
}) {
  const account = hasConnectedTikTokAccount ? connectedTikTokAccount : null
  return (
    <div className="journey-wizard-side-card">
      <div className="journey-wizard-side-card-head">
        <h3>Compte TikTok</h3>
        <button
          type="button"
          className="journey-wizard-side-card-link"
          onClick={() => navigate('/accounts')}
        >
          Gerer
        </button>
      </div>
      {account ? (
        <div className="journey-account-row">
          <div className="journey-account-row-head">
            <strong>{account.nickname || 'Compte connecte'}</strong>
            <Pill tone="success">Connecte</Pill>
          </div>
          <span className="journey-account-row-detail">
            {formatShortOpenId(activeIdea?.tiktokAccountOpenId || account.openId)}
          </span>
          <span className="journey-account-row-detail">Scope: {account.scope || '-'}</span>
        </div>
      ) : (
        <div className="journey-account-row">
          <div className="journey-account-row-head">
            <strong>Aucun compte connecte</strong>
            <Pill tone="error">Off</Pill>
          </div>
          <span className="journey-account-row-detail">Connecte un compte dans Accounts.</span>
        </div>
      )}
    </div>
  )
}
