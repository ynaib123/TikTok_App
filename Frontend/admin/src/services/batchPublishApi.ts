import { apiGet, apiPost } from './adminApiClient.js';
import type { BatchPublish, BatchPublishStartRequest } from '../types/batchPublish';

// adminApiClient unwraps the envelope and returns the DTO directly
// (or throws on non-2xx). Do NOT wrap again here.

export async function startBatchPublish(req: BatchPublishStartRequest): Promise<BatchPublish> {
  return (await apiPost('/video-ops/content-ideas/batch-publish', req)) as BatchPublish;
}

export async function fetchBatchPublish(batchId: string): Promise<BatchPublish> {
  return (await apiGet(`/video-ops/batches/${encodeURIComponent(batchId)}`)) as BatchPublish;
}
