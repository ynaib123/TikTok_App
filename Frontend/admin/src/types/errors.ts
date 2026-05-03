export type ErrorSeverity = 'info' | 'warning' | 'error';

export interface ErrorContext {
  source?: string;
  action?: string;
  providerKey?: string;
  contentIdeaId?: number | null;
  traceId?: string | null;
}

export interface AppError {
  message: string;
  title?: string;
  severity?: ErrorSeverity;
  helpText?: string;
  context?: ErrorContext;
  cause?: unknown;
}

export interface FeedbackMessage {
  type: 'success' | 'error';
  message: string | null;
}
