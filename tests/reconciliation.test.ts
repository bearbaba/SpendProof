import assert from 'node:assert/strict';
import test from 'node:test';
import { emptyObservation, reconcileObservation, type PaymentObservation } from '../lib/reconciliation.ts';
import type { Proposal } from '../lib/policy.ts';
import type { CatalogReview } from '../lib/kite.ts';

const proposal: Proposal = {
  task:'Get one paid weather request for a travel report',
  provider:'Weather provider',
  endpoint:'https://api.weather.example.org/current?city=Tokyo',
  evidenceUrl:'https://weather.example.org/pricing',
  method:'GET',supportsX402:true,
  amountUsd:0.25,budgetUsd:1,perTxUsd:0.5,remainingUsd:0.75,
};
const catalog: CatalogReview = {
  serviceId:'kite.weather-service123',
  endpoint:proposal.endpoint,priceUsd:0.25,userConfirmed:true,
};
const observation: PaymentObservation = {
  status:'success',
  sessionId:'session-0123456789',
  serviceId:catalog.serviceId,
  endpoint:proposal.endpoint,
  amountUsd:0.25,
  activityReference:'activity-0123456789',
  checkedInPassport:true,
};

test('no payment observation returns NOT_RECORDED',()=>{
  const r=reconcileObservation(proposal,catalog,emptyObservation);
  assert.equal(r.outcome,'NOT_RECORDED');
  assert.equal(r.paymentVerified,false);
  assert.equal(r.checks.length,0);
});

test('complete manual report can match, but never becomes independently verified',()=>{
  const r=reconcileObservation(proposal,catalog,observation);
  assert.equal(r.outcome,'MATCHED_UNVERIFIED');
  assert.equal(r.paymentVerified,false);
  assert.equal(r.merchantVerified,false);
  assert.equal(r.evidenceOrigin,'USER_ENTERED');
  assert.equal(r.checks.every(c=>c.passed),true);
});

test('reported success without a session, activity reference or passport review is a mismatch',()=>{
  for(const changes of [
    {sessionId:''},
    {activityReference:''},
    {checkedInPassport:false},
    {status:'failed' as const},
    {status:'pending' as const},
  ]) {
    const r=reconcileObservation(proposal,catalog,{...observation,...changes});
    assert.equal(r.outcome,'MISMATCH');
    assert.equal(r.paymentVerified,false);
  }
});

test('price increase, service replay and URL substitution are mismatches',()=>{
  for(const changes of [
    {amountUsd:0.26},
    {serviceId:'an-unrelated-service'},
    {endpoint:'https://different.weather.example.org/current?city=Tokyo'},
  ]) {
    const r=reconcileObservation(proposal,catalog,{...observation,...changes});
    assert.equal(r.outcome,'MISMATCH');
  }
});

test('failed original policy or invalid manual catalog review blocks reconciliation',()=>{
  assert.equal(reconcileObservation({...proposal,remainingUsd:0.1},catalog,observation).outcome,'MISMATCH');
  assert.equal(reconcileObservation(proposal,{...catalog,userConfirmed:false},observation).outcome,'MISMATCH');
});

test('even a matching receipt is user-entered evidence, not on-chain verification',()=>{
  const r=reconcileObservation(proposal,catalog,observation);
  assert.notEqual(r.outcome,'VERIFIED');
  assert.equal(r.paymentVerified,false);
});
