import type { Decision, Proposal, ServAssessment } from './policy.ts';
import type { DecisionRecord } from './attestation.ts';

export type HandoffEvidence={
  mode:'serv-live'|'local-policy'|'policy';
  policy:Decision;
  proposal:Proposal;
  serv:ServAssessment|null;
  attestation?:DecisionRecord|null;
};
export type HandoffState=
  'MISSING_LIVE_REVIEW'|'REQUEST_CHANGED'|'DENIED'|'SIGNATURE_UNVERIFIED'|'REVIEW_EXPIRED'|'READY';

export const REVIEW_VALIDITY_MS=10*60*1000;
const CLOCK_SKEW_MS=60*1000;

const intentKeys: (keyof Proposal)[] = [
  'task','provider','endpoint','evidenceUrl',
  'amountUsd','budgetUsd','perTxUsd','remainingUsd',
  'supportsX402','method',
];

/** Compare the exact intent that SERV reviewed against the currently edited form. */
export function samePurchaseIntent(reviewed:Proposal, current:Proposal):boolean{
  if(!reviewed || !current) return false;
  return intentKeys.every(key=>reviewed[key]===current[key]);
}

/**
 * The signature status must come from /api/verify, never from the mere presence
 * of a client-supplied attestation. Review expiration does not invalidate
 * historical signature authenticity; it only prevents a new payment handoff.
 */
export function getHandoffState(
  report:HandoffEvidence|null,
  currentProposal:Proposal,
  verification:'idle'|'checking'|'verified'|'invalid',
  now=Date.now(),
):HandoffState{
  if(!report || report.mode!=='serv-live' || !report.attestation || !report.serv ||
     report.policy.verdict!=='REVIEW' || report.policy.paymentExecuted!==false){
    return 'MISSING_LIVE_REVIEW';
  }
  if(!samePurchaseIntent(report.proposal,currentProposal)){
    return 'REQUEST_CHANGED';
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
