/**
 * TikTokStepScreen — wizard with 2-column body (Proposal C, refined).
 *
 * Vertical flow:
 *   - Top horizontal stepper (sticky)
 *   - Step body: Left 65% = output preview / result, Right 35% = controls + TikTok account info
 *   - Bottom collapsible footer = live activity log
 *
 * Each generation produces a single result (no idea-list selection UI).
 * If multiple ideas come back from the backend, the first is auto-selected.
 */

import { useEffect, useRef, useState, type JSX } from 'react'
import type { NavigateFunction } from 'react-router-dom'
import type { ContentIdea, TikTokAccount } from '../../types'

type IconComponent = () => JSX.Element

interface StepDescriptor {
  id: string
  label: string
  sub?: string
}

interface TikTokStepScreenProps {
  steps: StepDescriptor[]
  currentStepIndex: number
  currentStep: StepDescriptor
  goBackInFlow: () => void
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

interface LogEntry {
  ts: number
  status: 'pending' | 'ok' | 'error' | 'info'
  msg: string
  meta?: string
}

interface JourneyManualAction {
  shotstackUrl?: string | null
  uploadUrl?: string | null
}

/* ── Activity log hook ────────────────────────────────────────────────── */

function useActivityLog(props: TikTokStepScreenProps): LogEntry[] {
  const [log, setLog] = useState<LogEntry[]>([])
  const lastRef = useRef<string>('')

  useEffect(() => {
    const push = (entry: Omit<LogEntry, 'ts'>) => {
      const sig = `${entry.status}:${entry.msg}`
      if (sig === lastRef.current) return
      lastRef.current = sig
      setLog((items) => [{ ...entry, ts: Date.now() }, ...items].slice(0, 30))
    }

    if (props.successMessage)             push({ status: 'ok',      msg: props.successMessage })
    if (props.isGeneratingIdeas)          push({ status: 'pending', msg: 'Generation des idees…', meta: props.generationCategory })
    if (props.isGeneratingScript)         push({ status: 'pending', msg: 'Generation du script…' })
    if (props.isPreparingVideo)           push({ status: 'pending', msg: 'Rendu Shotstack en cours…' })
    if (props.manualAction?.shotstackUrl) push({ status: 'ok',      msg: 'Video Shotstack disponible' })
    if (props.isPreparingUpload)          push({ status: 'pending', msg: 'Preparation upload TikTok…' })
    if (props.manualAction?.uploadUrl)    push({ status: 'ok',      msg: 'URL upload prete' })
    if (props.isUploadingVideo)           push({ status: 'pending', msg: 'Upload TikTok en cours…' })
    if (props.uploadResult)               push({ status: 'ok',      msg: 'Upload TikTok termine' })
    if (props.isPublishingVideo)          push({ status: 'pending', msg: 'Publication finale…' })
  }, [
    props.successMessage,
    props.isGeneratingIdeas,
    props.isGeneratingScript,
    props.isPreparingVideo,
    props.isPreparingUpload,
    props.isUploadingVideo,
    props.isPublishingVideo,
    props.manualAction?.shotstackUrl,
    props.manualAction?.uploadUrl,
    props.uploadResult,
    props.generationCategory,
  ])

  return log
}

function fmtTime(ts: number) {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
}

/* ── KV row helper ────────────────────────────────────────────────────── */

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

/* ── Leave confirmation modal ─────────────────────────────────────────── */

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
        aria-label="Fermer la fenêtre"
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
          <button type="button" className="journey-modal-close" onClick={onClose} aria-label="Fermer">×</button>
        </header>
        <div className="journey-modal-body">
          <p style={{ margin: 0 }}>
            {ideaLabel
              ? <>Tu peux sauvegarder l&apos;idée {ideaLabel} et reprendre plus tard depuis la bibliothèque, ou quitter sans sauvegarder.</>
              : <>Aucune idée n&apos;a encore été créée. Quitter le parcours ne perdra rien.</>}
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

/* ── Top stepper ──────────────────────────────────────────────────────── */

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
          const isDone    = index < currentStepIndex
          const isLocked  = index !== currentStepIndex
          const cls = `journey-wizard-step ${isCurrent ? 'is-current' : ''} ${isDone ? 'is-done' : ''} ${isLocked ? 'is-locked' : ''}`
          return (
            <li key={step.id} className={cls}>
              <button
                type="button"
                className="journey-wizard-step-btn"
                onClick={() => !isLocked && goToStep(step.id)}
                disabled={isLocked}
                aria-current={isCurrent ? 'step' : undefined}
                title={isDone ? 'Étape validée — pas de retour arrière' : undefined}
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

/* ── Side-card: TikTok account info ───────────────────────────────────── */

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

/* ── Side-card: live activity log ─────────────────────────────────────── */

function ActivitySideCard({ log, stateLabel, stateClass }: {
  log: LogEntry[]
  stateLabel: string
  stateClass: string
}) {
  return (
    <div className="journey-wizard-side-card">
      <div className="journey-wizard-side-card-head">
        <h3>Activite ({log.length})</h3>
        <span className={`journey-wizard-footer-state ${stateClass}`}>{stateLabel}</span>
      </div>
      {log.length === 0 ? (
        <span className="journey-account-row-detail">Les actions apparaitront ici en temps reel.</span>
      ) : (
        <ul className="journey-log-list journey-log-list-side">
          {log.map((entry, i) => (
            <li key={`${entry.ts}-${i}`} className="journey-log-item">
              <span className={`journey-log-item-icon is-${entry.status}`} aria-hidden="true" />
              <div className="journey-log-item-body">
                <span className="journey-log-item-msg">{entry.msg}</span>
                {entry.meta ? <span className="journey-log-item-meta">{entry.meta}</span> : null}
              </div>
              <span className="journey-log-item-time">{fmtTime(entry.ts)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/* ── Step bodies ──────────────────────────────────────────────────────── */

interface StepBodyProps extends TikTokStepScreenProps {
  activitySlot: JSX.Element
}

function CreationStep(p: StepBodyProps) {
  // Single-result mode: auto-select the first generated idea so validation can fire.
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
              {idea ? 'Régénérer' : 'Générer'}
            </button>
            <button
              type="button"
              className="journey-btn is-primary"
              onClick={() => void p.handleValidateCreation()}
              disabled={p.isBusy || !idea || !p.isJourneyReady}
            >
              Générer la vidéo →
            </button>
          </div>
        </div>

        {p.activitySlot}

        <AccountSideCard
          connectedTikTokAccount={p.connectedTikTokAccount}
          hasConnectedTikTokAccount={p.hasConnectedTikTokAccount}
          formatShortOpenId={p.formatShortOpenId}
          activeIdea={p.activeIdea}
          navigate={p.navigate}
        />
      </aside>

      <section className="journey-wizard-grid-main">
        <span className="journey-wizard-card-label">Résultat</span>
        {!p.isJourneyReady ? (
          <div className="journey-empty">
            <strong>Comptes incomplets</strong>
            <p>Connecte TikTok, Groq, Shotstack et Pexels dans Accounts avant de générer.</p>
            <button type="button" className="journey-btn is-ghost" onClick={() => p.navigate('/accounts')}>
              Ouvrir Accounts
            </button>
          </div>
        ) : p.isGeneratingIdeas || p.isGeneratingScript ? (
          <div className="journey-loading">
            <div className="journey-loading-spinner" />
            <div className="journey-loading-copy">
              <strong>Génération en cours</strong>
              <span>Idée + script en préparation…</span>
            </div>
          </div>
        ) : idea ? (
          <div className="journey-kv-grid">
            <KV label="Topic"   value={idea.topic} />
            <KV label="Script"  value={idea.script} />
            <KV label="Caption" value={idea.caption} />
            <KV label="Keyword" value={idea.keyword} />
          </div>
        ) : (
          <div className="journey-empty">
            <strong>Aucune idée générée</strong>
            <p>Choisis une catégorie à gauche puis clique sur Générer.</p>
          </div>
        )}
      </section>
    </div>
  )
}

function RenderStep(p: StepBodyProps) {
  const previewUrl = p.manualAction?.shotstackUrl
    || p.scriptedIdea?.shotstackUrl
    || p.selectedGeneratedIdea?.shotstackUrl

  return (
    <div className="journey-wizard-grid">
      <aside className="journey-wizard-grid-side">
        {p.scriptedIdea ? (
          <div className="journey-wizard-side-card">
            <span className="journey-wizard-card-label">Contenu</span>
            <div className="journey-kv-grid">
              <KV label="Topic"   value={p.scriptedIdea.topic} />
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

        {p.activitySlot}

        <AccountSideCard
          connectedTikTokAccount={p.connectedTikTokAccount}
          hasConnectedTikTokAccount={p.hasConnectedTikTokAccount}
          formatShortOpenId={p.formatShortOpenId}
          activeIdea={p.activeIdea}
          navigate={p.navigate}
        />
      </aside>

      <section className="journey-wizard-grid-main">
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
  const previewUrl = p.manualAction?.shotstackUrl
    || p.scriptedIdea?.shotstackUrl
    || p.selectedGeneratedIdea?.shotstackUrl

  return (
    <div className="journey-wizard-grid">
      <aside className="journey-wizard-grid-side">
        <div className="journey-wizard-side-card">
          <span className="journey-wizard-card-label">Actions</span>
          <div className="journey-step-cta journey-step-cta-stack">
            <button
              type="button"
              className="journey-btn"
              onClick={() => void p.handlePrepareUpload()}
              disabled={p.isBusy || Boolean(p.manualAction?.uploadUrl)}
            >
              {p.isPreparingUpload ? 'Preparation…' : 'Preparer upload'}
            </button>
            <button
              type="button"
              className="journey-btn"
              onClick={() => void p.handleUploadVideo()}
              disabled={p.isBusy || !p.manualAction?.uploadUrl || !p.isJourneyReady}
            >
              {p.isUploadingVideo ? 'Upload…' : 'Uploader'}
            </button>
            <button
              type="button"
              className="journey-btn is-primary"
              onClick={p.handleValidateUpload}
              disabled={p.isBusy || !p.uploadResult}
            >
              Valider l upload →
            </button>
          </div>
        </div>

        {p.activitySlot}

        <AccountSideCard
          connectedTikTokAccount={p.connectedTikTokAccount}
          hasConnectedTikTokAccount={p.hasConnectedTikTokAccount}
          formatShortOpenId={p.formatShortOpenId}
          activeIdea={p.activeIdea}
          navigate={p.navigate}
        />
      </aside>

      <section className="journey-wizard-grid-main">
        <span className="journey-wizard-card-label">Aperçu</span>
        {previewUrl ? <p.VideoPreview url={previewUrl} /> : (
          <div className="journey-empty">
            <strong>Aucune vidéo disponible</strong>
            <p>Reviens à l’étape Vidéo pour générer un rendu.</p>
          </div>
        )}
        <div className="journey-kv-grid">
          <KV label="Upload URL"      value={p.manualAction?.uploadUrl} mono />
          <KV label="Résultat upload" value={p.uploadResult ? 'Upload terminé.' : null} />
        </div>
      </section>
    </div>
  )
}

function PublishStep(p: StepBodyProps) {
  const previewUrl = p.manualAction?.shotstackUrl
    || p.scriptedIdea?.shotstackUrl
    || p.selectedGeneratedIdea?.shotstackUrl

  return (
    <div className="journey-wizard-grid">
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
              {p.isPublishingVideo ? 'Publication…' : 'Publier sur TikTok'}
            </button>
          </div>
        </div>

        {p.activitySlot}

        <AccountSideCard
          connectedTikTokAccount={p.connectedTikTokAccount}
          hasConnectedTikTokAccount={p.hasConnectedTikTokAccount}
          formatShortOpenId={p.formatShortOpenId}
          activeIdea={p.activeIdea}
          navigate={p.navigate}
        />
      </aside>

      <section className="journey-wizard-grid-main">
        <span className="journey-wizard-card-label">Publication finale</span>
        {previewUrl ? <p.VideoPreview url={previewUrl} /> : null}
        <div className="journey-kv-grid">
          <KV label="Video"  value={p.activeIdea?.topic} />
          <KV label="Status" value={p.successMessage || 'Pret pour publication finale.'} />
        </div>
      </section>
    </div>
  )
}

/* ── Component ────────────────────────────────────────────────────────── */

export default function TikTokStepScreen(props: TikTokStepScreenProps) {
  const log = useActivityLog(props)

  const stateLabel = props.isBusy
    ? 'Action en cours'
    : props.successMessage
    ? 'Pret a continuer'
    : 'En attente'

  const stateClass = props.isBusy
    ? 'is-busy'
    : props.successMessage
    ? 'is-ready'
    : ''

  const activitySlot = <ActivitySideCard log={log} stateLabel={stateLabel} stateClass={stateClass} />

  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const handleLeaveWithoutSaving = () => {
    setShowLeaveConfirm(false)
    props.goBackInFlow()
  }
  const handleSaveAndLeave = () => {
    setShowLeaveConfirm(false)
    // Backend already persists the ContentIdea row at every step (script,
    // render, upload). The "save" here just means: leave the row as-is and
    // come back later via the library. Equivalent to closing the wizard.
    props.goBackInFlow()
  }

  let body: JSX.Element
  if      (props.currentStep.id === 'creation')     body = <CreationStep {...props} activitySlot={activitySlot} />
  else if (props.currentStep.id === 'init-publish') body = <RenderStep   {...props} activitySlot={activitySlot} />
  else if (props.currentStep.id === 'upload')       body = <UploadStep   {...props} activitySlot={activitySlot} />
  else                                              body = <PublishStep  {...props} activitySlot={activitySlot} />

  return (
    <div className="journey-wizard">
      <ProgressStepper
        steps={props.steps}
        currentStepIndex={props.currentStepIndex}
        goToStep={props.goToStep}
        onLibraryClick={() => setShowLeaveConfirm(true)}
        BackArrow={props.BackArrow}
      />

      <main className="journey-wizard-main">
        {body}
      </main>

      {showLeaveConfirm ? (
        <LeaveConfirmModal
          activeIdea={props.activeIdea}
          onClose={() => setShowLeaveConfirm(false)}
          onLeaveWithoutSaving={handleLeaveWithoutSaving}
          onSaveAndLeave={handleSaveAndLeave}
        />
      ) : null}
    </div>
  )
}
