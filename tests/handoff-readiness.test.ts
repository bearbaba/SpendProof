import assert from 'node:assert/strict';
import test from 'node:test';
import { getHandoffState, REVIEW_VALIDITY_MS } from '../lib/handoff-readiness.ts';
import { signDecision } from '../lib/attestation.ts';
import { evaluate, type Proposal } from '../lib/policy.ts';

const now=Date.parse('2026-11-04T01:00:00Z');
const proposal:Proposal={
  task:'Purchase one weather dataset for an agent task',
  provider:'Weather data',endpoint:'https://weather.example.org/api',
  evidenceUrl:'https://weather.example.org/pricing',
  amountUsd:0.25,budgetUsd:2,perTxUsd:1,remainingUsd:1,
  method:'GET',supportsX402:true,
};
const policy=evaluate(proposal);
const serv={
  summary:'The request fits the cap, but the provider needs verification.',
  risk:'medium' as const,
  recommendation:'REVIEW' as const,
  concerns:['Provider unverified'],
  evidenceGaps:['Live catalog evidence needed'],
};
function report(issuedAt=new Date(now).toISOString()){
  const attestation=signDecision('a-long-server-secret-used-only-for-tests', {
    requestDigest:'a'.repeat(64),policyDigest:'b'.repeat(64),
    assessmentDigest:'c'.repeat(64),
    policyVerdict:'REVIEW',risk:serv.risk,recommendation:serv.recommendation,
    model:'serv-test-model',issuedAt,paymentExecuted:false,
  });
  return { mode:'serv-live' as const,policy,serv,attestation };
}

test('fresh, verified, non-denied SERV record is eligible for manual handoff',()=>{
  assert.equal(getHandoffState(report(),'verified',now),'READY');
});

test('live record alone never unlocks a payment without signature verification',()=>{
  for(const status of ['idle','checking','invalid'] as const){
    assert.equal(getHandoffState(report(),status,now),'SIGNATURE_UNVERIFIED');
  }
});

test('reviews expire and future-dated records cannot be reused for a payment',()=>{
  assert.equal(getHandoffState(report(new Date(now-REVIEW_VALIDITY_MS-1).toISOString()),'verified',now),'REVIEW_EXPIRED');
  assert.equal(getHandoffState(report(new Date(now+61_000).toISOString()),'verified',now),'REVIEW_EXPIRED');
  assert.equal(getHandoffState(report(new Date(now-REVIEW_VALIDITY_MS).toISOString()),'verified',now),'READY');
});

test('DENY and high-risk verdicts never unlock payments even with verified signature status',()=>{
  const denied=report();
  assert.equal(getHandoffState({...denied,serv:{...serv,recommendation:'DENY'}},'verified',now),'DENIED');
  assert.equal(getHandoffState({...denied,serv:{...serv,risk:'high'}},'verified',now),'DENIED');
  assert.equal(getHandoffState({...denied,policy:{...policy,verdict:'BLOCK'}},'verified',now),'MISSING_LIVE_REVIEW');
});

test('local checks and missing records never authorize payment',()=>{
  assert.equal(getHandoffState(null,'verified',now),'MISSING_LIVE_REVIEW');
  assert.equal(getHandoffState({...report(),mode:'local-policy'},'verified',now),'MISSING_LIVE_REVIEW');
  assert.equal(getHandoffState({...report(),attestation:null},'verified',now),'MISSING_LIVE_REVIEW');
});
