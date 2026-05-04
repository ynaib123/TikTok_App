export type BatchItemStatus = 'PENDING' | 'RUNNING' | 'PUBLISHED' | 'FAILED' | 'CANCELLED';

export type BatchStatus = 'RUNNING' | 'COMPLETED' | 'PARTIAL_FAILURE' | 'FAILED' | 'CANCELLED';

export interface BatchPublishItem {
  contentIdeaId: number;
  status: BatchItemStatus;
  errorMessage: string | null;
  workflowRunId: number | null;
  attemptNumber: number;
  completedAt: string | null;
}

export interface BatchPublish {
  batchId: string;
  status: BatchStatus;
  totalCount: number;
  completedCount: number;
  failedCount: number;
  pendingCount: number;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  items: BatchPublishItem[];
}

export interface BatchPublishStartRequest {
  contentIdeaIds: number[];
  tiktokAccountOpenId?: string | null;
}
