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
}

export interface WorkflowRun {
  id: number;
  contentIdeaId: number | null;
  workflowType: string;
  status: string;
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
}

export interface WorkflowStatusEntry {
  id?: string | number;
  runId?: number | null;
  workflowType: string;
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
