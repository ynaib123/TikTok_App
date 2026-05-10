import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { ContentIdea } from '../../../types'
import type { IconComponent, StepDescriptor } from '../types'
import { Modal, Button } from '../../../design-system'

/** Maps a STEPS[].id to the i18n key where its label / sub-label live. */
const STEP_I18N_KEY: Record<string, string> = {
  creation: 'steps.creation',
  audio: 'steps.audio',
  media: 'steps.template',
  recapitulatif: 'steps.render',
  template: 'steps.template',
  'init-publish': 'steps.render',
  upload: 'steps.upload',
}

export function LeaveConfirmModal({
  activeIdea,
  willDeleteOnLeave = false,
  onClose,
  onLeaveWithoutSaving,
  onSaveAndLeave,
}: {
  activeIdea: ContentIdea | null
  willDeleteOnLeave?: boolean
  onClose: () => void
  onLeaveWithoutSaving: () => void
  onSaveAndLeave: () => void
}) {
  const hasIdea = Boolean(activeIdea?.id)

  let bodyText: ReactNode
  if (!hasIdea) {
    bodyText = "Aucune idée n'a encore été créée. Tu peux quitter sans rien perdre."
  } else if (willDeleteOnLeave) {
    bodyText = (
      <>
        <strong style={{ display: 'block', marginBottom: 6 }}>
          ⚠️ Quitter sans sauvegarder supprimera cette idée définitivement.
        </strong>
        Sauvegarder te permet de retrouver l&apos;idée dans la bibliothèque et de reprendre là où tu
        t&apos;es arrêté.
      </>
    )
  } else {
    bodyText =
      "Sauvegarder te permet de retrouver cette idée dans la bibliothèque et de reprendre là où tu t'es arrêté. Quitter sans sauvegarder abandonnera les dernières modifications."
  }

  return (
    <Modal
      open={true}
      onClose={onClose}
      title="Quitter le parcours ?"
      footer={
        <div className="journey-modal-actions">
          <Button variant="secondary" onClick={onClose}>
            Continuer le parcours
          </Button>
          {hasIdea && (
            <Button variant="secondary" onClick={onLeaveWithoutSaving}>
              {willDeleteOnLeave ? '🗑 Supprimer et quitter' : 'Quitter sans sauvegarder'}
            </Button>
          )}
          {!hasIdea && (
            <Button variant="secondary" onClick={onLeaveWithoutSaving}>
              Quitter
            </Button>
          )}
          {hasIdea && (
            <Button variant="primary" onClick={onSaveAndLeave}>
              💾 Sauvegarder et quitter
            </Button>
          )}
        </div>
      }
    >
      <p style={{ margin: 0 }}>{bodyText}</p>
    </Modal>
  )
}

export function ProgressStepper({
  steps,
  currentStepIndex,
  goToStep,
  onLibraryClick,
  BackArrow,
}: {
  steps: StepDescriptor[]
  currentStepIndex: number
  goToStep: (id: string) => void
  onLibraryClick: () => void
  BackArrow: IconComponent
}) {
  const { t } = useTranslation('journey')
  return (
    <header className="journey-wizard-head" aria-label={t('common.back')}>
      <button
        type="button"
        className="journey-wizard-head-back"
        onClick={onLibraryClick}
        aria-label={t('common.back')}
      >
        <BackArrow /> {t('common.back')}
      </button>
      <ol className="journey-wizard-steps">
        {steps.map((step, index) => {
          const isCurrent = index === currentStepIndex
          const isDone = index < currentStepIndex
          const isLocked = index > currentStepIndex
          const cls = `journey-wizard-step ${isCurrent ? 'is-current' : ''} ${isDone ? 'is-done' : ''} ${isLocked ? 'is-locked' : ''}`
          // Each step's user-facing label comes from the i18n bundle so the
          // STEPS array stays language-agnostic. Falls back to the inline label
          // if no mapping exists (defensive against a renamed step id).
          const i18nKey = STEP_I18N_KEY[step.id]
          const label = i18nKey ? t(`${i18nKey}.label`) : step.label
          return (
            <li key={step.id} className={cls}>
              <button
                type="button"
                className="journey-wizard-step-btn"
                onClick={() => !isLocked && goToStep(step.id)}
                disabled={isLocked}
                aria-current={isCurrent ? 'step' : undefined}
                aria-label={`${index + 1}: ${label}`}
              >
                <span className="journey-wizard-step-num">{isDone ? '✓' : index + 1}</span>
                <span className="journey-wizard-step-label">{label}</span>
              </button>
              {index < steps.length - 1 ? (
                <span className="journey-wizard-step-bar" aria-hidden="true" />
              ) : null}
            </li>
          )
        })}
      </ol>
      <span className="journey-wizard-head-progress" aria-hidden="true">
        {currentStepIndex + 1} / {steps.length}
      </span>
    </header>
  )
}
