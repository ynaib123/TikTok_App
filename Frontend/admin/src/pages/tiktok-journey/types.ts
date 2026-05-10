import type { JSX } from 'react'
import type { NavigateFunction } from 'react-router-dom'
import type { ContentIdea, TikTokAccount } from '../../types'
import type { PexelsVideo } from '../../services/videoOpsSupabase'

export type IconComponent = () => JSX.Element

export interface StepDescriptor {
  id: string
  label: string
  sub?: string
}

export interface JourneyManualAction {
  id?: number
  shotstackUrl?: string | null
  uploadUrl?: string | null
  pipelineStatus?: string | null
  tiktokStatus?: string | null
  finalVideoStatus?: string | null
  shotstackStatus?: string | null
  lastError?: string | null
}

export interface JourneyOptionDescriptor {
  value: string
  label: string
  description: string
}

export interface JourneyNumericOptionDescriptor {
  value: number
  label: string
  description: string
}

export interface SceneTextStyle {
  textX: number
  textY: number
  textColor: string
  fontFamily: string
  fontSize: number
  fontWeight: number
  uppercase: boolean
  shadow: 'none' | 'soft' | 'strong'
  saved?: boolean
}

export interface StepBodyProps {
  steps: StepDescriptor[]
  currentStepIndex: number
  currentStep: StepDescriptor
  closeAddFlow: () => void
  saveAndCloseFlow: () => void
  isLeaveConfirmOpen: boolean
  willDeleteOnLeave: boolean
  openLeaveConfirm: () => void
  closeLeaveConfirm: () => void
  leaveWithoutSaving: () => void
  saveAndLeaveFlow: () => void
  goToStep: (id: string) => void
  goToStepFromRecap: (stepId: string) => void
  handleValidateAudio: () => void
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
  handleManualCreate: (data: {
    topic: string
    script: string
    caption: string
    keyword: string
  }) => Promise<void> | void
  selectedTikTokSoundId: string | null
  setSelectedTikTokSoundId: (id: string | null) => void
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
  editedTopic: string
  setEditedTopic: (value: string) => void
  editedScript: string
  setEditedScript: (value: string) => void
  editedCaption: string
  setEditedCaption: (value: string) => void
  editedKeyword: string
  setEditedKeyword: (value: string) => void
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
  selectedSceneMediaUrls: string[]
  setSelectedSceneMediaUrls: (urls: string[] | ((current: string[]) => string[])) => void
  sceneTextStyles: SceneTextStyle[]
  setSceneTextStyles: (
    styles: SceneTextStyle[] | ((current: SceneTextStyle[]) => SceneTextStyle[]),
  ) => void
  pexelsCache: { query: string; videos: PexelsVideo[] } | null
  setPexelsCache: (cache: { query: string; videos: PexelsVideo[] } | null) => void
}

export type TikTokStepScreenProps = StepBodyProps
