import { useEffect, useRef, useState, type JSX } from 'react'
import type { NavigateFunction } from 'react-router-dom'
import type { ContentIdea, TikTokAccount } from '../../types'
import { useRenderProgress } from './useRenderProgress'
import { searchPexelsVideos, type PexelsVideo } from '../../services/videoOpsSupabase'

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
  handleGoToTemplateStep: () => Promise<void> | void
  handleValidateTemplate: () => void
  handleValidateMedia: () => void
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
  videoDurationSec: number
  setVideoDurationSec: (value: number) => void
  minVideoDurationSec: number
  maxVideoDurationSec: number
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
  // URLs Pexels choisies pour chaque scène. Index = index de la scène.
  selectedSceneMediaUrls: string[]
  setSelectedSceneMediaUrls: (urls: string[] | ((current: string[]) => string[])) => void
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

function getIdeaSceneTexts(idea: ContentIdea | null, fallbackScript: string): string[] {
  const planned = Array.isArray(idea?.plannedScenes)
    ? idea.plannedScenes.map((scene) => String(scene?.sceneText || '').trim()).filter(Boolean)
    : []
  return planned.length > 0 ? planned : splitScriptIntoScenes(fallbackScript)
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

interface DataEditableCardProps {
  idea: ContentIdea | null
  isBusy: boolean
  loading: boolean
  loadingTitle?: string
  loadingSub?: string
  emptyTitle: string
  emptySub: string
  generationSceneCount: number
  editedTopic: string
  setEditedTopic: (value: string) => void
  editedScript: string
  setEditedScript: (value: string) => void
  editedCaption: string
  setEditedCaption: (value: string) => void
  editedKeyword: string
  setEditedKeyword: (value: string) => void
  hint?: string
  label?: string
  readOnly?: boolean
}

/**
 * Bloc "Donnees (editable)" partage entre les etapes 1 / 2 / 3 du parcours
 * TikTok. Affiche topic / script (decoupe en scenes) / caption / keyword,
 * tous editables. Le decoupage en scenes est local et synchronise avec
 * `editedScript` au montage et a chaque changement externe.
 */
function DataEditableCard(p: DataEditableCardProps) {
  const ideaIdForScenes = p.idea?.id ?? null
  const [sceneArray, setSceneArray] = useState<string[]>(
    () => normalizeSceneCount(getIdeaSceneTexts(p.idea, p.editedScript), p.generationSceneCount),
  )
  useEffect(() => {
    const localJoined = joinScenes(sceneArray)
    if (p.editedScript !== localJoined) {
      const next = normalizeSceneCount(getIdeaSceneTexts(p.idea, p.editedScript), p.generationSceneCount)
      setSceneArray(next)
      if (p.editedScript && p.editedScript !== joinScenes(next)) {
        p.setEditedScript(joinScenes(next))
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ideaIdForScenes, p.editedScript, p.generationSceneCount, p.idea?.plannedScenes])

  const updateScene = (index: number, value: string) => {
    const next = [...sceneArray]
    next[index] = value
    setSceneArray(next)
    p.setEditedScript(joinScenes(next))
  }

  const displayValue = (value: string | null | undefined) => {
    const normalized = String(value || '').trim()
    return normalized || 'En attente'
  }

  const renderReadOnly = () => (
    <div className="journey-data-form is-readonly">
      <div className="journey-step-row journey-data-topic-row">
        <label>Topic</label>
        <div className="journey-readonly-field">{displayValue(p.editedTopic || p.idea?.topic)}</div>
      </div>
      <div className="journey-step-row journey-data-form-grow journey-data-script-row">
        <div className="journey-scenes-head">
          <label>Script ({p.generationSceneCount} scene{p.generationSceneCount === 1 ? '' : 's'})</label>
        </div>
        <div className="journey-scenes-list">
          {sceneArray.length === 0 ? (
            <div className="journey-empty journey-scenes-empty">
              <p>Aucune scene. Reviens a l etape 1 pour regenerer.</p>
            </div>
          ) : (
            sceneArray.map((scene, index) => (
              <div className="journey-scene-row is-readonly" key={index}>
                <div className="journey-scene-head">
                  <span className="journey-scene-label">Scene {index + 1}</span>
                </div>
                <div className="journey-readonly-field is-multiline">{displayValue(scene)}</div>
              </div>
            ))
          )}
        </div>
      </div>
      <div className="journey-step-row journey-data-caption-row">
        <label>Caption</label>
        <div className="journey-readonly-field is-multiline">{displayValue(p.editedCaption || p.idea?.caption)}</div>
      </div>
      <div className="journey-step-row journey-data-keyword-row">
        <label>Keyword</label>
        <div className="journey-readonly-field">{displayValue(p.editedKeyword || p.idea?.keyword)}</div>
      </div>
      {p.hint ? <span className="journey-step-row-hint">{p.hint}</span> : null}
    </div>
  )

  return (
    <div className="journey-wizard-side-card is-wide">
      <span className="journey-wizard-card-label">{p.label || (p.readOnly ? 'Donnees' : 'Donnees (editable)')}</span>
      {p.loading ? (
        <div className="journey-loading">
          <div className="journey-loading-spinner" />
          <div className="journey-loading-copy">
            <strong>{p.loadingTitle || 'Generation en cours'}</strong>
            <span>{p.loadingSub || 'Idee + script en preparation...'}</span>
          </div>
        </div>
      ) : p.idea && p.readOnly ? (
        renderReadOnly()
      ) : p.idea ? (
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
                  <p>Aucune scene. Reviens a l etape 1 pour regenerer.</p>
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
          {p.hint ? <span className="journey-step-row-hint">{p.hint}</span> : null}
        </div>
      ) : (
        <div className="journey-empty">
          <strong>{p.emptyTitle}</strong>
          <p>{p.emptySub}</p>
        </div>
      )}
    </div>
  )
}

function CreationStep(p: StepBodyProps) {
  const { displayedGeneratedIdeas, selectedGeneratedIdea, setSelectedGeneratedIdeaId } = p
  const [paramsTab, setParamsTab] = useState<'standard' | 'advanced'>('standard')
  useEffect(() => {
    if (displayedGeneratedIdeas.length > 0 && !selectedGeneratedIdea) {
      setSelectedGeneratedIdeaId(displayedGeneratedIdeas[0].id)
    }
  }, [displayedGeneratedIdeas, selectedGeneratedIdea, setSelectedGeneratedIdeaId])

  const idea = p.scriptedIdea || p.selectedGeneratedIdea
  return (
    <div className="journey-wizard-grid is-creation-stage">
      <aside className="journey-wizard-grid-side journey-creation-side">
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
              onClick={() => void p.handleGoToTemplateStep()}
              disabled={p.isBusy || !idea || !p.isJourneyReady}
            >
              Suivant &rarr;
            </button>
          </div>
        </div>

        <DataEditableCard
          idea={idea}
          isBusy={p.isBusy}
          loading={p.isGeneratingIdeas || p.isGeneratingScript}
          loadingTitle="Generation en cours"
          loadingSub="Idee + script en preparation..."
          emptyTitle="Aucune idee generee"
          emptySub="Choisis une categorie et lance la generation."
          generationSceneCount={p.generationSceneCount}
          editedTopic={p.editedTopic}
          setEditedTopic={p.setEditedTopic}
          editedScript={p.editedScript}
          setEditedScript={p.setEditedScript}
          editedCaption={p.editedCaption}
          setEditedCaption={p.setEditedCaption}
          editedKeyword={p.editedKeyword}
          setEditedKeyword={p.setEditedKeyword}
          hint="Modifie ce que tu veux. Les changements sont sauvegardes au clic sur Suivant."
        />
        </div>
      </aside>

    </div>
  )
}

function TemplateStyleStep(p: StepBodyProps) {
  const idea = p.scriptedIdea || p.selectedGeneratedIdea
  const selectedTemplate = p.templateOptions.find((option) => option.value === p.selectedTemplateId)
  const [textX, setTextX] = useState(50)
  const [textY, setTextY] = useState(48)
  const [textColor, setTextColor] = useState('#ffffff')
  const [fontFamily, setFontFamily] = useState('Inter')
  const previewTitle = String((p.editedTopic || idea?.topic || selectedTemplate?.label || 'Template').trim()).slice(0, 80)
  const previewCaption = String((p.editedCaption || idea?.caption || 'Caption TikTok').trim()).slice(0, 90)

  return (
    <div className="journey-wizard-grid is-template-stage">
      <aside className="journey-wizard-grid-side journey-template-side">
        <DataEditableCard
          idea={idea}
          isBusy={p.isBusy}
          loading={false}
          emptyTitle="Aucune donnee"
          emptySub="Reviens a l etape 1 pour generer une idee."
          generationSceneCount={p.generationSceneCount}
          editedTopic={p.editedTopic}
          setEditedTopic={p.setEditedTopic}
          editedScript={p.editedScript}
          setEditedScript={p.setEditedScript}
          editedCaption={p.editedCaption}
          setEditedCaption={p.setEditedCaption}
          editedKeyword={p.editedKeyword}
          setEditedKeyword={p.setEditedKeyword}
          readOnly
        />
        <div className="journey-step-cta journey-step-cta-stack">
          <button
            type="button"
            className="journey-btn is-primary"
            onClick={p.handleValidateTemplate}
            disabled={p.isBusy || !idea || !p.selectedTemplateId}
          >
            Suivant &rarr;
          </button>
        </div>
      </aside>

      <section className="journey-template-main">
        <div className="journey-template-head">
          <span className="journey-wizard-card-label">Previsualisation</span>
          <span className="journey-step-row-hint">{selectedTemplate?.label || 'Selectionne un template'}</span>
        </div>
        <div className={`journey-template-preview-phone is-${p.selectedTemplateId}`}>
          <div
            className="journey-template-preview-text"
            style={{
              left: `${textX}%`,
              top: `${textY}%`,
              color: textColor,
              fontFamily,
            }}
          >
            <strong>{previewTitle}</strong>
            <span>{previewCaption}</span>
          </div>
        </div>
        <div className="journey-template-controls">
          <div className="journey-step-row">
            <label htmlFor="template-text-y">Position verticale</label>
            <input id="template-text-y" type="range" min="14" max="82" value={textY} onChange={(e) => setTextY(Number(e.target.value))} />
          </div>
          <div className="journey-step-row">
            <label htmlFor="template-text-x">Position horizontale</label>
            <input id="template-text-x" type="range" min="18" max="82" value={textX} onChange={(e) => setTextX(Number(e.target.value))} />
          </div>
          <div className="journey-step-row-grid">
            <div className="journey-step-row">
              <label htmlFor="template-text-color">Couleur texte</label>
              <input id="template-text-color" className="journey-color-input" type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} />
            </div>
            <div className="journey-step-row">
              <label htmlFor="template-font">Police</label>
              <select id="template-font" className="journey-step-select" value={fontFamily} onChange={(e) => setFontFamily(e.target.value)}>
                <option value="Inter">Inter</option>
                <option value="Arial">Arial</option>
                <option value="Georgia">Georgia</option>
                <option value="Impact">Impact</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      <aside className="journey-template-summary">
        <span className="journey-wizard-card-label">Selection</span>
        <div className="journey-template-grid">
          {p.templateOptions.map((option, index) => {
            const isSelected = option.value === p.selectedTemplateId
            return (
              <button
                type="button"
                key={option.value}
                className={`journey-template-card ${isSelected ? 'is-selected' : ''}`}
                onClick={() => p.setSelectedTemplateId(option.value)}
                aria-pressed={isSelected}
              >
                <span className="journey-template-card-preview" aria-hidden="true">
                  <span className="journey-template-card-preview-bar" />
                  <span className="journey-template-card-preview-title">{String(index + 1).padStart(2, '0')}</span>
                  <span className="journey-template-card-preview-caption" />
                </span>
                <span className="journey-template-card-copy">
                  <strong>{option.label}</strong>
                  <span>{option.description}</span>
                </span>
              </button>
            )
          })}
        </div>
      </aside>
    </div>
  )
}
function TemplateStep(p: StepBodyProps) {
  const idea = p.scriptedIdea || p.selectedGeneratedIdea
  const sceneCount = Math.max(1, Math.min(10, p.generationSceneCount || 1))

  // Garde le tableau de sélection à la bonne taille (= sceneCount). Si on change
  // le nb de scènes après sélection, on tronque/étend en conservant les choix.
  useEffect(() => {
    p.setSelectedSceneMediaUrls((current) => {
      const next = current.slice(0, sceneCount)
      while (next.length < sceneCount) next.push('')
      return next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneCount])

  // Slot actif: scene en cours d'assignation. Cliquer une video l'assigne au
  // slot puis avance vers la scene suivante.
  const [activeSlot, setActiveSlot] = useState<number>(0)
  useEffect(() => {
    if (activeSlot >= sceneCount) setActiveSlot(Math.max(0, sceneCount - 1))
  }, [sceneCount, activeSlot])

  // Galerie de recherche Pexels. La query par défaut = keyword de l'idée.
  const defaultQuery = String(idea?.keyword || idea?.topic || p.editedKeyword || '').trim() || 'lifestyle'
  const [query, setQuery] = useState<string>(defaultQuery)
  useEffect(() => {
    // Si l'user n'a rien tapé manuellement et que le keyword change (ex
    // arrivée sur l'étape juste après génération), sync à la nouvelle query.
    setQuery(defaultQuery)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultQuery])

  const [videos, setVideos] = useState<PexelsVideo[]>([])
  const [isSearching, setIsSearching] = useState<boolean>(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  // Index de la vidéo affichée dans le carrousel de droite. Reset à 0 à chaque
  // nouvelle recherche pour éviter d'être hors-bornes.
  const [carouselIndex, setCarouselIndex] = useState<number>(0)

  const runSearch = async (q: string) => {
    const trimmed = q.trim()
    if (!trimmed) return
    setIsSearching(true)
    setSearchError(null)
    try {
      const res = await searchPexelsVideos(trimmed, 18, 'portrait')
      const list = res?.videos || []
      setVideos(list)
      setCarouselIndex(0)
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Recherche échouée')
      setVideos([])
    } finally {
      setIsSearching(false)
    }
  }

  // Auto-fetch initial à l'arrivée sur l'étape.
  useEffect(() => {
    void runSearch(defaultQuery)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const pickPortraitFile = (video: PexelsVideo): string | null => {
    const files = video.video_files || []
    const portrait = files.filter((f) => f.height > f.width)
    portrait.sort((a, b) => Math.abs(1080 - a.width) - Math.abs(1080 - b.width))
    return (portrait[0] || files[0])?.link || null
  }

  const assignSlot = (slotIndex: number, url: string) => {
    p.setSelectedSceneMediaUrls((current) => {
      const next = [...current]
      while (next.length < sceneCount) next.push('')
      next[slotIndex] = url
      return next
    })
    if (slotIndex < sceneCount - 1) {
      setActiveSlot(slotIndex + 1)
    }
  }

  const clearSlot = (slotIndex: number) => {
    p.setSelectedSceneMediaUrls((current) => {
      const next = [...current]
      while (next.length < sceneCount) next.push('')
      next[slotIndex] = ''
      return next
    })
    setActiveSlot(slotIndex)
  }

  const clearVideo = (url: string) => {
    p.setSelectedSceneMediaUrls((current) => current.map((value) => (value === url ? '' : value)))
  }

  const filledSlots = p.selectedSceneMediaUrls.filter((u) => Boolean(u && u.trim())).length
  const allFilled = filledSlots === sceneCount

  return (
    <div className="journey-wizard-grid is-media-stage">
      <aside className="journey-wizard-grid-side journey-media-side">
        <DataEditableCard
          idea={idea}
          isBusy={p.isBusy}
          loading={false}
          emptyTitle="Aucune donnee"
          emptySub="Reviens a l etape 1 pour generer une idee."
          generationSceneCount={p.generationSceneCount}
          editedTopic={p.editedTopic}
          setEditedTopic={p.setEditedTopic}
          editedScript={p.editedScript}
          setEditedScript={p.setEditedScript}
          editedCaption={p.editedCaption}
          setEditedCaption={p.setEditedCaption}
          editedKeyword={p.editedKeyword}
          setEditedKeyword={p.setEditedKeyword}
          readOnly
        />
        <div className="journey-step-cta journey-step-cta-stack">
          <button
            type="button"
            className="journey-btn is-primary"
            onClick={p.handleValidateMedia}
            disabled={p.isBusy || !idea || !allFilled}
          >
            Suivant &rarr;
          </button>
        </div>
      </aside>

      <section className="journey-media-middle">
        <div className="journey-media-gallery-head">
          <div className="journey-media-gallery-title">
            <span className="journey-wizard-card-label">Galerie Pexels</span>
            <span className="journey-media-gallery-status">
              Scene {activeSlot + 1} active - {filledSlots} / {sceneCount} choisie{filledSlots > 1 ? 's' : ''}
            </span>
          </div>
          <form
            className="journey-media-search"
            onSubmit={(e) => {
              e.preventDefault()
              void runSearch(query)
            }}
          >
            <input
              type="search"
              className="journey-step-select"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ex: cuisine, voyage, sport..."
              disabled={isSearching}
            />
            <button
              type="submit"
              className="journey-btn"
              disabled={isSearching || !query.trim()}
            >
              {isSearching ? 'Recherche...' : 'Rechercher'}
            </button>
          </form>
        </div>

        {searchError ? (
          <div className="journey-empty">
            <strong>Erreur Pexels</strong>
            <p>{searchError}</p>
          </div>
        ) : isSearching && videos.length === 0 ? (
          <div className="journey-loading">
            <div className="journey-loading-spinner" />
            <div className="journey-loading-copy">
              <strong>Recherche en cours</strong>
              <span>Pexels: « {query} »</span>
            </div>
          </div>
        ) : videos.length === 0 ? (
          <div className="journey-empty">
            <strong>Aucune vidéo</strong>
            <p>Essaie un autre mot-clé.</p>
          </div>
        ) : (
          <div className="journey-media-grid">
            {videos.map((video, vIdx) => {
              const url = pickPortraitFile(video)
              if (!url) return null
              const usedAtIndex = p.selectedSceneMediaUrls.findIndex((u) => u === url)
              const isUsed = usedAtIndex >= 0
              const isFocused = vIdx === carouselIndex
              return (
                <button
                  type="button"
                  key={video.id}
                  className={`journey-media-card ${isUsed ? 'is-used' : ''} ${isFocused ? 'is-focused' : ''}`}
                  onClick={() => {
                    setCarouselIndex(vIdx)
                    if (isUsed) {
                      setActiveSlot(usedAtIndex)
                    } else {
                      assignSlot(activeSlot, url)
                    }
                  }}
                  aria-label={`Assigner cette vidéo au slot ${activeSlot + 1}`}
                >
                  <video
                    src={url}
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    className="journey-media-card-video"
                    onMouseEnter={(e) => void (e.currentTarget as HTMLVideoElement).play()}
                    onMouseLeave={(e) => {
                      const v = e.currentTarget as HTMLVideoElement
                      v.pause()
                      v.currentTime = 0
                    }}
                  />
                  {isUsed ? (
                    <span className="journey-media-card-badge">Scene {usedAtIndex + 1}</span>
                  ) : null}
                  <div className="journey-media-card-actions">
                    {isUsed ? (
                      <span
                        role="button"
                        tabIndex={0}
                        className="journey-media-card-action is-danger"
                        onClick={(event) => {
                          event.stopPropagation()
                          clearVideo(url)
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            event.stopPropagation()
                            clearVideo(url)
                          }
                        }}
                      >
                        Deselectionner
                      </span>
                    ) : (
                      <span className="journey-media-card-action">Assigner scene {activeSlot + 1}</span>
                    )}
                  </div>
                  <div className="journey-media-card-meta">
                    <span>{video.width}×{video.height}</span>
                    <span>{Math.round(video.duration)}s</span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </section>

      <aside className="journey-media-preview">
        <span className="journey-wizard-card-label">Assignation scenes</span>
        <div className="journey-media-assignment-list">
          {Array.from({ length: sceneCount }).map((_, index) => {
            const selectedUrl = p.selectedSceneMediaUrls[index] || ''
            return (
              <button
                type="button"
                key={index}
                className={`journey-media-assignment ${index === activeSlot ? 'is-active' : ''} ${selectedUrl ? 'is-filled' : ''}`}
                onClick={() => setActiveSlot(index)}
              >
                <span className="journey-media-assignment-index">Scene {index + 1}</span>
                <span className="journey-media-assignment-thumb">
                  {selectedUrl ? <video src={selectedUrl} muted playsInline preload="metadata" /> : <span>Vide</span>}
                </span>
                <span className="journey-media-assignment-copy">
                  {selectedUrl ? 'Video assignee' : 'Clique puis choisis une video'}
                </span>
                {selectedUrl ? (
                  <span
                    role="button"
                    tabIndex={0}
                    className="journey-media-assignment-clear"
                    onClick={(event) => {
                      event.stopPropagation()
                      clearSlot(index)
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        event.stopPropagation()
                        clearSlot(index)
                      }
                    }}
                  >
                    Retirer
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
        <div className="journey-media-assignment-footer">
          <span>{filledSlots} / {sceneCount} scenes pretes</span>
          <span>Scene active: {activeSlot + 1}</span>
        </div>
      </aside>    </div>
  )
}

function formatEtaSeconds(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '<1s'
  const total = Math.round(seconds)
  if (total < 60) return `${total}s`
  const m = Math.floor(total / 60)
  const s = total % 60
  return s === 0 ? `${m}m` : `${m}m${s.toString().padStart(2, '0')}`
}

function RenderStep(p: StepBodyProps) {
  const [paramsTab, setParamsTab] = useState<'standard' | 'advanced'>('standard')
  const idea = p.scriptedIdea || p.selectedGeneratedIdea
  const previewUrl = p.manualAction?.shotstackUrl || idea?.shotstackUrl
  const renderEngine = idea?.renderEngine
  const selectedTemplate = p.templateOptions.find((option) => option.value === p.selectedTemplateId)
  const selectedScenes = p.selectedSceneMediaUrls.filter((url) => Boolean(url && url.trim()))
  const isRenderActive = p.isPreparingVideo && !previewUrl
  const renderProgress = useRenderProgress(p.currentRenderRunId, isRenderActive)
  const progressPct = Math.round(renderProgress.progress * 100)
  const statusLabel: Record<typeof renderProgress.status, string> = {
    preparing: 'Preparation des medias...',
    rendering: 'Rendu video en cours...',
    'post-processing': 'Post-traitement (audio, encodage)...',
    uploading: 'Upload vers le stockage...',
    done: 'Termine',
    error: 'Erreur',
    unknown: 'Initialisation...',
  }

  // ETA: extrapolation linéaire depuis le temps écoulé. On attend que la
  // progression dépasse 5% pour éviter une estimation instable au démarrage.
  const [nowMs, setNowMs] = useState(() => Date.now())
  useEffect(() => {
    if (!isRenderActive) return
    const interval = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [isRenderActive])
  let etaText: string | null = null
  if (isRenderActive && renderProgress.startedAt && renderProgress.progress > 0.05 && renderProgress.progress < 1) {
    const elapsedSec = Math.max(0, (nowMs - renderProgress.startedAt) / 1000)
    const remainingSec = elapsedSec * (1 - renderProgress.progress) / renderProgress.progress
    etaText = `~${formatEtaSeconds(remainingSec)} restant`
  } else if (isRenderActive) {
    etaText = 'Estimation...'
  }

  return (
    <div className="journey-wizard-grid is-video-stage is-render-stage">
      <aside className="journey-wizard-grid-side">
        <div className="journey-wizard-side-row">
        <div className="journey-wizard-side-card is-narrow">
          <span className="journey-wizard-card-label">Parametres video</span>

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
                <div className="journey-step-row">
                  <label htmlFor="journey-video-duration">Duree</label>
                  <input
                    id="journey-video-duration"
                    className="journey-step-select"
                    type="number"
                    min={p.minVideoDurationSec}
                    max={p.maxVideoDurationSec}
                    step={1}
                    value={p.videoDurationSec}
                    onChange={(event) => {
                      const next = Number(event.target.value)
                      if (Number.isFinite(next)) {
                        p.setVideoDurationSec(Math.min(p.maxVideoDurationSec, Math.max(p.minVideoDurationSec, next)))
                      }
                    }}
                    disabled={p.isBusy}
                  />
                </div>
              </div>

              <div className="journey-step-row">
                <label htmlFor="journey-render-scene-count">Nombre de scenes</label>
                <select
                  id="journey-render-scene-count"
                  className="journey-step-select"
                  value={String(p.generationSceneCount)}
                  onChange={(event) => p.setGenerationSceneCount(Number(event.target.value))}
                  disabled={p.isBusy}
                >
                  {p.sceneCountOptions.map((option) => (
                    <option key={option.value} value={String(option.value)}>{option.label}</option>
                  ))}
                </select>
                <span className="journey-step-row-hint">
                  {p.generationSceneCount} sequence{p.generationSceneCount === 1 ? '' : 's'} video Pexels, environ {(p.videoDurationSec / Math.max(1, p.generationSceneCount)).toFixed(1)}s par sequence.
                </span>
              </div>
            </div>
          ) : (
            <div className="journey-tab-panel" role="tabpanel">
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
                {(() => {
                  const tpl = p.templateOptions.find((opt) => opt.value === p.selectedTemplateId)
                  return tpl?.description ? (
                    <span className="journey-step-row-hint">{tpl.description}</span>
                  ) : null
                })()}
              </div>

              {renderEngine ? (
                <div className="journey-step-row">
                  <label>Moteur</label>
                  <div className="journey-kv-grid">
                    <KV label="Engine" value={renderEngine.toUpperCase()} mono />
                  </div>
                </div>
              ) : null}
            </div>
          )}

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

        <DataEditableCard
          idea={idea}
          isBusy={p.isBusy}
          loading={false}
          emptyTitle="Aucune donnee"
          emptySub="Reviens a l etape 1 pour generer une idee."
          generationSceneCount={p.generationSceneCount}
          editedTopic={p.editedTopic}
          setEditedTopic={p.setEditedTopic}
          editedScript={p.editedScript}
          setEditedScript={p.setEditedScript}
          editedCaption={p.editedCaption}
          setEditedCaption={p.setEditedCaption}
          editedKeyword={p.editedKeyword}
          setEditedKeyword={p.setEditedKeyword}
          readOnly
        />
        </div>
      </aside>

      <section className="journey-render-recap-panel">
        <span className="journey-wizard-card-label">Recapitulatif parcours</span>
        <div className="journey-render-recap">
          <div className="journey-render-recap-hero">
            <strong>{p.editedTopic || idea?.topic || 'Topic en attente'}</strong>
            <span>{p.editedKeyword || idea?.keyword || 'Keyword en attente'}</span>
          </div>
          <div className="journey-render-recap-grid">
            <KV label="Template" value={selectedTemplate?.label || p.selectedTemplateId} />
            <KV label="Qualite" value={p.selectedQualityProfile.toUpperCase()} mono />
            <KV label="Duree" value={`${p.videoDurationSec}s`} mono />
            <KV label="Scenes" value={`${selectedScenes.length}/${p.generationSceneCount}`} mono />
          </div>
          <div className="journey-render-recap-scenes">
            {Array.from({ length: p.generationSceneCount }).map((_, index) => (
              <div className={`journey-render-recap-scene ${p.selectedSceneMediaUrls[index] ? 'is-ready' : ''}`} key={index}>
                <span>{index + 1}</span>
                <strong>{p.selectedSceneMediaUrls[index] ? 'Media choisi' : 'Media manquant'}</strong>
              </div>
            ))}
          </div>
          <div className="journey-render-recap-caption">
            <span>Caption</span>
            <p>{p.editedCaption || idea?.caption || 'Caption en attente'}</p>
          </div>
        </div>
      </section>

      <section className="journey-wizard-grid-main is-video-stage">
        <span className="journey-wizard-card-label">Apercu video</span>
        {isRenderActive ? (
          <div className="journey-render-stage">
            <div className="journey-render-stage-frame" />
            <div className="journey-render-progress is-overlay">
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
              <div className="journey-render-progress-foot">
                {renderProgress.status === 'error' && renderProgress.error ? (
                  <span className="journey-render-progress-error">{renderProgress.error}</span>
                ) : <span />}
                {etaText ? <span className="journey-render-progress-eta">{etaText}</span> : null}
              </div>
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

          <DataEditableCard
            idea={idea}
            isBusy={p.isBusy}
            loading={false}
            emptyTitle="Aucune donnee"
            emptySub="Reviens a l etape 1."
            generationSceneCount={p.generationSceneCount}
            editedTopic={p.editedTopic}
            setEditedTopic={p.setEditedTopic}
            editedScript={p.editedScript}
            setEditedScript={p.setEditedScript}
            editedCaption={p.editedCaption}
            setEditedCaption={p.setEditedCaption}
            editedKeyword={p.editedKeyword}
            setEditedKeyword={p.setEditedKeyword}
            readOnly
          />
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
  else if (props.currentStep.id === 'template-style') body = <TemplateStyleStep {...props} />
  else if (props.currentStep.id === 'template') body = <TemplateStep {...props} />
  else if (props.currentStep.id === 'init-publish') body = <RenderStep {...props} />
  else if (props.currentStep.id === 'upload') body = <UploadStep {...props} />
  else body = <PublishStep {...props} />

  // Direction de la transition: forward = scroll de droite à gauche (étape +1),
  // backward = retour arrière. Le ref garde l'index précédent pour détecter le
  // sens AVANT que le body ne soit remplacé. L'effect synchronise l'index
  // après que le DOM ait pris en compte le changement.
  const prevIndexRef = useRef(props.currentStepIndex)
  const direction: 'forward' | 'backward' = props.currentStepIndex >= prevIndexRef.current ? 'forward' : 'backward'
  useEffect(() => {
    prevIndexRef.current = props.currentStepIndex
  }, [props.currentStepIndex])

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
        <div
          key={props.currentStep.id}
          className={`journey-step-anim is-${direction}`}
        >
          {body}
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
  )
}





