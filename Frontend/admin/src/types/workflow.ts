// Mirror backend enums (com.tiktokapp.backend.model.*). Keep in sync if a value is added/renamed.
export type VideoWorkflowRunStatus = 'PENDING' | 'ACCEPTED' | 'SUCCEEDED' | 'FAILED';

export type VideoWorkflowType =
  | 'MAIN_PIPELINE'
  | 'SCRIPT_GENERATION'
  | 'CHECK_SHOTSTACK'
  | 'RENDER_TEMPLATE_VIDEO'
  | 'INIT_PUBLISH_TIKTOK'
  | 'TIKTOK_UPLOAD'
  | 'FINALIZE_PUBLISH';

export type VideoPipelineStage =
  | 'UNKNOWN'
  | 'CREATION_REQUESTED'
  | 'IDEA_CREATED'
  | 'SCRIPT_REQUESTED'
  | 'SCRIPT_READY'
  | 'RENDERING_REQUESTED'
  | 'RENDER_READY'
  | 'UPLOAD_PREPARING'
  | 'PUBLISH_INITIALIZED'
  | 'UPLOAD_COMPLETED'
  | 'PUBLISHED'
  | 'FAILED';

export const TERMINAL_RUN_STATUSES: ReadonlySet<VideoWorkflowRunStatus> = new Set(['SUCCEEDED', 'FAILED']);

export type RenderTemplateId =
  | 'tiktok-scene-sequence'
  | 'tiktok-pro-vertical'
  | 'tiktok-bold-story'
  | 'tiktok-clean-minimal';

export type RenderQualityProfile = 'draft' | 'standard' | 'high' | 'premium';

export type RenderEngine = 'shotstack' | 'remotion';

export interface ContentIdea {
  id: number;
  category: string | null;
  topic: string | null;
  script: string | null;
  caption: string | null;
  keyword: string | null;
  shotstackStatus: string | null;
  tiktokStatus: string | null;
  finalVideoStatus: string | null;
  shotstackUrl: string | null;
  uploadUrl: string | null;
  tiktokAccountOpenId: string | null;
  pipelineStatus: string | null;
  lastError: string | null;
  templateId?: RenderTemplateId | string | null;
  qualityProfile?: RenderQualityProfile | string | null;
  renderEngine?: RenderEngine | string | null;
  thumbnailUrl?: string | null;
}

export interface WorkflowRun {
  id: number;
  contentIdeaId: number | null;
  workflowType: VideoWorkflowType | string;
  status: VideoWorkflowRunStatus | string;
  attemptNumber: number;
  errorMessage: string | null;
  responsePayload: string | null;
  createdAt: string | null;
  completedAt: string | null;
}

export interface ContentIdeaStatus {
  contentIdeaId: number;
  topic: string | null;
  pipelineStage: string | null;
  pipelineStageLabel: string | null;
  shotstackStatus: string | null;
  finalVideoStatus: string | null;
  tiktokStatus: string | null;
  tiktokUploadStatus: string | null;
  tiktokAccountOpenId: string | null;
  shotstackUrl: string | null;
  uploadUrl: string | null;
  lastErrorMessage: string | null;
  lastWorkflowRun: WorkflowRun | null;
  lastEventMessage: string | null;
  lastEventSeverity: string | null;
  lastUpdatedAt: string | null;
}

export interface ManualAction {
  id: number;
  topic: string | null;
  shotstackUrl: string | null;
  uploadUrl: string | null;
  uploadStatus: string | null;
  publishStatus: string | null;
  finalVideoStatus: string | null;
  shotstackStatus: string | null;
  pipelineStatus: string | null;
  lastError: string | null;
  templateId?: RenderTemplateId | string | null;
  qualityProfile?: RenderQualityProfile | string | null;
  renderEngine?: RenderEngine | string | null;
  thumbnailUrl?: string | null;
}

export interface WorkflowStatusEntry {
  id?: string | number;
  runId?: number | null;
  workflowType: VideoWorkflowType | string;
  contentIdeaId?: number | null;
  state?: 'pending' | 'succeeded' | 'failed';
  message?: string | null;
}

export interface WorkflowState {
  generatedIdeas: ContentIdea[];
  selectedGeneratedIdeaId: number | null;
  scriptedIdea: ContentIdea | null;
  manualAction: ManualAction | null;
  uploadResult: unknown;
  errorMessage: string | null;
  successMessage: string | null;
}

export interface VideoObservability {
  recentRuns: WorkflowRun[];
  failedRuns: WorkflowRun[];
  recentErrors: Array<Record<string, unknown>>;
  recentEvents: Array<Record<string, unknown>>;
  n8nContract: {
    healthy: boolean;
    source: string | null;
    baseUrl: string | null;
    workflowPaths: Record<string, string>;
    warnings: string[];
    legacyCallbackSecretAllowed: boolean;
    stuckRunCount: number;
  } | null;
}
