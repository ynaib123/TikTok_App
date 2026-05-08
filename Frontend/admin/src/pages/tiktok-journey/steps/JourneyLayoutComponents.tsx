import type { ContentIdea } from '../../../types'
import type { IconComponent, StepDescriptor } from '../types'
import { Modal, Button } from '../../../design-system'

export function LeaveConfirmModal({ activeIdea, onClose, onLeaveWithoutSaving, onSaveAndLeave }: {
  activeIdea: ContentIdea | null
  onClose: () => void
  onLeaveWithoutSaving: () => void
  onSaveAndLeave: () => void
}) {
  const ideaLabel = activeIdea?.id ? `#${activeIdea.id}` : null
  
  return (
    <Modal
      open={true}
      onClose={onClose}
      title="Quitter le parcours ?"
      footer={
        <div className="journey-modal-actions">
          <Button variant="secondary" onClick={onClose}>
            Continuer
          </Button>
          <Button variant="secondary" onClick={onLeaveWithoutSaving}>
            Quitter sans sauvegarder
          </Button>
          <Button variant="primary" onClick={onSaveAndLeave}>
            Sauvegarder et quitter
          </Button>
        </div>
      }
    >
      <p style={{ margin: 0 }}>
        {ideaLabel
          ? <>Tu peux sauvegarder l&apos;idee {ideaLabel} et reprendre plus tard depuis la bibliotheque, ou quitter sans sauvegarder.</>
          : <>Aucune idee n&apos;a encore ete creee. Quitter le parcours ne perdra rien.</>}
      </p>
    </Modal>
  )
}

export function ProgressStepper({ steps, currentStepIndex, goToStep, onLibraryClick, BackArrow }: {
  steps: StepDescriptor[]
  currentStepIndex: number
  goToStep: (id: string) => void
  onLibraryClick: () => void
  BackArrow: IconComponent
}) {
  return (
    <header className="journey-wizard-head" aria-label="Progression du parcours">
      <button 
        type="button" 
        className="journey-wizard-head-back" 
        onClick={onLibraryClick}
        aria-label="Retour à la bibliothèque"
      >
        <BackArrow /> Quitter
      </button>
      <ol className="journey-wizard-steps">
        {steps.map((step, index) => {
          const isCurrent = index === currentStepIndex
          const isDone = index < currentStepIndex
          const isLocked = index !== currentStepIndex
          const cls = `journey-wizard-step ${isCurrent ? 'is-current' : ''} ${isDone ? 'is-done' : ''} ${isLocked ? 'is-locked' : ''}`
          return (
            <li key={step.id} className={cls}>
              <button
                type="button"
                className="journey-wizard-step-btn"
                onClick={() => !isLocked && goToStep(step.id)}
                disabled={isLocked}
                aria-current={isCurrent ? 'step' : undefined}
                aria-label={`Étape ${index + 1}: ${step.label}`}
              >
                <span className="journey-wizard-step-num">{isDone ? '✓' : index + 1}</span>
                <span className="journey-wizard-step-label">{step.label}</span>
              </button>
              {index < steps.length - 1 ? <span className="journey-wizard-step-bar" aria-hidden="true" /> : null}
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
