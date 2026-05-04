import { describe, expect, it } from 'vitest';
import type { ContentIdea } from '../../types';
import { evaluateBatchPublishEligibility } from './eligibility';

function makeIdea(overrides: Partial<ContentIdea> = {}): ContentIdea {
  return {
    id: 1,
    category: null,
    topic: null,
    script: null,
    caption: null,
    keyword: null,
    shotstackStatus: null,
    tiktokStatus: null,
    finalVideoStatus: 'done',
    shotstackUrl: 'https://example.com/video.mp4',
    uploadUrl: null,
    tiktokAccountOpenId: 'open-id-1',
    pipelineStatus: null,
    lastError: null,
    ...overrides,
  };
}

describe('evaluateBatchPublishEligibility', () => {
  it('marks a fully-ready idea as selectable', () => {
    const result = evaluateBatchPublishEligibility(makeIdea());
    expect(result.selectable).toBe(true);
    expect(result.reason).toBeNull();
  });

  it('rejects already-published ideas', () => {
    const result = evaluateBatchPublishEligibility(makeIdea({ tiktokStatus: 'published' }));
    expect(result.selectable).toBe(false);
    expect(result.reason).toMatch(/Deja publiee/i);
  });

  it('rejects ideas without shotstackUrl', () => {
    const result = evaluateBatchPublishEligibility(makeIdea({ shotstackUrl: null }));
    expect(result.selectable).toBe(false);
    expect(result.reason).toMatch(/pas encore rendue/i);
  });

  it('rejects ideas with non-final video status', () => {
    const result = evaluateBatchPublishEligibility(makeIdea({ finalVideoStatus: 'processing' }));
    expect(result.selectable).toBe(false);
    expect(result.reason).toMatch(/Statut video/i);
  });

  it('accepts both done and ready as final video status', () => {
    expect(evaluateBatchPublishEligibility(makeIdea({ finalVideoStatus: 'done' })).selectable).toBe(true);
    expect(evaluateBatchPublishEligibility(makeIdea({ finalVideoStatus: 'ready' })).selectable).toBe(true);
    expect(evaluateBatchPublishEligibility(makeIdea({ finalVideoStatus: 'DONE' })).selectable).toBe(true);
  });

  it('rejects ideas without a TikTok account link', () => {
    const result = evaluateBatchPublishEligibility(makeIdea({ tiktokAccountOpenId: null }));
    expect(result.selectable).toBe(false);
    expect(result.reason).toMatch(/Compte TikTok/i);
  });
});
