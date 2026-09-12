import { CONFIG } from '../config';

export interface Assessment {
  status: 'ai-passed' | 'needs-review' | 'rejected';
  reasons: string[];
}

const f1 = (n: number): string => n.toFixed(1);
const f0 = (n: number): string => n.toFixed(0);

/**
 * Verification layer policy (whiteboard "AI provenance"):
 *  - AI similarity >= rejectAt (50%)  -> rejected automatically
 *  - AI similarity in [passBelow, rejectAt) (30–50%) -> human cultural reviewer
 *  - source traceability < 80% -> human audit of source material
 *  - otherwise machine-verified (mintable immediately)
 */
export function assess(similarity: number, traceability: number): Assessment {
  const { passBelow, rejectAt } = CONFIG.aiSimilarity;
  const traceMin = CONFIG.sourceTraceabilityMin;
  const reasons: string[] = [];

  if (similarity >= rejectAt) {
    return {
      status: 'rejected',
      reasons: [
        `AI similarity ${f1(similarity)}% ≥ ${rejectAt}% — too close to existing registered works; rejected automatically`,
        `Source traceability ${f0(traceability)}% recorded for audit`,
      ],
    };
  }

  let needsReview = false;
  if (similarity >= passBelow) {
    needsReview = true;
    reasons.push(`AI similarity ${f1(similarity)}% is inside the ${passBelow}–${rejectAt}% band → human cultural reviewer decision required`);
  }
  if (traceability < traceMin) {
    needsReview = true;
    reasons.push(`Source traceability ${f0(traceability)}% < ${traceMin}% → human audit of source material required`);
  }
  if (!needsReview) {
    reasons.push(`AI similarity ${f1(similarity)}% < ${passBelow}% and source traceability ${f0(traceability)}% ≥ ${traceMin}% — machine-verified`);
  }
  return { status: needsReview ? 'needs-review' : 'ai-passed', reasons };
}
