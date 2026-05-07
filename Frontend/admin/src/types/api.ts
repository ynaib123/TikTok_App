import type { AppError } from './errors';
import type {
  ServiceConnection,
  ServiceConnectionForm,
  ServiceProvider,
} from './services';
import type {
  TikTokAccount,
  TikTokOAuthAuthorizeResponse,
  TikTokOAuthCallbackResponse,
} from './tiktok';
import type {
  ContentIdea,
  ContentIdeaStatus,
  ManualAction,
  VideoObservability,
  WorkflowRun,
} from './workflow';

export interface AccountsReadiness {
  ready: boolean;
  connectedTikTokAccounts: number;
  missingItems: string[];
}

export interface AccountsOverview {
  tiktokAccounts: TikTokAccount[];
  serviceConnections: ServiceConnection[];
  readiness: AccountsReadiness;
}

export interface VideoOpsBootstrapResponse {
  accountsOverview: AccountsOverview;
  accountsReadiness: AccountsReadiness;
  contentIdeas: SpringPageResponse<ContentIdea>;
  manualActions: ManualAction[];
}

export type SaveServiceConnectionPayload = ServiceConnectionForm;

export interface WorkflowTriggerPayload {
  source?: string;
  contentIdeaId?: number | null;
  ideaCount?: number;
  category?: string | null;
  topic?: string | null;
  script?: string | null;
  caption?: string | null;
  keyword?: string | null;
  tiktokAccountOpenId?: string | null;
  force?: boolean;
}

export interface WorkflowTriggerResponse {
  runId: number | null;
  workflowType: string | null;
  status?: string | null;
  responsePayload?: string | null;
}

export interface UploadTikTokMediaPayload {
  id: number;
  shotstackUrl: string;
  uploadUrl: string;
  force?: boolean;
}

export interface UploadTikTokMediaResponse {
  ok?: boolean;
  uploadId?: string | null;
  status?: string | null;
  [key: string]: unknown;
}

export interface SpringPageMetadata {
  size: number;
  number: number;
  totalElements: number;
  totalPages: number;
}

export interface SpringPageResponse<T> {
  content: T[];
  page: SpringPageMetadata;
}

export interface FetchContentIdeasPageParams {
  page?: number;
  size?: number;
  sort?: string;
}

export interface VideoOpsApi {
  fetchAccountsOverview: () => Promise<AccountsOverview>;
  fetchAccountsReadiness: () => Promise<AccountsReadiness>;
  fetchTikTokAccounts: () => Promise<TikTokAccount[]>;
  createTikTokAuthorizationUrl: (redirectPath?: string) => Promise<TikTokOAuthAuthorizeResponse>;
  completeTikTokAuthorization: (params: { code: string; state: string }) => Promise<TikTokOAuthCallbackResponse>;
  disconnectTikTokAccount: (accountId: number | string) => Promise<void>;
  saveServiceConnection: (providerKey: ServiceProvider | string, payload: SaveServiceConnectionPayload) => Promise<ServiceConnection>;
  activateServiceConnection: (providerKey: ServiceProvider | string, connectionId: number | string) => Promise<ServiceConnection>;
  validateServiceConnection: (providerKey: ServiceProvider | string, connectionId: number | string) => Promise<ServiceConnection>;
  deleteServiceConnection: (providerKey: ServiceProvider | string, connectionId: number | string) => Promise<void>;
  fetchContentIdeas: () => Promise<ContentIdea[]>;
  fetchContentIdeasPage: (params?: FetchContentIdeasPageParams) => Promise<SpringPageResponse<ContentIdea>>;
  fetchContentIdeaStatus: (contentIdeaId: number | string) => Promise<ContentIdeaStatus>;
  fetchManualActions: () => Promise<ManualAction[]>;
  fetchWorkflowRun: (runId: number | string) => Promise<WorkflowRun>;
  fetchVideoOpsObservability: () => Promise<VideoObservability>;
  triggerMainContentPipeline: (payload?: WorkflowTriggerPayload) => Promise<WorkflowTriggerResponse>;
  triggerCheckShotstackWorkflow: (payload?: WorkflowTriggerPayload) => Promise<WorkflowTriggerResponse>;
  triggerRenderTemplateWorkflow: (payload?: WorkflowTriggerPayload) => Promise<WorkflowTriggerResponse>;
  triggerPublishTikTokWorkflow: (payload?: WorkflowTriggerPayload) => Promise<WorkflowTriggerResponse>;
  uploadTikTokMedia: (payload: UploadTikTokMediaPayload) => Promise<UploadTikTokMediaResponse>;
}

export type ApiError = AppError & {
  status?: number;
  data?: unknown;
  traceId?: string | null;
};
