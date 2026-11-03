import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export type DecisionRecord = {
  kind: 'SPENDPROOF_DECISION_V2';
  algorithm: 'HMAC-SHA256';
  payload: {
    requestDigest: string;
    policyDigest: string;
    assessmentDigest: string;
    policyVerdict: 'REVIEW';
    risk: 'low' | 'medium' | 'high';
    recommendation: 'REVIEW' | 'DENY';
    model: string;
    issuedAt: string;
    paymentExecuted: false;
  };
  signature: string;
};

export type DecisionBundle = {
  attestation: unknown;
  proposal: unknown;
  policy: unknown;
  serv: unknown;
};

export function recordDigest(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export const proposalDigest = recordDigest;

function signPayload(secret: string, payload: DecisionRecord['payload']): string {
  return createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
}

export function signDecision(secret: string, payload: DecisionRecord['payload']): DecisionRecord {
  if (secret.length < 32) throw new Error('Audit signing secret must contain at least 32 characters');
  return {
    kind: 'SPENDPROOF_DECISION_V2',
    algorithm: 'HMAC-SHA256',
    payload,
    signature: signPayload(secret, payload),
  };
}

export function verifyDecision(secret: string, value: unknown): value is DecisionRecord {
  if (secret.length < 32 || !value || typeof value !== 'object' || Array.isArray(value)) return false;
  const receipt = value as Record<string, unknown>;
  if (receipt.kind !== 'SPENDPROOF_DECISION_V2' || receipt.algorithm !== 'HMAC-SHA256') return false;
  if (!receipt.payload || typeof receipt.payload !== 'object' || Array.isArray(receipt.payload)) return false;
  const payload = receipt.payload as Record<string, unknown>;
  for (const key of ['requestDigest', 'policyDigest', 'assessmentDigest']) {
    if (typeof payload[key] !== 'string' || !/^[a-f0-9]{64}$/.test(payload[key])) return false;
  }
  if (payload.policyVerdict !== 'REVIEW' || payload.paymentExecuted !== false) return false;
  if (!['low', 'medium', 'high'].includes(String(payload.risk))) return false;
  if (!['REVIEW', 'DENY'].includes(String(payload.recommendation))) return false;
  if (typeof payload.model !== 'string' || !payload.model || payload.model.length > 150) return false;
  if (typeof payload.issuedAt !== 'string' || !Number.isFinite(Date.parse(payload.issuedAt))) return false;
  if (typeof receipt.signature !== 'string' || !/^[a-f0-9]{64}$/.test(receipt.signature)) return false;
  const expected = Buffer.from(signPayload(secret, payload as DecisionRecord['payload']), 'hex');
  const actual = Buffer.from(receipt.signature, 'hex');
  return timingSafeEqual(expected, actual);
}

export function verifyDecisionBundle(secret: string, bundle: DecisionBundle) {
  if (!verifyDecision(secret, bundle.attestation)) {
    return { authentic: false, signatureValid: false, documentIntact: false } as const;
  }

  try {
    const { payload } = bundle.attestation;
    if (!bundle.policy || !bundle.serv ||
        typeof bundle.policy !== 'object' || typeof bundle.serv !== 'object') {
      return { authentic: false, signatureValid: true, documentIntact: false } as const;
    }
    const policy = bundle.policy as Record<string, unknown>;
    const assessment = bundle.serv as Record<string, unknown>;
    const matches = recordDigest(bundle.proposal) === payload.requestDigest &&
      recordDigest(bundle.policy) === payload.policyDigest &&
      recordDigest(bundle.serv) === payload.assessmentDigest &&
      policy.verdict === payload.policyVerdict &&
      policy.paymentExecuted === false &&
      assessment.risk === payload.risk &&
      assessment.recommendation === payload.recommendation;
    return { authentic: matches, signatureValid: true, documentIntact: matches } as const;
  } catch {
    return { authentic: false, signatureValid: true, documentIntact: false } as const;
  }
}
