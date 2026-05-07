import { useEffect, type JSX } from 'react'
import type { NavigateFunction } from 'react-router-dom'
import type { ContentIdea, TikTokAccount } from '../../types'

type IconComponent = () => JSX.Element

interface StepDescriptor {
  id: string
  label: string
  sub?: string
}

interface JourneyManualAction {
  shotstackUrl?: string | null
  uploadUrl?: string | null
}

interface TikTokStepScreenProps {
  steps: StepDescriptor[]
  currentStepIndex: number
  currentStep: StepDescriptor
  closeAddFlow: () => void
  saveAndCloseFlow: () => void
  isLeaveConfirmOpen: boolean
  openLeaveConfirm: () => void
  closeLeaveConfirm: () => void
  leaveWithoutSaving: () => void
  saveAndLeaveFlow: () => void
  goToStep: (id: string) => void
  ChevronDownIcon: IconComponent
  BackArrow: IconComponent
  VideoPreview: ({ url }: { url: string | null | undefined }) => JSX.Element | null
  activeIdea: ContentIdea | null
  connectedTikTokAccount: TikTokAccount | null
  displayedGeneratedIdeas: ContentIdea[]
  formatShortOpenId: (value: string | null | undefined) => string
  generationCategory: string
  generationCount: string | number
  handleGenerateIdea: () => Promise<void> | void
  handlePrepareAndUploadVideo: () => Promise<void> | void
  handlePrepareUpload: () => Promise<void> | void
  handlePublishVideo: () => Promise<void> | void
  handleRetryInitPublish: () => Promise<void> | void
  handleUploadVideo: () => Promise<void> | void
  handleValidateCreation: () => Promise<void> | void
  handleValidateInitPublish: () => void
  handleValidateUpload: () => void
  hasConnectedTikTokAccount: boolean
  isBusy: boolean
  isGeneratingIdeas: boolean
  isGeneratingScript: boolean
  isJourneyReady: boolean
  isPreparingUpload: boolean
  isPreparingVideo: boolean
  isPublishingVideo: boolean
  isUploadingVideo: boolean
  manualAction: JourneyManualAction | null
  maxIdeaBatchSize: number
  navigate: NavigateFunction
  openListMenu: string | null
  scriptedIdea: ContentIdea | null
  selectedGeneratedIdea: ContentIdea | null
  setGenerationCategory: (value: string) => void
  setGenerationCount: (value: string | number) => void
  setOpenListMenu: (value: string | null | ((current: string | null) => string | null)) => void
  setSelectedGeneratedIdeaId: (value: number) => void
  successMessage: string | null
  tiktokCategoryOptions: string[]
  uploadResult: unknown
}

function KV({ label, value, mono = false }: { label: string; value: string | null | undefined; mono?: boolean }) {
  const isEmpty = !value || value === '-' || value === 'En attente'
  return (
    <div className="journey-kv-row">
      <span className="journey-kv-row-label">{label}</span>
      <span className={`journey-kv-row-value ${mono ? 'is-mono' : ''} ${isEmpty ? 'is-empty' : ''}`}>
        {value || 'En attente'}
      </span>
    </div>
  )
}

function LeaveConfirmModal({ activeIdea, onClose, onLeaveWithoutSaving, onSaveAndLeave }: {
  activeIdea: ContentIdea | null
  onClose: () => void
  onLeaveWithoutSaving: () => void
  onSaveAndLeave: () => void
}) {
  const ideaLabel = activeIdea?.id ? `#${activeIdea.id}` : null
  return (
    <div className="journey-modal-overlay">
      <button
        type="button"
        className="journey-modal-backdrop"
        aria-label="Fermer la fenetre"
        onClick={onClose}
      />
      <div
        className="journey-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="leave-confirm-title"
      >
        <header className="journey-modal-head">
          <h3 id="leave-confirm-title">Quitter le parcours ?</h3>
          <button type="button" className="journey-modal-close" onClick={onClose} aria-label="Fermer">x</button>
        </header>
        <div className="journey-modal-body">
          <p style={{ margin: 0 }}>
            {ideaLabel
              ? <>Tu peux sauvegarder l&apos;idee {ideaLabel} et reprendre plus tard depuis la bibliotheque, ou quitter sans sauvegarder.</>
              : <>Aucune idee n&apos;a encore ete creee. Quitter le parcours ne perdra rien.</>}
          </p>
        </div>
        <footer className="journey-modal-actions">
          <button type="button" className="journey-btn is-ghost" onClick={onClose}>
            Continuer
          </button>
          <button type="button" className="journey-btn is-secondary" onClick={onLeaveWithoutSaving}>
            Quitter sans sauvegarder
          </button>
          <button type="button" className="journey-btn is-primary" onClick={onSaveAndLeave}>
            Sauvegarder et quitter
          </button>
        </footer>
      </div>
    </div>
  )
}

function ProgressStepper({ steps, currentStepIndex, goToStep, onLibraryClick, BackArrow }: {
  steps: StepDescriptor[]
  currentStepIndex: number
  goToStep: (id: string) => void
  onLibraryClick: () => void
  BackArrow: IconComponent
}) {
  return (
    <header className="journey-wizard-head" aria-label="Progression du parcours">
      <button type="button" className="journey-wizard-head-back" onClick={onLibraryClick}>
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
              >
                <span className="journey-wizard-step-num">{isDone ? '✓' : index + 1}</span>
                <span className="journey-wizard-step-label">{step.label}</span>
              </button>
              {index < steps.length - 1 ? <span className="journey-wizard-step-bar" aria-hidden="true" /> : null}
            </li>
          )
        })}
      </ol>
      <span className="journey-wizard-head-progress">
        {currentStepIndex + 1} / {steps.length}
      </span>
    </header>
  )
}

function AccountSideCard({
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
        <button type="button" className="journey-wizard-side-card-link" onClick={() => navigate('/accounts')}>
          Gerer
        </button>
      </div>
      {account ? (
        <div className="journey-account-row">
          <div className="journey-account-row-head">
            <strong>{account.nickname || 'Compte connecte'}</strong>
            <span className="journey-status-pill is-published">Connecte</span>
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
            <span className="journey-status-pill is-error">Off</span>
          </div>
          <span className="journey-account-row-detail">Connecte un compte dans Accounts.</span>
        </div>
      )}
    </div>
  )
}

type StepBodyProps = TikTokStepScreenProps

function CreationStep(p: StepBodyProps) {
  const { displayedGeneratedIdeas, selectedGeneratedIdea, setSelectedGeneratedIdeaId } = p

  useEffect(() => {
    if (displayedGeneratedIdeas.length > 0 && !selectedGeneratedIdea) {
      setSelectedGeneratedIdeaId(displayedGeneratedIdeas[0].id)
    }
  }, [displayedGeneratedIdeas, selectedGeneratedIdea, setSelectedGeneratedIdeaId])

  const idea = p.scriptedIdea || p.selectedGeneratedIdea

  return (
    <div className="journey-wizard-grid">
      <aside className="journey-wizard-grid-side">
        <div className="journey-wizard-side-card">
          <span className="journey-wizard-card-label">Parametres</span>
          <div className="journey-step-row">
            <label htmlFor="journey-cat-trigger">Categorie</label>
            <div className="tiktok-step-toolbar-select" style={{ position: 'relative' }}>
              <button
                id="journey-cat-trigger"
                type="button"
                className={`admin-product-toolbar-trigger tiktok-step-toolbar-trigger ${p.openListMenu === 'tiktok-category' ? 'is-open' : ''}`}
                onClick={() => p.setOpenListMenu((m) => (m === 'tiktok-category' ? null : 'tiktok-category'))}
                aria-haspopup="listbox"
                aria-expanded={p.openListMenu === 'tiktok-category'}
                disabled={p.isBusy || !p.isJourneyReady}
              >
                <strong>{p.generationCategory}</strong>
                <span className="admin-toolbar-icon" aria-hidden="true"><p.ChevronDownIcon /></span>
              </button>
              {p.openListMenu === 'tiktok-category' ? (
                <div className="admin-product-toolbar-menu tiktok-step-toolbar-menu" role="listbox">
                  <div className="admin-product-toolbar-menu-options-scroll admin-product-toolbar-menu-options-scroll-five">
                    {p.tiktokCategoryOptions.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        className={`admin-product-toolbar-option ${p.generationCategory === cat ? 'is-selected' : ''}`}
                        onClick={() => { p.setGenerationCategory(cat); p.setOpenListMenu(null) }}
                      >
                        <span>{cat}</span>
                        {p.generationCategory === cat ? <strong>.</strong> : null}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="journey-step-cta journey-step-cta-stack">
            <button
              type="button"
              className="journey-btn"
              onClick={() => void p.handleGenerateIdea()}
              disabled={p.isBusy || !p.isJourneyReady}
            >
              {idea ? 'Regenerer' : 'Generer'}
            </button>
            <button
              type="button"
              className="journey-btn is-primary"
              onClick={() => void p.handleValidateCreation()}
              disabled={p.isBusy || !idea || !p.isJourneyReady}
            >
              Generer la video →
            </button>
          </div>
        </div>
      </aside>

      <section className="journey-wizard-grid-main">
        <span className="journey-wizard-card-label">Resultat</span>
        {!p.isJourneyReady ? (
          <div className="journey-empty">
            <strong>Comptes incomplets</strong>
            <p>Connecte TikTok, Groq, Shotstack et Pexels dans Accounts avant de generer.</p>
            <button type="button" className="journey-btn is-ghost" onClick={() => p.navigate('/accounts')}>
              Ouvrir Accounts
            </button>
          </div>
        ) : p.isGeneratingIdeas || p.isGeneratingScript ? (
          <div className="journey-loading">
            <div className="journey-loading-spinner" />
            <div className="journey-loading-copy">
              <strong>Generation en cours</strong>
              <span>Idee + script en preparation...</span>
            </div>
          </div>
        ) : idea ? (
          <div className="journey-kv-grid">
            <KV label="Topic" value={idea.topic} />
            <KV label="Script" value={idea.script} />
            <KV label="Caption" value={idea.caption} />
            <KV label="Keyword" value={idea.keyword} />
          </div>
        ) : (
          <div className="journey-empty">
            <strong>Aucune idee generee</strong>
            <p>Choisis une categorie a gauche puis clique sur Generer.</p>
          </div>
        )}
      </section>
    </div>
  )
}

function RenderStep(p: StepBodyProps) {
  const previewUrl = p.manualAction?.shotstackUrl || p.scriptedIdea?.shotstackUrl || p.selectedGeneratedIdea?.shotstackUrl

  return (
    <div className="journey-wizard-grid is-video-stage">
      <aside className="journey-wizard-grid-side">
        {p.scriptedIdea ? (
          <div className="journey-wizard-side-card">
            <span className="journey-wizard-card-label">Contenu</span>
            <div className="journey-kv-grid">
              <KV label="Topic" value={p.scriptedIdea.topic} />
              <KV label="Caption" value={p.scriptedIdea.caption} />
              <KV label="Keyword" value={p.scriptedIdea.keyword} />
            </div>
          </div>
        ) : null}

        <div className="journey-wizard-side-card">
          <span className="journey-wizard-card-label">Actions</span>
          <div className="journey-step-cta journey-step-cta-stack">
            <button type="button" className="journey-btn" onClick={() => void p.handleRetryInitPublish()} disabled={p.isBusy}>
              Relancer le rendu
            </button>
            <button
              type="button"
              className="journey-btn is-primary"
              onClick={p.handleValidateInitPublish}
              disabled={p.isBusy || !previewUrl}
            >
              Valider la video →
            </button>
          </div>
        </div>
      </aside>

      <section className="journey-wizard-grid-main is-video-stage">
        <span className="journey-wizard-card-label">Apercu video</span>
        {p.isPreparingVideo && !previewUrl ? (
          <div className="journey-loading">
            <div className="journey-loading-spinner" />
            <div className="journey-loading-copy">
              <strong>Generation video en cours</strong>
              <span>Le rendu Shotstack peut prendre quelques minutes.</span>
            </div>
          </div>
        ) : (
          <p.VideoPreview url={previewUrl} />
        )}
      </section>
    </div>
  )
}

function UploadStep(p: StepBodyProps) {
  const previewUrl = p.manualAction?.shotstackUrl || p.scriptedIdea?.shotstackUrl || p.selectedGeneratedIdea?.shotstackUrl

  return (
    <div className="journey-wizard-grid is-video-stage">
      <aside className="journey-wizard-grid-side">
        <div className="journey-wizard-side-card">
          <span className="journey-wizard-card-label">Actions</span>
          <div className="journey-step-cta journey-step-cta-stack">
            <button
              type="button"
              className="journey-btn is-primary"
              onClick={() => void p.handlePrepareAndUploadVideo()}
              disabled={p.isBusy || !previewUrl || !p.isJourneyReady}
            >
              {p.isPreparingUpload || p.isUploadingVideo || p.isPublishingVideo ? 'Publication...' : 'Publier sur TikTok'}
            </button>
          </div>
        </div>

        <AccountSideCard
          connectedTikTokAccount={p.connectedTikTokAccount}
          hasConnectedTikTokAccount={p.hasConnectedTikTokAccount}
          formatShortOpenId={p.formatShortOpenId}
          activeIdea={p.activeIdea}
          navigate={p.navigate}
        />
      </aside>

      <section className="journey-wizard-grid-main is-video-stage">
        <span className="journey-wizard-card-label">Publication</span>
        {previewUrl ? <p.VideoPreview url={previewUrl} /> : (
          <div className="journey-empty">
            <strong>Aucune video disponible</strong>
            <p>Reviens a l'etape Video pour generer un rendu.</p>
          </div>
        )}
      </section>
    </div>
  )
}

function PublishStep(p: StepBodyProps) {
  const previewUrl = p.manualAction?.shotstackUrl || p.scriptedIdea?.shotstackUrl || p.selectedGeneratedIdea?.shotstackUrl

  return (
    <div className="journey-wizard-grid is-video-stage">
      <aside className="journey-wizard-grid-side">
        <div className="journey-wizard-side-card">
          <span className="journey-wizard-card-label">Actions</span>
          <div className="journey-step-cta journey-step-cta-stack">
            <button
              type="button"
              className="journey-btn is-primary"
              onClick={() => void p.handlePublishVideo()}
              disabled={p.isBusy}
            >
              {p.isPublishingVideo ? 'Publication...' : 'Publier sur TikTok'}
            </button>
          </div>
        </div>

        <AccountSideCard
          connectedTikTokAccount={p.connectedTikTokAccount}
          hasConnectedTikTokAccount={p.hasConnectedTikTokAccount}
          formatShortOpenId={p.formatShortOpenId}
          activeIdea={p.activeIdea}
          navigate={p.navigate}
        />
      </aside>

      <section className="journey-wizard-grid-main is-video-stage">
        <span className="journey-wizard-card-label">Publication</span>
        {previewUrl ? <p.VideoPreview url={previewUrl} /> : null}
      </section>
    </div>
  )
}

export default function TikTokStepScreen(props: TikTokStepScreenProps) {
  let body: JSX.Element
  if (props.currentStep.id === 'creation') body = <CreationStep {...props} />
  else if (props.currentStep.id === 'init-publish') body = <RenderStep {...props} />
  else if (props.currentStep.id === 'upload') body = <UploadStep {...props} />
  else body = <PublishStep {...props} />

  return (
    <div className="journey-wizard">
      <ProgressStepper
        steps={props.steps}
        currentStepIndex={props.currentStepIndex}
        goToStep={props.goToStep}
        onLibraryClick={props.openLeaveConfirm}
        BackArrow={props.BackArrow}
      />

      <main className="journey-wizard-main">
        {body}
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
  )
}
