import type { Decision, ServAssessment } from './policy.ts';
import type { DecisionRecord } from './attestation.ts';

export type HandoffEvidence={
  mode:'serv-live'|'local-policy'|'policy';
  policy:Decision;
  serv:ServAssessment|null;
  attestation?:DecisionRecord|null;
};
export type HandoffState=
  'MISSING_LIVE_REVIEW'|'DENIED'|'SIGNATURE_UNVERIFIED'|'REVIEW_EXPIRED'|'READY';

export const REVIEW_VALIDITY_MS=10*60*1000;
const CLOCK_SKEW_MS=60*1000;

/**
 * The signature status must come from /api/verify, never from the mere presence
 * of a client-supplied attestation. Review expiration does not invalidate
 * historical signature authenticity; it only prevents a new payment handoff.
 */
export function getHandoffState(
  report:HandoffEvidence|null,
  verification:'idle'|'checking'|'verified'|'invalid',
  now=Date.now(),
):HandoffState{
  if(!report || report.mode!=='serv-live' || !report.attestation || !report.serv ||
     report.policy.verdict!=='REVIEW' || report.policy.paymentExecuted!==false){
    return 'MISSING_LIVE_REVIEW';
  }
  const p=report.attestation.payload;
  if(report.serv.recommendation!=='REVIEW' || report.serv.risk==='high' ||
     p.recommendation!=='REVIEW' || p.risk==='high' || p.paymentExecuted!==false){
    return 'DENIED';
  }
  if(verification!=='verified')return 'SIGNATURE_UNVERIFIED';
  const issued=Date.parse(p.issuedAt);
  if(!Number.isFinite(issued) || issued>now+CLOCK_SKEW_MS || now-issued>REVIEW_VALIDITY_MS){
    return 'REVIEW_EXPIRED';
  }
  return 'READY';
}
