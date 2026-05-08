import { useEffect, useState, type JSX } from 'react'
import type { NavigateFunction } from 'react-router-dom'
import type { ContentIdea, TikTokAccount } from '../../types'
import { useRenderProgress } from './useRenderProgress'

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

interface JourneyOptionDescriptor {
  value: string
  label: string
  description: string
}

interface JourneyNumericOptionDescriptor {
  value: number
  label: string
  description: string
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
  handleGoToRenderStep: () => void
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
  selectedTemplateId: string
  setSelectedTemplateId: (value: string) => void
  selectedQualityProfile: string
  setSelectedQualityProfile: (value: string) => void
  templateOptions: JourneyOptionDescriptor[]
  qualityOptions: JourneyOptionDescriptor[]
  successMessage: string | null
  tiktokCategoryOptions: string[]
  uploadResult: unknown
  currentRenderRunId: number | null
  // Édition inline du contenu (topic/script/caption/keyword) avant rendu.
  editedTopic: string
  setEditedTopic: (value: string) => void
  editedScript: string
  setEditedScript: (value: string) => void
  editedCaption: string
  setEditedCaption: (value: string) => void
  editedKeyword: string
  setEditedKeyword: (value: string) => void
  // Paramètres de génération idée + script (étape 1).
  generationTopic: string
  setGenerationTopic: (value: string) => void
  generationDurationTarget: string
  setGenerationDurationTarget: (value: string) => void
  generationLanguage: string
  setGenerationLanguage: (value: string) => void
  generationInspirationRef: string
  setGenerationInspirationRef: (value: string) => void
  generationSceneCount: number
  setGenerationSceneCount: (value: number) => void
  durationTargetOptions: JourneyOptionDescriptor[]
  languageOptions: JourneyOptionDescriptor[]
  sceneCountOptions: JourneyNumericOptionDescriptor[]
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

function splitScriptIntoScenes(script: string): string[] {
  return String(script || '')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

function normalizeSceneCount(scenes: string[], count: number): string[] {
  const targetCount = Math.min(10, Math.max(1, Number(count) || 1))
  const normalized = scenes.map((scene) => scene.trim()).filter((scene) => scene.length > 0)
  if (normalized.length > targetCount) {
    return [
      ...normalized.slice(0, targetCount - 1),
      normalized.slice(targetCount - 1).join(' '),
    ]
  }
  while (normalized.length < targetCount) normalized.push('')
  return normalized
}

function joinScenes(scenes: string[]): string {
  return scenes
    .map((s) => {
      const t = s.trim()
      if (!t) return ''
      return /[.!?]$/.test(t) ? t : t + '.'
    })
    .filter(Boolean)
    .join(' ')
}

function CreationStep(p: StepBodyProps) {
  const { displayedGeneratedIdeas, selectedGeneratedIdea, setSelectedGeneratedIdeaId } = p
  const [paramsTab, setParamsTab] = useState<'standard' | 'advanced'>('standard')
  // Local scene array — re-initialised from editedScript when:
  //   - l idee change (nouvelle generation)
  //   - editedScript a change depuis l exterieur (script genere par le LLM
  //     arrive apres la premiere sync). On detecte ca en comparant editedScript
  //     avec ce que produirait notre tableau actuel: si different, c est une
  //     mise a jour externe → resync. Sinon c est un edit utilisateur, on
  //     conserve le tableau.
  const ideaIdForScenes = (p.scriptedIdea || p.selectedGeneratedIdea)?.id ?? null
  const [sceneArray, setSceneArray] = useState<string[]>(() => normalizeSceneCount(splitScriptIntoScenes(p.editedScript), p.generationSceneCount))
  useEffect(() => {
    const localJoined = joinScenes(sceneArray)
    if (p.editedScript !== localJoined) {
      const next = normalizeSceneCount(splitScriptIntoScenes(p.editedScript), p.generationSceneCount)
      setSceneArray(next)
      if (p.editedScript && p.editedScript !== joinScenes(next)) {
        p.setEditedScript(joinScenes(next))
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ideaIdForScenes, p.editedScript, p.generationSceneCount])

  const updateScene = (index: number, value: string) => {
    const next = [...sceneArray]
    next[index] = value
    setSceneArray(next)
    p.setEditedScript(joinScenes(next))
  }
  useEffect(() => {
    if (displayedGeneratedIdeas.length > 0 && !selectedGeneratedIdea) {
      setSelectedGeneratedIdeaId(displayedGeneratedIdeas[0].id)
    }
  }, [displayedGeneratedIdeas, selectedGeneratedIdea, setSelectedGeneratedIdeaId])

  const idea = p.scriptedIdea || p.selectedGeneratedIdea
  const previewUrl = p.manualAction?.shotstackUrl || idea?.shotstackUrl

  return (
    <div className="journey-wizard-grid is-video-stage">
      <aside className="journey-wizard-grid-side">
        <div className="journey-wizard-side-row">
        <div className="journey-wizard-side-card is-narrow">
          <span className="journey-wizard-card-label">Parametres idee + script</span>

          <div className="journey-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={paramsTab === 'standard'}
              className={`journey-tab ${paramsTab === 'standard' ? 'is-active' : ''}`}
              onClick={() => setParamsTab('standard')}
            >
              Standard
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={paramsTab === 'advanced'}
              className={`journey-tab ${paramsTab === 'advanced' ? 'is-active' : ''}`}
              onClick={() => setParamsTab('advanced')}
            >
              Avance
            </button>
          </div>

          {paramsTab === 'standard' ? (
            <div className="journey-tab-panel" role="tabpanel">
              <div className="journey-step-row-grid">
                <div className="journey-step-row">
                  <label htmlFor="journey-category">Categorie</label>
                  <select
                    id="journey-category"
                    className="journey-step-select"
                    value={p.generationCategory}
                    onChange={(event) => p.setGenerationCategory(event.target.value)}
                    disabled={p.isBusy || !p.isJourneyReady}
                  >
                    {p.tiktokCategoryOptions.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div className="journey-step-row">
                  <label htmlFor="journey-language">Langue</label>
                  <select
                    id="journey-language"
                    className="journey-step-select"
                    value={p.generationLanguage}
                    onChange={(event) => p.setGenerationLanguage(event.target.value)}
                    disabled={p.isBusy || !p.isJourneyReady}
                  >
                    {p.languageOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="journey-step-row">
                <label htmlFor="journey-topic-input">Topic libre <span style={{ opacity: 0.6, textTransform: 'none', letterSpacing: 0 }}>(optionnel)</span></label>
                <input
                  id="journey-topic-input"
                  type="text"
                  className="journey-step-select"
                  value={p.generationTopic}
                  onChange={(event) => p.setGenerationTopic(event.target.value)}
                  disabled={p.isBusy || !p.isJourneyReady}
                  placeholder="ex: 3 erreurs de debutant en gym"
                  maxLength={240}
                />
              </div>

              <div className="journey-step-row">
                <label htmlFor="journey-inspiration">Reference d inspiration</label>
                <textarea
                  id="journey-inspiration"
                  className="journey-step-select"
                  value={p.generationInspirationRef}
                  onChange={(event) => p.setGenerationInspirationRef(event.target.value)}
                  disabled={p.isBusy || !p.isJourneyReady}
                  placeholder="Colle un hook, lien TikTok ou phrase qui marche bien..."
                  rows={3}
                  maxLength={1000}
                />
                <span className="journey-step-row-hint">L IA s en inspirera pour le style sans copier.</span>
              </div>

              <div className="journey-step-row">
                <label htmlFor="journey-scene-count">Nombre de scenes</label>
                <select
                  id="journey-scene-count"
                  className="journey-step-select"
                  value={String(p.generationSceneCount)}
                  onChange={(event) => p.setGenerationSceneCount(Number(event.target.value))}
                  disabled={p.isBusy || !p.isJourneyReady}
                >
                  {p.sceneCountOptions.map((option) => (
                    <option key={option.value} value={String(option.value)}>{option.label}</option>
                  ))}
                </select>
                <span className="journey-step-row-hint">
                  {p.sceneCountOptions.find((option) => option.value === p.generationSceneCount)?.description}
                  {' '}Le script aura ce nombre de phrases, la video durera {Math.min(30, Math.max(8, p.generationSceneCount * 3))}s, {p.generationSceneCount} clips Pexels seront cherches.
                </span>
              </div>
            </div>
          ) : (
            <div className="journey-tab-panel" role="tabpanel" />
          )}

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
              onClick={() => p.handleGoToRenderStep()}
              disabled={p.isBusy || !idea || !p.isJourneyReady}
            >
              Suivant →
            </button>
          </div>
        </div>

        <div className="journey-wizard-side-card is-wide">
          <span className="journey-wizard-card-label">Donnees (editable)</span>
          {p.isGeneratingIdeas || p.isGeneratingScript ? (
            <div className="journey-loading">
              <div className="journey-loading-spinner" />
              <div className="journey-loading-copy">
                <strong>Generation en cours</strong>
                <span>Idee + script en preparation...</span>
              </div>
            </div>
          ) : idea ? (
            <div className="journey-data-form">
              <div className="journey-step-row">
                <label htmlFor="journey-edit-topic">Topic</label>
                <input
                  id="journey-edit-topic"
                  type="text"
                  className="journey-step-select"
                  value={p.editedTopic}
                  onChange={(event) => p.setEditedTopic(event.target.value)}
                  disabled={p.isBusy}
                  maxLength={500}
                />
              </div>
              <div className="journey-step-row journey-data-form-grow">
                <div className="journey-scenes-head">
                  <label>Script ({p.generationSceneCount} scene{p.generationSceneCount === 1 ? '' : 's'})</label>
                </div>
                <div className="journey-scenes-list">
                  {sceneArray.length === 0 ? (
                    <div className="journey-empty journey-scenes-empty">
                      <p>Aucune scene. Clique sur Ajouter ou regenere une idee.</p>
                    </div>
                  ) : (
                    sceneArray.map((scene, index) => (
                      <div className="journey-scene-row" key={index}>
                        <div className="journey-scene-head">
                          <span className="journey-scene-label">Scene {index + 1}</span>
                        </div>
                        <textarea
                          className="journey-step-select journey-scene-textarea"
                          value={scene}
                          onChange={(event) => updateScene(index, event.target.value)}
                          disabled={p.isBusy}
                          rows={2}
                          maxLength={500}
                          placeholder="Phrase courte qui devient une scene..."
                        />
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="journey-step-row">
                <label htmlFor="journey-edit-caption">Caption</label>
                <textarea
                  id="journey-edit-caption"
                  className="journey-step-select"
                  value={p.editedCaption}
                  onChange={(event) => p.setEditedCaption(event.target.value)}
                  disabled={p.isBusy}
                  rows={2}
                  maxLength={2200}
                />
              </div>
              <div className="journey-step-row">
                <label htmlFor="journey-edit-keyword">Keyword</label>
                <input
                  id="journey-edit-keyword"
                  type="text"
                  className="journey-step-select"
                  value={p.editedKeyword}
                  onChange={(event) => p.setEditedKeyword(event.target.value)}
                  disabled={p.isBusy}
                  maxLength={240}
                />
              </div>
              <span className="journey-step-row-hint">Modifie ce que tu veux. Les changements sont sauvegardes au clic sur Suivant.</span>
            </div>
          ) : (
            <div className="journey-empty">
              <strong>Aucune idee generee</strong>
              <p>Choisis une categorie et lance la generation.</p>
            </div>
          )}
        </div>
        </div>
      </aside>

      <section className="journey-wizard-grid-main is-video-stage">
        <span className="journey-wizard-card-label">Apercu video</span>
        {!p.isJourneyReady ? (
          <div className="journey-empty">
            <strong>Comptes incomplets</strong>
            <p>Connecte TikTok, Groq et Pexels dans Accounts avant de generer.</p>
            <button type="button" className="journey-btn is-ghost" onClick={() => p.navigate('/accounts')}>
              Ouvrir Accounts
            </button>
          </div>
        ) : previewUrl ? (
          <p.VideoPreview url={previewUrl} />
        ) : (
          <div className="journey-empty">
            <strong>Aperçu indisponible</strong>
            <p>La video apparaitra a l etape suivante apres le rendu.</p>
          </div>
        )}
      </section>
    </div>
  )
}

function RenderStep(p: StepBodyProps) {
  const idea = p.scriptedIdea || p.selectedGeneratedIdea
  const previewUrl = p.manualAction?.shotstackUrl || idea?.shotstackUrl
  const renderEngine = idea?.renderEngine
  const isRenderActive = p.isPreparingVideo && !previewUrl
  const renderProgress = useRenderProgress(p.currentRenderRunId, isRenderActive)
  const progressPct = Math.round(renderProgress.progress * 100)
  const statusLabel: Record<typeof renderProgress.status, string> = {
    rendering: 'Rendu video en cours...',
    'post-processing': 'Post-traitement (audio, encodage)...',
    uploading: 'Upload vers le stockage...',
    done: 'Termine',
    error: 'Erreur',
    unknown: 'Initialisation...',
  }

  return (
    <div className="journey-wizard-grid is-video-stage">
      <aside className="journey-wizard-grid-side">
        <div className="journey-wizard-side-row">
        <div className="journey-wizard-side-card is-narrow">
          <span className="journey-wizard-card-label">Parametres video</span>

          <div className="journey-step-row-grid">
            <div className="journey-step-row">
              <label htmlFor="journey-template-select">Template</label>
              <select
                id="journey-template-select"
                className="journey-step-select"
                value={p.selectedTemplateId}
                onChange={(event) => p.setSelectedTemplateId(event.target.value)}
                disabled={p.isBusy}
              >
                {p.templateOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="journey-step-row">
              <label htmlFor="journey-quality-select">Qualite</label>
              <select
                id="journey-quality-select"
                className="journey-step-select"
                value={p.selectedQualityProfile}
                onChange={(event) => p.setSelectedQualityProfile(event.target.value)}
                disabled={p.isBusy}
              >
                {p.qualityOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>
          <span className="journey-step-row-hint">
            {p.templateOptions.find((option) => option.value === p.selectedTemplateId)?.description}
          </span>

          {renderEngine ? (
            <div className="journey-kv-grid">
              <KV label="Moteur" value={renderEngine.toUpperCase()} />
            </div>
          ) : null}

          <div className="journey-step-cta journey-step-cta-stack">
            {previewUrl ? (
              <>
                <button type="button" className="journey-btn" onClick={() => void p.handleRetryInitPublish()} disabled={p.isBusy}>
                  Regenerer la video
                </button>
                <button
                  type="button"
                  className="journey-btn is-primary"
                  onClick={p.handleValidateInitPublish}
                  disabled={p.isBusy}
                >
                  Valider la video →
                </button>
              </>
            ) : (
              <button
                type="button"
                className="journey-btn is-primary"
                onClick={() => void p.handleRetryInitPublish()}
                disabled={p.isBusy || !idea}
              >
                {p.isPreparingVideo ? 'Generation...' : 'Generer la video'}
              </button>
            )}
          </div>
        </div>

        <div className="journey-wizard-side-card is-wide">
          <span className="journey-wizard-card-label">Donnees</span>
          {idea ? (
            <div className="journey-kv-grid">
              <KV label="Topic" value={idea.topic} />
              <KV label="Script" value={idea.script} />
              <KV label="Caption" value={idea.caption} />
              <KV label="Keyword" value={idea.keyword} />
            </div>
          ) : (
            <div className="journey-empty">
              <strong>Aucune donnee</strong>
              <p>Reviens a l etape 1 pour generer une idee.</p>
            </div>
          )}
        </div>
        </div>
      </aside>

      <section className="journey-wizard-grid-main is-video-stage">
        <span className="journey-wizard-card-label">Apercu video</span>
        {isRenderActive ? (
          <div className="journey-render-progress">
            <div className="journey-render-progress-copy">
              <strong>{statusLabel[renderProgress.status]}</strong>
              <span>{progressPct}%</span>
            </div>
            <div className="journey-render-progress-track">
              <div
                className="journey-render-progress-fill"
                style={{ width: `${Math.max(2, progressPct)}%` }}
              />
            </div>
            {renderProgress.status === 'error' && renderProgress.error ? (
              <span className="journey-render-progress-error">{renderProgress.error}</span>
            ) : null}
          </div>
        ) : (
          <p.VideoPreview url={previewUrl} />
        )}
      </section>
    </div>
  )
}

function UploadStep(p: StepBodyProps) {
  const idea = p.scriptedIdea || p.selectedGeneratedIdea
  const previewUrl = p.manualAction?.shotstackUrl || idea?.shotstackUrl

  return (
    <div className="journey-wizard-grid is-video-stage">
      <aside className="journey-wizard-grid-side">
        <div className="journey-wizard-side-row">
          <div className="journey-wizard-side-card is-narrow">
            <span className="journey-wizard-card-label">Parametres publication</span>
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

          <div className="journey-wizard-side-card is-wide">
            <span className="journey-wizard-card-label">Donnees</span>
            {idea ? (
              <div className="journey-kv-grid">
                <KV label="Topic" value={idea.topic} />
                <KV label="Script" value={idea.script} />
                <KV label="Caption" value={idea.caption} />
                <KV label="Keyword" value={idea.keyword} />
              </div>
            ) : (
              <div className="journey-empty">
                <strong>Aucune donnee</strong>
                <p>Reviens a l etape 1.</p>
              </div>
            )}
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
        <span className="journey-wizard-card-label">Apercu video</span>
        {previewUrl ? <p.VideoPreview url={previewUrl} /> : (
          <div className="journey-empty">
            <strong>Aucune video disponible</strong>
            <p>Reviens a l etape video pour generer un rendu.</p>
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
