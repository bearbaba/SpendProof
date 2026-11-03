import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export type AuditAttestation = {
  kind: 'SPENDPROOF_DECISION_V1';
  algorithm: 'HMAC-SHA256';
  payload: {
    requestDigest: string;
    policyVerdict: 'REVIEW';
    risk: 'low' | 'medium' | 'high';
    recommendation: 'REVIEW' | 'DENY';
    model: string;
    issuedAt: string;
    paymentExecuted: false;
  };
  signature: string;
};

export function proposalDigest(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export function signDecision(secret: string, payload: AuditAttestation['payload']): AuditAttestation {
  if (secret.length < 32) throw new Error('Audit signing secret must contain at least 32 characters');
  const signature = createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
  return { kind: 'SPENDPROOF_DECISION_V1', algorithm: 'HMAC-SHA256', payload, signature };
}

export function verifyDecision(secret: string, value: unknown): value is AuditAttestation {
  if (secret.length < 32 || !value || typeof value !== 'object' || Array.isArray(value)) return false;
  const r = value as Record<string, unknown>;
  if (r.kind !== 'SPENDPROOF_DECISION_V1' || r.algorithm !== 'HMAC-SHA256') return false;
  if (!r.payload || typeof r.payload !== 'object' || Array.isArray(r.payload)) return false;
  const p = r.payload as Record<string, unknown>;
  if (typeof p.requestDigest !== 'string' || !/^[a-f0-9]{64}$/.test(p.requestDigest)) return false;
  if (p.policyVerdict !== 'REVIEW' || p.paymentExecuted !== false) return false;
  if (!['low','medium','high'].includes(String(p.risk))) return false;
  if (!['REVIEW','DENY'].includes(String(p.recommendation))) return false;
  if (typeof p.model !== 'string' || p.model.length > 150 ||
      typeof p.issuedAt !== 'string' || !Number.isFinite(Date.parse(p.issuedAt))) return false;
  if (typeof r.signature !== 'string' || !/^[a-f0-9]{64}$/.test(r.signature)) return false;
  const expected = createHmac('sha256', secret).update(JSON.stringify(p)).digest();
  const actual = Buffer.from(r.signature, 'hex');
  return timingSafeEqual(expected, actual);
}
