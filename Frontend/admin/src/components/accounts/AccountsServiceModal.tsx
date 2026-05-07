import type { Dispatch, RefObject, SetStateAction } from 'react'
import type { ServiceProvider } from '../../types'
import {
  type ServiceProviderFieldConfig,
  type ServiceConnectionForm,
} from '../../types/services'
import { parseScopes } from '../../utils/accountsHelpers'
import type { AccountsActionStatus } from './AccountsList'

export interface AccountsServiceModalProps {
  providerKey: ServiceProvider
  providerConfig: ServiceProviderFieldConfig
  form: ServiceConnectionForm
  isEditing: boolean
  stepperStep: number
  setStepperStep: Dispatch<SetStateAction<number>>
  confirmName: string
  setConfirmName: Dispatch<SetStateAction<string>>
  modalRef: RefObject<HTMLDivElement | null>
  hasPendingAction: (key: string | null | undefined, status: AccountsActionStatus) => boolean
  onClose: (provider: ServiceProvider) => void
  onSave: (provider: ServiceProvider) => void
  onDelete: (provider: ServiceProvider, connectionId: number | string) => void
  onUpdateForm: (
    provider: ServiceProvider,
    field: keyof ServiceConnectionForm,
    value: string,
  ) => void
}

export function AccountsServiceModal({
  providerKey,
  providerConfig,
  form,
  isEditing,
  stepperStep,
  setStepperStep,
  confirmName,
  setConfirmName,
  modalRef,
  hasPendingAction,
  onClose,
  onSave,
  onDelete,
  onUpdateForm,
}: AccountsServiceModalProps) {
  return (
    <div className="accounts-modal-overlay">
      <button
        type="button"
        className="accounts-modal-backdrop"
        aria-label="Fermer la fenêtre"
        onClick={() => onClose(providerKey)}
      />
      <div
        ref={modalRef}
        className="accounts-modal accounts-stepper-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="accounts-modal-title"
      >
        <div className="accounts-modal-header">
          <h3 id="accounts-modal-title">
            {isEditing ? 'Éditer' : 'Connecter'} {providerConfig.title}
          </h3>
          <button
            type="button"
            className="accounts-modal-close"
            onClick={() => onClose(providerKey)}
            aria-label="Fermer"
          >
            ×
          </button>
        </div>

        {!isEditing ? (
          <div className="accounts-stepper-track">
            {['Authentification', 'Scopes', 'Terminé'].map((label, idx) => {
              const stepNum = idx + 1
              const reached = stepperStep >= stepNum
              const active = stepperStep === stepNum
              return (
                <div
                  key={label}
                  className={`accounts-stepper-step ${reached ? 'is-reached' : ''} ${active ? 'is-active' : ''}`}
                >
                  <span className="accounts-stepper-dot">{stepNum}</span>
                  <span className="accounts-stepper-label">{label}</span>
                </div>
              )
            })}
          </div>
        ) : null}

        <div className="accounts-modal-body">
          {(stepperStep === 1 || isEditing) && (
            <div className="accounts-service-form-grid">
              <label className="tiktok-step-field">
                <span>Nom</span>
                <input
                  type="text"
                  value={form.displayName}
                  onChange={(e) => onUpdateForm(providerKey, 'displayName', e.target.value)}
                  placeholder={`${providerConfig.title} production`}
                />
              </label>
              <label className="tiktok-step-field">
                <span>{providerConfig.identifierLabel}</span>
                <input
                  type="text"
                  value={form.accountIdentifier}
                  onChange={(e) =>
                    onUpdateForm(providerKey, 'accountIdentifier', e.target.value)
                  }
                  placeholder="Owner / workspace / email"
                />
              </label>
              <label className="tiktok-step-field">
                <span>{providerConfig.secretLabel}</span>
                <input
                  type="password"
                  value={form.secretValue}
                  onChange={(e) => onUpdateForm(providerKey, 'secretValue', e.target.value)}
                  placeholder="Coller le secret ici"
                />
              </label>
            </div>
          )}

          {stepperStep === 2 && !isEditing && (
            <div className="accounts-stepper-scopes">
              <p className="accounts-stepper-blurb">
                Vérifie les scopes détectés depuis ton fichier metadata avant validation.
              </p>
              <div className="accounts-card-scopes">
                {parseScopes(form.metadataJson).length === 0 ? (
                  <span className="accounts-muted">
                    Aucun scope détecté — la connexion utilisera les permissions par défaut.
                  </span>
                ) : (
                  parseScopes(form.metadataJson).map((s) => (
                    <span key={s} className="accounts-scope-chip">
                      {s}
                    </span>
                  ))
                )}
              </div>
            </div>
          )}

          {stepperStep === 3 && !isEditing && (
            <div className="accounts-stepper-done">
              <div className="accounts-stepper-done-check">✓</div>
              <h4>{providerConfig.title} connecté</h4>
              <p>Le profil a été enregistré et activé. Tu peux le retrouver dans la grille.</p>
            </div>
          )}

          {isEditing && form.connectionId ? (
            <div className="accounts-danger-zone">
              <h4>Zone dangereuse</h4>
              <p>
                Pour déconnecter, tape exactement <code>{providerConfig.title}</code> ci-dessous.
              </p>
              <div className="accounts-danger-row">
                <input
                  type="text"
                  value={confirmName}
                  onChange={(e) => setConfirmName(e.target.value)}
                  placeholder={providerConfig.title}
                />
                <button
                  type="button"
                  className="video-action-btn danger"
                  onClick={() => {
                    if (confirmName === providerConfig.title && form.connectionId) {
                      onDelete(providerKey, form.connectionId)
                      onClose(providerKey)
                    }
                  }}
                  disabled={confirmName !== providerConfig.title}
                >
                  Déconnecter définitivement
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="accounts-modal-footer">
          {isEditing ? (
            <>
              <button
                type="button"
                className="video-action-btn ghost"
                onClick={() => onClose(providerKey)}
              >
                Annuler
              </button>
              <button
                type="button"
                className="video-action-btn primary"
                onClick={() => onSave(providerKey)}
                disabled={hasPendingAction(providerKey, 'saving')}
              >
                {hasPendingAction(providerKey, 'saving') ? 'Enregistrement…' : 'Mettre à jour'}
              </button>
            </>
          ) : (
            <>
              {stepperStep > 1 && stepperStep < 3 ? (
                <button
                  type="button"
                  className="video-action-btn ghost"
                  onClick={() => setStepperStep((s) => Math.max(1, s - 1))}
                >
                  Retour
                </button>
              ) : (
                <button
                  type="button"
                  className="video-action-btn ghost"
                  onClick={() => onClose(providerKey)}
                >
                  {stepperStep === 3 ? 'Fermer' : 'Annuler'}
                </button>
              )}

              {stepperStep === 1 ? (
                <button
                  type="button"
                  className="video-action-btn primary"
                  onClick={() => setStepperStep(2)}
                >
                  Suivant
                </button>
              ) : null}
              {stepperStep === 2 ? (
                <button
                  type="button"
                  className="video-action-btn primary"
                  onClick={() => onSave(providerKey)}
                  disabled={hasPendingAction(providerKey, 'saving')}
                >
                  {hasPendingAction(providerKey, 'saving')
                    ? 'Connexion…'
                    : 'Enregistrer & valider'}
                </button>
              ) : null}
              {stepperStep === 3 ? (
                <button
                  type="button"
                  className="video-action-btn primary"
                  onClick={() => onClose(providerKey)}
                >
                  Terminé
                </button>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
