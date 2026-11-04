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
  const invalidFields: string[] = [];
  const summary = x.summary;
  if (typeof summary !== 'string' || summary.trim().length < 8 || summary.length > 1200) invalidFields.push('summary');
  if (!risks.includes(x.risk as typeof risks[number])) invalidFields.push('risk');
  if (!validList(x.concerns)) invalidFields.push('concerns');
  if (!validList(x.evidenceGaps)) invalidFields.push('evidenceGaps');
  if (!recommendations.includes(x.recommendation as typeof recommendations[number])) invalidFields.push('recommendation');
  if (invalidFields.length) {
    // Only trusted field names appear in diagnostics, never raw model text.
    throw new Error('SERV invalid decision fields: ' + invalidFields.join(', '));
  }

  return {
    summary: (x.summary as string).trim().slice(0, 600),
    risk: x.risk as ServAssessment['risk'],
    recommendation: x.recommendation as ServAssessment['recommendation'],
    concerns: (x.concerns as string[]).map(v => v.slice(0, 200)),
    evidenceGaps: (x.evidenceGaps as string[]).map(v => v.slice(0, 200)),
  };
}
