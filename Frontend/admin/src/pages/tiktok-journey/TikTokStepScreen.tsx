import type { JSX } from 'react'
import type { ContentIdea, TikTokAccount } from '../../types'

type IconComponent = () => JSX.Element

interface StepDescriptor {
  id: string
  label: string
}

interface TikTokStepScreenProps {
  ChevronDownIcon: IconComponent
  VideoPreview: ({ url }: { url: string | null | undefined }) => JSX.Element | null
  activeIdea: ContentIdea | null
  connectedTikTokAccount: TikTokAccount | null
  currentStep: StepDescriptor
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
  handleValidateScript: () => Promise<void> | void
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
  manualAction: { shotstackUrl?: string | null; uploadUrl?: string | null } | null
  maxIdeaBatchSize: number
  navigate: (path: string) => void
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

export default function TikTokStepScreen(props: TikTokStepScreenProps) {
  const {
    ChevronDownIcon,
    VideoPreview,
    activeIdea,
    connectedTikTokAccount,
    currentStep,
    displayedGeneratedIdeas,
    formatShortOpenId,
    generationCategory,
    generationCount,
    handleGenerateIdea,
    handlePrepareUpload,
    handlePublishVideo,
    handleRegenerateScript,
    handleRetryInitPublish,
    handleUploadVideo,
    handleValidateCreation,
    handleValidateInitPublish,
    handleValidateScript,
    handleValidateUpload,
    hasConnectedTikTokAccount,
    isBusy,
    isGeneratingIdeas,
    isGeneratingScript,
    isJourneyReady,
    isPreparingUpload,
    isPreparingVideo,
    isPublishingVideo,
    isUploadingVideo,
    manualAction,
    maxIdeaBatchSize,
    navigate,
    openListMenu,
    scriptedIdea,
    selectedGeneratedIdea,
    setGenerationCategory,
    setGenerationCount,
    setOpenListMenu,
    setSelectedGeneratedIdeaId,
    successMessage,
    tiktokCategoryOptions,
    uploadResult,
  } = props

  if (currentStep.id === 'creation') {
    return {
      actions: (
        <div className="tiktok-step-actions">
          {!isJourneyReady ? (
            <div className="tiktok-step-intro">
              <strong>Accounts requis</strong>
              <p>Le parcours est verrouille tant que tous les comptes necessaires ne sont pas connectes dans Accounts.</p>
            </div>
          ) : null}
          <div className="tiktok-step-form">
            {hasConnectedTikTokAccount ? (
              <div className="video-preview-block">
                <span>Compte TikTok cible</span>
                <p>{connectedTikTokAccount?.nickname || '-'}</p>
                <p>Open ID: {formatShortOpenId(selectedGeneratedIdea?.tiktokAccountOpenId || connectedTikTokAccount?.openId)}</p>
                <p>Scope: {connectedTikTokAccount?.scope || '-'}</p>
              </div>
            ) : null}
            <label className="tiktok-step-field">
              <span>Categorie</span>
              <div className="tiktok-step-toolbar-select">
                <button
                  type="button"
                  className={`admin-product-toolbar-trigger tiktok-step-toolbar-trigger ${openListMenu === 'tiktok-category' ? 'is-open' : ''}`}
                  onClick={() => setOpenListMenu((currentMenu) => (currentMenu === 'tiktok-category' ? null : 'tiktok-category'))}
                  aria-haspopup="listbox"
                  aria-expanded={openListMenu === 'tiktok-category'}
                  aria-controls={openListMenu === 'tiktok-category' ? 'tiktok-category-menu' : undefined}
                  disabled={isBusy || !isJourneyReady}
                >
                  <strong>{generationCategory}</strong>
                  <span className="admin-toolbar-icon" aria-hidden="true"><ChevronDownIcon /></span>
                </button>

                {openListMenu === 'tiktok-category' ? (
                  <div
                    id="tiktok-category-menu"
                    className="admin-product-toolbar-menu tiktok-step-toolbar-menu"
                    role="listbox"
                    aria-label="Choix de categorie TikTok"
                  >
                    <div className="admin-product-toolbar-menu-options-scroll admin-product-toolbar-menu-options-scroll-five">
                      {tiktokCategoryOptions.map((category) => (
                        <button
                          key={category}
                          type="button"
                          className={`admin-product-toolbar-option ${generationCategory === category ? 'is-selected' : ''}`}
                          onClick={() => {
                            setGenerationCategory(category)
                            setOpenListMenu(null)
                          }}
                        >
                          <span>{category}</span>
                          {generationCategory === category ? <strong>.</strong> : null}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </label>
            <label className="tiktok-step-field">
              <span>Count</span>
              <input
                type="number"
                min="1"
                max={maxIdeaBatchSize}
                step="1"
                value={generationCount}
                onChange={(event) => {
                  const rawValue = String(event.target.value || '').replace(/\D/g, '').slice(0, 1)
                  if (!rawValue) {
                    setGenerationCount('')
                    return
                  }

                  const nextValue = Math.max(1, Math.min(maxIdeaBatchSize, Number(rawValue)))
                  setGenerationCount(String(nextValue))
                }}
                disabled={isBusy || !isJourneyReady}
              />
            </label>
          </div>
          {isGeneratingIdeas ? (
            <div
              className="tiktok-generate-loading"
              role="progressbar"
              aria-label="Generation des idees en cours"
              aria-valuetext="Generation des idees en cours"
            >
              <span className="tiktok-generate-loading-bar" aria-hidden="true" />
              <strong>Generation en cours...</strong>
            </div>
          ) : (
            <button type="button" className="video-action-btn" onClick={() => void handleGenerateIdea()} disabled={isBusy || !isJourneyReady}>
              {displayedGeneratedIdeas.length ? 'Regenerer des idees' : 'Generer'}
            </button>
          )}
          {!isJourneyReady ? (
            <button type="button" className="video-action-btn ghost" onClick={() => navigate('/accounts')}>
              Ouvrir Accounts
            </button>
          ) : null}
          <button type="button" className="video-action-btn ghost" onClick={() => void handleValidateCreation()} disabled={isBusy || !selectedGeneratedIdea || !isJourneyReady}>
            Valider
          </button>
        </div>
      ),
      result: (
        <div className="tiktok-step-result">
          {isGeneratingIdeas ? (
            <div className="tiktok-loading-state" aria-live="polite" aria-label="Generation des idees en cours">
              <div className="tiktok-loading-state-spinner" aria-hidden="true" />
              <div className="tiktok-loading-state-copy">
                <strong>Generation en cours</strong>
                <span>Preparation des nouvelles idees...</span>
              </div>
            </div>
          ) : null}
          {displayedGeneratedIdeas.length ? (
            <div className="tiktok-ideas-list">
              {displayedGeneratedIdeas.map((idea, index) => {
                const isSelected = Number(idea.id) === Number(selectedGeneratedIdea?.id)
                const previewText = idea.caption || idea.script

                return (
                  <button
                    key={idea.id}
                    type="button"
                    className={`tiktok-idea-preview ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => setSelectedGeneratedIdeaId(idea.id)}
                  >
                    <div className="tiktok-idea-preview-head">
                      <span className="tiktok-idea-preview-kicker">{isSelected ? 'Selectionnee' : `Idee ${index + 1}`}</span>
                      <span className={`tiktok-idea-preview-indicator ${isSelected ? 'is-selected' : ''}`} aria-hidden="true" />
                    </div>
                    <strong>{idea.topic || `Video #${idea.id}`}</strong>
                    {previewText ? <p>{previewText}</p> : null}
                  </button>
                )
              })}
            </div>
          ) : null}
        </div>
      ),
    }
  }

  if (currentStep.id === 'script') {
    return {
      actions: (
        <div className="tiktok-step-actions">
          <button type="button" className="video-action-btn" onClick={() => void handleRegenerateScript()} disabled={isBusy}>
            Regenerer script
          </button>
          <button type="button" className="video-action-btn ghost" onClick={() => void handleValidateScript()} disabled={isBusy || !scriptedIdea}>
            Valider
          </button>
        </div>
      ),
      result: (
        <div className="tiktok-step-result">
          {isGeneratingScript && !scriptedIdea ? (
            <div className="tiktok-loading-state" aria-live="polite" aria-label="Generation du script en cours">
              <div className="tiktok-loading-state-spinner" aria-hidden="true" />
              <div className="tiktok-loading-state-copy">
                <strong>Generation script en cours</strong>
                <span>Le resultat de l idee selectionnee apparaitra ici des qu il sera pret.</span>
              </div>
            </div>
          ) : (
            <div className="video-preview-stack">
              <div className="video-preview-block">
                <span>Topic</span>
                <p>{scriptedIdea?.topic || '-'}</p>
              </div>
              <div className="video-preview-block">
                <span>Script</span>
                <p>{scriptedIdea?.script || 'En attente'}</p>
              </div>
              <div className="video-preview-block">
                <span>Caption</span>
                <p>{scriptedIdea?.caption || 'En attente'}</p>
              </div>
              <div className="video-preview-block">
                <span>Keyword</span>
                <p>{scriptedIdea?.keyword || 'En attente'}</p>
              </div>
            </div>
          )}
        </div>
      ),
    }
  }

  if (currentStep.id === 'init-publish') {
    const previewUrl = manualAction?.shotstackUrl || scriptedIdea?.shotstackUrl || selectedGeneratedIdea?.shotstackUrl

    return {
      actions: (
        <div className="tiktok-step-actions">
          <button type="button" className="video-action-btn" onClick={() => void handleRetryInitPublish()} disabled={isBusy}>
            Relancer la generation video
          </button>
          <button type="button" className="video-action-btn ghost" onClick={handleValidateInitPublish} disabled={isBusy || !previewUrl}>
            Valider
          </button>
        </div>
      ),
      result: (
        <div className="tiktok-step-result">
          {isPreparingVideo && !previewUrl ? (
            <div className="tiktok-loading-state" aria-live="polite" aria-label="Generation de la video en cours">
              <div className="tiktok-loading-state-spinner" aria-hidden="true" />
              <div className="tiktok-loading-state-copy">
                <strong>Generation video en cours</strong>
                <span>La preparation video est en cours.</span>
              </div>
            </div>
          ) : null}
          {previewUrl ? (
            <div className="video-preview-stack">
              <div className="video-preview-block">
                <span>Apercu video</span>
                <VideoPreview url={previewUrl} />
              </div>
            </div>
          ) : null}
        </div>
      ),
    }
  }

  if (currentStep.id === 'upload') {
    return {
      actions: (
        <div className="tiktok-step-actions">
          <div className="tiktok-step-intro">
            <strong>{isJourneyReady ? 'Accounts verifies' : 'Accounts requis'}</strong>
            <p>
              {isJourneyReady
                ? 'Le compte TikTok cible et les services requis sont deja verifies pour l upload.'
                : 'Connecte tous les comptes requis dans Accounts avant d autoriser l upload.'}
            </p>
          </div>
          {hasConnectedTikTokAccount ? (
            <div className="video-preview-block">
              <span>Compte connecte</span>
              <p>{connectedTikTokAccount?.nickname || '-'}</p>
              <p>Open ID cible: {formatShortOpenId(activeIdea?.tiktokAccountOpenId || connectedTikTokAccount?.openId)}</p>
              <p>Scope: {connectedTikTokAccount?.scope || '-'}</p>
              <p>Status: {connectedTikTokAccount?.status || '-'}</p>
            </div>
          ) : null}
          {!isJourneyReady ? (
            <button type="button" className="video-action-btn ghost" onClick={() => navigate('/accounts')}>
              Ouvrir Accounts
            </button>
          ) : null}
          <button type="button" className="video-action-btn" onClick={() => void handlePrepareUpload()} disabled={isBusy || Boolean(manualAction?.uploadUrl)}>
            {isPreparingUpload ? 'Preparation...' : 'Preparer upload'}
          </button>
          <button type="button" className="video-action-btn ghost" onClick={() => void handleUploadVideo()} disabled={isBusy || !manualAction?.uploadUrl || !isJourneyReady}>
            {isUploadingVideo ? 'Upload...' : 'Uploader'}
          </button>
          <button type="button" className="video-action-btn ghost" onClick={handleValidateUpload} disabled={isBusy || !uploadResult}>
            Valider
          </button>
        </div>
      ),
      result: (
        <div className="tiktok-step-result">
          <div className="video-preview-stack">
            <div className="video-preview-block">
              <span>Upload URL</span>
              <p>{manualAction?.uploadUrl || 'En attente'}</p>
            </div>
            <div className="video-preview-block">
              <span>Resultat upload</span>
              <p>{uploadResult ? 'Upload termine.' : 'Aucun upload lance.'}</p>
            </div>
          </div>
        </div>
      ),
    }
  }

  return {
    actions: (
      <div className="tiktok-step-actions">
        <button type="button" className="video-action-btn" onClick={() => void handlePublishVideo()} disabled={isBusy}>
          {isPublishingVideo ? 'Publication...' : 'Publier'}
        </button>
      </div>
    ),
    result: (
      <div className="tiktok-step-result">
        <div className="video-preview-stack">
          <div className="video-preview-block">
            <span>Video</span>
            <p>{activeIdea?.topic || 'Publication en attente.'}</p>
          </div>
          <div className="video-preview-block">
            <span>Status</span>
            <p>{successMessage || 'Pret pour publication finale.'}</p>
          </div>
        </div>
      </div>
    ),
  }
}
