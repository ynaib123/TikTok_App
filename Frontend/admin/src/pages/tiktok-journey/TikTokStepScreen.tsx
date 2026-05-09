import { Suspense, lazy, useEffect, useRef, type JSX } from 'react'
import { useTranslation } from 'react-i18next'
import type { TikTokStepScreenProps } from './types'
import { JourneyContext } from './JourneyContext'
import { LeaveConfirmModal, ProgressStepper } from './steps/JourneyLayoutComponents'
import { JourneyErrorBoundary } from './steps/JourneyErrorBoundary'

// Each step is a sizeable bundle of its own (Pexels gallery, Remotion preview,
// TikTok publish flow). Lazy-loading keeps the initial library route under
// budget and only fetches the step the user is actually entering.
const CreationStep = lazy(() => import('./steps/CreationStep'))
const AudioStep = lazy(() => import('./steps/AudioStep'))
const TemplateStep = lazy(() => import('./steps/TemplateStep'))
const UploadStep = lazy(() => import('./steps/UploadStep'))
const PublishStep = lazy(() => import('./steps/PublishStep'))

function StepFallback() {
  const { t } = useTranslation('journey')
  return (
    <div className="journey-loading" aria-busy="true">
      <div className="journey-loading-spinner" />
      <div className="journey-loading-copy">
        <strong>{t('stepLoading.title')}</strong>
        <span>{t('stepLoading.sub')}</span>
      </div>
    </div>
  )
}

export default function TikTokStepScreen(props: TikTokStepScreenProps) {
  let body: JSX.Element
  if (props.currentStep.id === 'creation') body = <CreationStep />
  else if (props.currentStep.id === 'audio') body = <AudioStep />
  else if (props.currentStep.id === 'template' || props.currentStep.id === 'init-publish') body = <TemplateStep />
  else if (props.currentStep.id === 'upload') body = <UploadStep />
  else body = <PublishStep />

  const prevIndexRef = useRef(props.currentStepIndex)
  const direction: 'forward' | 'backward' = props.currentStepIndex >= prevIndexRef.current ? 'forward' : 'backward'

  useEffect(() => {
    prevIndexRef.current = props.currentStepIndex
  }, [props.currentStepIndex])

  return (
    <JourneyContext.Provider value={props}>
      <div className="journey-wizard">
        <ProgressStepper
          steps={props.steps}
          currentStepIndex={props.currentStepIndex}
          goToStep={props.goToStep}
          onLibraryClick={props.openLeaveConfirm}
          BackArrow={props.BackArrow}
        />

        <main className="journey-wizard-main">
          <div
            key={props.currentStep.id}
            className={`journey-step-anim is-${direction}`}
          >
            <JourneyErrorBoundary key={props.currentStep.id}>
              <Suspense fallback={<StepFallback />}>
                {body}
              </Suspense>
            </JourneyErrorBoundary>
          </div>
        </main>

        {props.isLeaveConfirmOpen ? (
          <LeaveConfirmModal
            activeIdea={props.activeIdea}
            onClose={props.closeLeaveConfirm}
            onLeaveWithoutSaving={props.leaveWithoutSaving}
            onSaveAndLeave={props.saveAndLeaveFlow}
          />
        ) : null}
      </div>
    </JourneyContext.Provider>
  )
}
