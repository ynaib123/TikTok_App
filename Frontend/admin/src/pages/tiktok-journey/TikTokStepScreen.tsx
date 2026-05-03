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
          </div>
          {isGeneratingIdeas ? (
            <div
              className="tiktok-generate-loading"
              role="progressbar"
              aria-label="Generation en cours"
              aria-valuetext="Generation en cours"
            >
              <span className="tiktok-generate-loading-bar" aria-hidden="true" />
              <strong>Generation en cours...</strong>
            </div>
          ) : (
            <button type="button" className="video-action-btn" onClick={() => void handleGenerateIdea()} disabled={isBusy || !isJourneyReady}>
              {displayedGeneratedIdeas.length ? 'Regenerer' : 'Generer'}
            </button>
          )}
          {!isJourneyReady ? (
            <button type="button" className="video-action-btn ghost" onClick={() => navigate('/accounts')}>
              Ouvrir Accounts
            </button>
          ) : null}
          <button type="button" className="video-action-btn primary" onClick={() => void handleValidateCreation()} disabled={isBusy || !selectedGeneratedIdea || !isJourneyReady}>
            Generer video
          </button>
        </div>
      ),
      result: (
        <div className="tiktok-step-result">
          {isGeneratingIdeas ? (
            <div className="tiktok-loading-state" aria-live="polite" aria-label="Generation en cours">
              <div className="tiktok-loading-state-spinner" aria-hidden="true" />
              <div className="tiktok-loading-state-copy">
                <strong>Generation en cours</strong>
                <span>Preparation de l idee et du script...</span>
              </div>
            </div>
          ) : null}
          {scriptedIdea ? (
            <div className="tiktok-result-stack">
              <div className="tiktok-result-block">
                <div className="tiktok-result-label">Topic</div>
                <div className="tiktok-result-value">{scriptedIdea?.topic || '-'}</div>
              </div>
              <div className="tiktok-result-block">
                <div className="tiktok-result-label">Script</div>
                <div className="tiktok-result-value">{scriptedIdea?.script || 'En attente'}</div>
              </div>
              <div className="tiktok-result-block">
                <div className="tiktok-result-label">Caption</div>
                <div className="tiktok-result-value">{scriptedIdea?.caption || 'En attente'}</div>
              </div>
              <div className="tiktok-result-block">
                <div className="tiktok-result-label">Keyword</div>
                <div className="tiktok-result-value">{scriptedIdea?.keyword || 'En attente'}</div>
              </div>
            </div>
          ) : null}
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

          {scriptedIdea ? (
            <>
              <div style={{ height: '16px' }} />
              <div className="tiktok-result-stack">
                <div className="tiktok-result-block">
                  <div className="tiktok-result-label">Topic</div>
                  <div className="tiktok-result-value">{scriptedIdea?.topic || '-'}</div>
                </div>
                <div className="tiktok-result-block">
                  <div className="tiktok-result-label">Script</div>
                  <div className="tiktok-result-value">{scriptedIdea?.script || 'En attente'}</div>
                </div>
                <div className="tiktok-result-block">
                  <div className="tiktok-result-label">Caption</div>
                  <div className="tiktok-result-value">{scriptedIdea?.caption || 'En attente'}</div>
                </div>
                <div className="tiktok-result-block">
                  <div className="tiktok-result-label">Keyword</div>
                  <div className="tiktok-result-value">{scriptedIdea?.keyword || 'En attente'}</div>
                </div>
              </div>
            </>
          ) : null}
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
