import type { ServAssessment } from './policy.ts';

// Require exact, typed fields at the provider boundary. The local parser below
// still enforces content limits and fails closed on any schema mismatch.
export const SERV_RESPONSE_FORMAT = {
  type: 'json_schema',
  json_schema: {
    name: 'spendproof_risk_review_v1',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        summary: {type: 'string', description: 'A concrete one-sentence risk summary, at least 8 characters.'},
        risk: {type: 'string', enum: ['low', 'medium', 'high']},
        concerns: {type: 'array', items: {type: 'string'}, description: 'List of short concerns, possibly empty.'},
        evidenceGaps: {type: 'array', items: {type: 'string'}, description: 'List of missing independent verification evidence, possibly empty.'},
        recommendation: {type: 'string', enum: ['REVIEW', 'DENY']},
      },
      required: ['summary','risk','concerns','evidenceGaps','recommendation'],
    },
  },
} as const;

const risks = ['low', 'medium', 'high'] as const;
const recommendations = ['REVIEW', 'DENY'] as const;

export function parseServAssessment(raw: string): ServAssessment {
  if (typeof raw !== 'string' || raw.length > 10000) {
    throw new Error('SERV response exceeds size limit');
  }
  const text = raw.trim().replace(/^\x60{3}(?:json)?\s*/i, '').replace(/\s*\x60{3}$/, '');
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('SERV did not return valid JSON');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('SERV JSON is not an object');
  }
  const x = parsed as Record<string, unknown>;
  const validList = (value: unknown) =>
    Array.isArray(value) &&
    value.length <= 8 &&
    value.every(v => typeof v === 'string' && v.length > 0 && v.length <= 500);
  if (
    typeof x.summary !== 'string' ||
    x.summary.trim().length < 8 ||
    x.summary.length > 1200 ||
    !risks.includes(x.risk as typeof risks[number]) ||
    !recommendations.includes(x.recommendation as typeof recommendations[number]) ||
    !validList(x.concerns) ||
    !validList(x.evidenceGaps)
  ) {
    throw new Error('SERV response does not match required decision schema');
  }

  return {
    summary: x.summary.trim().slice(0, 600),
    risk: x.risk as ServAssessment['risk'],
    recommendation: x.recommendation as ServAssessment['recommendation'],
    concerns: (x.concerns as string[]).map(v => v.slice(0, 200)),
    evidenceGaps: (x.evidenceGaps as string[]).map(v => v.slice(0, 200)),
  };
}
