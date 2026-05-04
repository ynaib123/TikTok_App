/**
 * TikTokStepScreen — full rebuild (Proposal C).
 *
 * 3-column flow shell: Rail (steps + back) | Main (active step UI) | Console
 * (accounts state, idea preview, live activity log).
 *
 * All handler props are forwarded from `TikTokJourneyPage` unchanged. The
 * console column is purely presentational — it re-renders from the same
 * `manualAction`, `scriptedIdea`, `successMessage`, `errorMessage` props.
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
  handleRegenerateScript: () => Promise<void> | void
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

/* ── Console: live activity log ───────────────────────────────────────── */

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

/* ── Rail ─────────────────────────────────────────────────────────────── */

function Rail({ steps, currentStepIndex, goBackInFlow, BackArrow }: {
  steps: StepDescriptor[]
  currentStepIndex: number
  goBackInFlow: () => void
  BackArrow: IconComponent
}) {
  return (
    <aside className="journey-flow-rail" aria-label="Etapes du parcours">
      <div className="journey-flow-rail-head">
        <button type="button" className="journey-flow-rail-head-back" onClick={goBackInFlow}>
          <BackArrow /> Bibliotheque
        </button>
        <span className="journey-flow-rail-head-progress">
          {currentStepIndex + 1} / {steps.length}
        </span>
      </div>

      {steps.map((step, index) => {
        const isCurrent = index === currentStepIndex
        const isDone    = index < currentStepIndex
        const isLocked  = index > currentStepIndex
        return (
          <div
            key={step.id}
            className={`journey-flow-rail-step ${isCurrent ? 'is-current' : ''} ${isDone ? 'is-done' : ''} ${isLocked ? 'is-locked' : ''}`}
          >
            <div className="journey-flow-rail-step-num">{isDone ? '✓' : index + 1}</div>
            <div className="journey-flow-rail-step-body">
              <strong>{step.label}</strong>
              {step.sub ? <span>{step.sub}</span> : null}
            </div>
          </div>
        )
      })}
    </aside>
  )
}

/* ── Console (right column) ───────────────────────────────────────────── */

function Console({
  log,
  connectedTikTokAccount,
  hasConnectedTikTokAccount,
  formatShortOpenId,
  activeIdea,
}: {
  log: LogEntry[]
  connectedTikTokAccount: TikTokAccount | null
  hasConnectedTikTokAccount: boolean
  formatShortOpenId: (v: string | null | undefined) => string
  activeIdea: ContentIdea | null
}) {
  const account = hasConnectedTikTokAccount ? connectedTikTokAccount : null

  return (
    <aside className="journey-flow-console" aria-label="Etat live">
      <div className="journey-console-card">
        <div className="journey-console-card-head">
          <h3>Compte TikTok</h3>
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
            <span className="journey-account-row-detail">
              Scope: {account.scope || '-'}
            </span>
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

      <div className="journey-console-card">
        <div className="journey-console-card-head">
          <h3>Activite</h3>
          {log.length ? <span className="journey-flow-rail-head-progress">{log.length} evenements</span> : null}
        </div>
        {log.length === 0 ? (
          <div className="journey-account-row-detail" style={{ padding: '16px 0' }}>
            Les actions apparaitront ici en temps reel.
          </div>
        ) : (
          <ul className="journey-log-list">
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
    </aside>
  )
}

/* ── Step bodies ──────────────────────────────────────────────────────── */

function CreationStep(p: TikTokStepScreenProps) {
  return (
    <>
      {!p.isJourneyReady ? (
        <div className="journey-empty">
          <strong>Comptes incomplets</strong>
          <p>Connecte TikTok, n8n, Groq, Shotstack et Pexels dans Accounts avant de lancer un nouveau parcours.</p>
          <button type="button" className="journey-btn is-ghost" onClick={() => p.navigate('/accounts')}>
            Ouvrir Accounts
          </button>
        </div>
      ) : null}

      <section className="journey-flow-main-section">
        <span className="journey-flow-main-section-label">Parametres</span>
        <div className="journey-step-form">
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
        </div>
      </section>

      <section className="journey-flow-main-section">
        <span className="journey-flow-main-section-label">Idees generees</span>
        {p.isGeneratingIdeas ? (
          <div className="journey-loading">
            <div className="journey-loading-spinner" />
            <div className="journey-loading-copy">
              <strong>Generation en cours</strong>
              <span>Preparation de l idee et du script…</span>
            </div>
          </div>
        ) : p.displayedGeneratedIdeas.length === 0 ? (
          <div className="journey-empty">
            <strong>Aucune idee pour le moment</strong>
            <p>Choisis une categorie puis clique sur Generer.</p>
          </div>
        ) : (
          <div className="journey-idea-list">
            {p.displayedGeneratedIdeas.map((idea) => {
              const sel = p.selectedGeneratedIdea?.id === idea.id
              return (
                <button
                  key={idea.id}
                  type="button"
                  className={`journey-idea-item ${sel ? 'is-selected' : ''}`}
                  onClick={() => p.setSelectedGeneratedIdeaId(idea.id)}
                >
                  <span className="journey-idea-item-radio" aria-hidden="true" />
                  <div className="journey-idea-item-body">
                    <span className="journey-idea-item-topic">{idea.topic || `Idee #${idea.id}`}</span>
                    {idea.script ? <span className="journey-idea-item-script">{idea.script}</span> : null}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </section>

      {p.scriptedIdea ? (
        <section className="journey-flow-main-section">
          <span className="journey-flow-main-section-label">Script genere</span>
          <div className="journey-kv-grid">
            <KV label="Topic"   value={p.scriptedIdea.topic} />
            <KV label="Script"  value={p.scriptedIdea.script} />
            <KV label="Caption" value={p.scriptedIdea.caption} />
            <KV label="Keyword" value={p.scriptedIdea.keyword} />
          </div>
        </section>
      ) : null}

      <div className="journey-step-cta">
        <button
          type="button"
          className="journey-btn"
          onClick={() => void p.handleGenerateIdea()}
          disabled={p.isBusy || !p.isJourneyReady}
        >
          {p.displayedGeneratedIdeas.length ? 'Regenerer' : 'Generer'}
        </button>
        <button
          type="button"
          className="journey-btn is-primary"
          onClick={() => void p.handleValidateCreation()}
          disabled={p.isBusy || !p.selectedGeneratedIdea || !p.isJourneyReady}
        >
          Generer la video →
        </button>
      </div>
    </>
  )
}

function RenderStep(p: TikTokStepScreenProps) {
  const previewUrl = p.manualAction?.shotstackUrl
    || p.scriptedIdea?.shotstackUrl
    || p.selectedGeneratedIdea?.shotstackUrl

  return (
    <>
      <section className="journey-flow-main-section">
        <span className="journey-flow-main-section-label">Apercu</span>
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

      {p.scriptedIdea ? (
        <section className="journey-flow-main-section">
          <span className="journey-flow-main-section-label">Contenu</span>
          <div className="journey-kv-grid">
            <KV label="Topic"   value={p.scriptedIdea.topic} />
            <KV label="Script"  value={p.scriptedIdea.script} />
            <KV label="Caption" value={p.scriptedIdea.caption} />
            <KV label="Keyword" value={p.scriptedIdea.keyword} />
          </div>
        </section>
      ) : null}

      <div className="journey-step-cta">
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
    </>
  )
}

function UploadStep(p: TikTokStepScreenProps) {
  return (
    <>
      <section className="journey-flow-main-section">
        <span className="journey-flow-main-section-label">Compte cible</span>
        {p.hasConnectedTikTokAccount ? (
          <div className="journey-kv-grid">
            <KV label="Compte" value={p.connectedTikTokAccount?.nickname} />
            <KV label="Open ID" value={p.formatShortOpenId(p.activeIdea?.tiktokAccountOpenId || p.connectedTikTokAccount?.openId)} mono />
            <KV label="Scope"  value={p.connectedTikTokAccount?.scope} />
            <KV label="Status" value={p.connectedTikTokAccount?.status} />
          </div>
        ) : (
          <div className="journey-empty">
            <strong>Aucun compte connecte</strong>
            <p>Connecte un compte TikTok dans Accounts avant de lancer l upload.</p>
            <button type="button" className="journey-btn is-ghost" onClick={() => p.navigate('/accounts')}>
              Ouvrir Accounts
            </button>
          </div>
        )}
      </section>

      <section className="journey-flow-main-section">
        <span className="journey-flow-main-section-label">Upload</span>
        <div className="journey-kv-grid">
          <KV label="Upload URL"      value={p.manualAction?.uploadUrl} mono />
          <KV label="Resultat upload" value={p.uploadResult ? 'Upload termine.' : null} />
        </div>
      </section>

      <div className="journey-step-cta">
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
    </>
  )
}

function PublishStep(p: TikTokStepScreenProps) {
  return (
    <>
      <section className="journey-flow-main-section">
        <span className="journey-flow-main-section-label">Publication finale</span>
        <div className="journey-kv-grid">
          <KV label="Video"  value={p.activeIdea?.topic} />
          <KV label="Status" value={p.successMessage || 'Pret pour publication finale.'} />
        </div>
      </section>

      <div className="journey-step-cta">
        <button
          type="button"
          className="journey-btn is-primary"
          onClick={() => void p.handlePublishVideo()}
          disabled={p.isBusy}
        >
          {p.isPublishingVideo ? 'Publication…' : 'Publier sur TikTok'}
        </button>
      </div>
    </>
  )
}

/* ── Component ────────────────────────────────────────────────────────── */

export default function TikTokStepScreen(props: TikTokStepScreenProps) {
  const log = useActivityLog(props)

  let body: JSX.Element
  if      (props.currentStep.id === 'creation')     body = <CreationStep {...props} />
  else if (props.currentStep.id === 'init-publish') body = <RenderStep   {...props} />
  else if (props.currentStep.id === 'upload')       body = <UploadStep   {...props} />
  else                                              body = <PublishStep  {...props} />

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

  return (
    <div className="journey-flow-shell">
      <Rail
        steps={props.steps}
        currentStepIndex={props.currentStepIndex}
        goBackInFlow={props.goBackInFlow}
        BackArrow={props.BackArrow}
      />

      <main className="journey-flow-main">
        <header className="journey-flow-main-head">
          <div>
            <h2>{props.currentStep.label}</h2>
            {props.currentStep.sub ? <p>{props.currentStep.sub}</p> : null}
          </div>
          <span className={`journey-flow-main-head-state ${stateClass}`}>{stateLabel}</span>
        </header>

        {body}
      </main>

      <Console
        log={log}
        connectedTikTokAccount={props.connectedTikTokAccount}
        hasConnectedTikTokAccount={props.hasConnectedTikTokAccount}
        formatShortOpenId={props.formatShortOpenId}
        activeIdea={props.activeIdea}
      />
    </div>
  )
}
