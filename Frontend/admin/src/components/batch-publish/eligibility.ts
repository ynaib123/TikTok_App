import type { ContentIdea } from '../../types';

export interface EligibilityResult {
  selectable: boolean;
  reason: string | null;
}

export function evaluateBatchPublishEligibility(idea: ContentIdea): EligibilityResult {
  const publishStatus = String(idea.tiktokStatus ?? '').toLowerCase();
  if (publishStatus === 'published') {
    return { selectable: false, reason: 'Deja publiee' };
  }
  const finalVideoStatus = String(idea.finalVideoStatus ?? '').toLowerCase();
  if (!idea.shotstackUrl) {
    return { selectable: false, reason: 'Video pas encore rendue' };
  }
  if (finalVideoStatus !== 'done' && finalVideoStatus !== 'ready') {
    return { selectable: false, reason: `Statut video: ${idea.finalVideoStatus ?? 'inconnu'}` };
  }
  if (!idea.tiktokAccountOpenId) {
    return { selectable: false, reason: 'Compte TikTok non lie' };
  }
  return { selectable: true, reason: null };
}
