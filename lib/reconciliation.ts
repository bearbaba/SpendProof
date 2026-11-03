import { cents, evaluate, safeHttps, type Proposal } from './policy.ts';
import { evaluateCatalogReview, type CatalogReview } from './kite.ts';

export type PaymentObservation = {
  status: 'pending' | 'failed' | 'success';
  sessionId: string;
  serviceId: string;
  endpoint: string;
  amountUsd: number;
  activityReference: string;
  checkedInPassport: boolean;
};

export type Reconciliation = {
  outcome: 'NOT_RECORDED' | 'MISMATCH' | 'MATCHED_UNVERIFIED';
  evidenceOrigin: 'USER_ENTERED';
  paymentVerified: false;
  merchantVerified: false;
  checks: { id: string; title: string; passed: boolean }[];
};

export const emptyObservation: PaymentObservation = {
  status: 'pending', sessionId: '', serviceId: '', endpoint: '',
  amountUsd: 0, activityReference: '', checkedInPassport: false,
};

export function reconcileObservation(
  proposal: Proposal, catalog: CatalogReview, observation: PaymentObservation,
): Reconciliation {
  const supplied = observation.sessionId.trim().length > 0 ||
    observation.activityReference.trim().length > 0 ||
    observation.endpoint.trim().length > 0 ||
    observation.serviceId.trim().length > 0 ||
    observation.amountUsd > 0 ||
    observation.status !== 'pending';
  if (!supplied) {
    return {
      outcome:'NOT_RECORDED', evidenceOrigin:'USER_ENTERED',
      paymentVerified:false, merchantVerified:false, checks:[],
    };
  }
  const quoted = cents(proposal.amountUsd);
  const charged = cents(observation.amountUsd);
  const checks = [
    { id:'policy',title:'Original spending policy allows review',passed:evaluate(proposal).verdict==='REVIEW' },
    { id:'catalog',title:'Manual Kite catalog review has no discrepancies',passed:evaluateCatalogReview(proposal,catalog).every(c=>c.passed) },
    { id:'success',title:'Reported Kite result is success',passed:observation.status==='success' },
    { id:'session',title:'Session identifier is recorded',passed:/^[a-zA-Z0-9][a-zA-Z0-9_.:-]{7,159}$/.test(observation.sessionId) },
    { id:'service',title:'Reported service ID matches the reviewed catalog',passed:catalog.serviceId.length>0 && observation.serviceId===catalog.serviceId },
    { id:'endpoint',title:'Reported endpoint exactly matches the approved proposal',passed:safeHttps(observation.endpoint) && observation.endpoint===proposal.endpoint && observation.endpoint===catalog.endpoint },
    { id:'charge',title:'Reported charged amount matches quoted price',passed:quoted!==null && charged!==null && quoted===charged },
    { id:'reference',title:'Payment activity reference is present',passed:/^[a-zA-Z0-9][a-zA-Z0-9_.:/-]{7,199}$/.test(observation.activityReference) },
    { id:'reviewed',title:'User reports checking payment activity in Kite Passport',passed:observation.checkedInPassport },
  ];
  return {
    outcome:checks.every(c=>c.passed)?'MATCHED_UNVERIFIED':'MISMATCH',
    evidenceOrigin:'USER_ENTERED',
    paymentVerified:false,
    merchantVerified:false,
    checks,
  };
}
