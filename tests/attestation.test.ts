import assert from 'node:assert/strict';
import test from 'node:test';
import {
  recordDigest, signDecision, verifyDecision, verifyDecisionBundle,
  type DecisionRecord,
} from '../lib/attestation.ts';

const secret = 'this-test-secret-is-over-32-characters-long';
const proposal = { task:'Make a single weather API purchase', amountUsd:0.25, endpoint:'https://weather.example.org/data' };
const policy = { verdict:'REVIEW', checks:[{ id:'budget', passed:true }], paymentExecuted:false };
const serv = {
  summary:'Budget is acceptable but merchant price has not been verified.',
  risk:'medium',
  recommendation:'REVIEW',
  concerns:['Confirm catalog price'],
  evidenceGaps:['Missing provider proof'],
};
const payload:DecisionRecord['payload'] = {
  requestDigest:recordDigest(proposal),
  policyDigest:recordDigest(policy),
  assessmentDigest:recordDigest(serv),
  policyVerdict:'REVIEW',
  recommendation:'REVIEW',
  risk:'medium',
  model:'model-id-from-SERV',
  issuedAt:'2026-11-03T12:00:00Z',
  paymentExecuted:false,
};
const bundle = () => ({
  attestation:signDecision(secret,payload),
  proposal:structuredClone(proposal),
  policy:structuredClone(policy),
  serv:structuredClone(serv),
});

test('V2 signed bundle authenticates all displayed evidence', () => {
  const original=bundle();
  assert.equal(original.attestation.kind,'SPENDPROOF_DECISION_V2');
  assert.equal(verifyDecision(secret,original.attestation),true);
  assert.deepEqual(verifyDecisionBundle(secret,original),{authentic:true,signatureValid:true,documentIntact:true});
  assert.equal(original.attestation.payload.paymentExecuted,false);
});

test('altered summary is rejected despite intact attestation',()=>{
  const original=bundle();
  original.serv.summary='Fully verified and safe to pay';
  assert.deepEqual(verifyDecisionBundle(secret,original),{authentic:false,signatureValid:true,documentIntact:false});
});

test('altered risk, verdict, evidence and purchase amount are rejected',()=>{
  const cases=[
    { ...bundle(),serv:{...serv,risk:'low'} },
    { ...bundle(),policy:{...policy,verdict:'BLOCK'} },
    { ...bundle(),serv:{...serv,evidenceGaps:[]} },
    { ...bundle(),proposal:{...proposal,amountUsd:0.75} },
  ];
  for(const altered of cases){
    assert.equal(verifyDecisionBundle(secret,altered).authentic,false);
  }
});

test('signature changed or wrong secret never verifies',()=>{
  const original=bundle();
  assert.equal(verifyDecision('wrong-but-long-enough-secret-12345',original.attestation),false);
  assert.equal(verifyDecision(secret,{...original.attestation,signature:'a'.repeat(64)}),false);
});

test('old V1 receipt not accepted as V2',()=>{
  const old={...bundle().attestation,kind:'SPENDPROOF_DECISION_V1'};
  assert.equal(verifyDecision(secret,old),false);
});

test('empty body and malformed data fail closed',()=>{
  assert.equal(verifyDecisionBundle(secret,{attestation:null,proposal:null,policy:null,serv:null}).authentic,false);
  assert.equal(verifyDecisionBundle(secret,{...bundle(),serv:null}).authentic,false);
  assert.equal(verifyDecision(secret,{}),false);
});

test('HMAC secret must be long',()=>{
  assert.throws(()=>signDecision('short',payload),/at least 32/);
});
