import assert from 'node:assert/strict';
import test from 'node:test';
import { proposalDigest, signDecision, verifyDecision } from '../lib/attestation.ts';
import type { AuditAttestation } from '../lib/attestation.ts';

const secret = 'a-long-secret-with-at-least-32-characters-for-hmac-only';
const payload: AuditAttestation['payload'] = {
  requestDigest: proposalDigest({task:'Test one paid API call',cost:0.25}),
  policyVerdict:'REVIEW',
  recommendation:'REVIEW',
  risk:'low',
  model:'a-verified-model-id',
  issuedAt:'2026-11-03T00:00:00.000Z',
  paymentExecuted:false,
};

test('server-signed decision verifies and has no payment claim',()=>{
  const receipt=signDecision(secret,payload);
  assert.equal(receipt.kind,'SPENDPROOF_DECISION_V1');
  assert.equal(verifyDecision(secret,receipt),true);
  assert.equal(receipt.payload.paymentExecuted,false);
});
test('different key and modified conclusion cannot verify',()=>{
  const receipt=signDecision(secret,payload);
  assert.equal(verifyDecision('another-secret-with-more-than-32-characters',receipt),false);
  assert.equal(verifyDecision(secret,{...receipt,payload:{...receipt.payload,risk:'high'}}),false);
  assert.equal(verifyDecision(secret,{...receipt,payload:{...receipt.payload,paymentExecuted:true}}),false);
});
test('malformed signatures are rejected without exceptions',()=>{
  const receipt=signDecision(secret,payload);
  assert.equal(verifyDecision(secret,{...receipt,signature:'xx'}),false);
  assert.equal(verifyDecision('',receipt),false);
  assert.equal(verifyDecision(secret,{}),false);
  assert.equal(verifyDecision(secret,null),false);
});
test('signing refuses weak secrets',()=>{
  assert.throws(()=>signDecision('short',payload),/at least 32/);
});
