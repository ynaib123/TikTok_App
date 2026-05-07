import type { WorkflowRun } from './workflow';

export type ServiceHealthStatus =
  | 'UP'
  | 'DOWN'
  | 'DEGRADED'
  | 'WARNING'
  | 'DISABLED'
  | 'FAILED'
  | 'UNKNOWN'
  | string;

export interface ServiceHealthEntry {
  status?: ServiceHealthStatus | null;
  detail?: string | null;
}

export interface WorkflowsHealth {
  stuckRunsOlderThanThreshold?: number;
  stuckThresholdSeconds?: number;
}

export interface VideoOpsHealth {
  status?: ServiceHealthStatus | null;
  database?: ServiceHealthEntry | null;
  n8n?: ServiceHealthEntry | null;
  alerting?: ServiceHealthEntry | null;
  workflows?: WorkflowsHealth | null;
}

export interface VideoOpsObservability {
  recentRuns?: WorkflowRun[];
  failedRuns?: WorkflowRun[];
}

export interface VideoOpsDashboard {
  recentRuns?: WorkflowRun[];
  [key: string]: unknown;
}

export interface VideoDashboardData {
  health: VideoOpsHealth | null;
  observability: VideoOpsObservability | null;
  dashboard: VideoOpsDashboard | null;
}
