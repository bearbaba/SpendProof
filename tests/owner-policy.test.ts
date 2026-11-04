import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateSignedPolicy, resolveOwnerCeilingCents } from '../lib/owner-policy.ts';
import type { Proposal } from '../lib/policy.ts';

const intent:Proposal={
  task:'One paid weather data request for my agent',
  provider:'Weather demo',
  endpoint:'https://weather.example.org/data',
  evidenceUrl:'https://weather.example.org/pricing',
  method:'GET',supportsX402:true,
  amountUsd:0.25,budgetUsd:10,perTxUsd:9,remainingUsd:8,
};

test('safe default server decision limit is 1 USDC when not configured',()=>{
  assert.equal(resolveOwnerCeilingCents(undefined),100);
  assert.equal(resolveOwnerCeilingCents(''),100);
  assert.equal(resolveOwnerCeilingCents('1.50'),150);
  assert.equal(resolveOwnerCeilingCents('100'),10000);
});

test('invalid, fractional-cent and unreasonable server limits fail closed',()=>{
  for(const raw of ['-1','0','NaN','Infinity','100.01','1000','0.0001','garbage']){
    assert.equal(resolveOwnerCeilingCents(raw),null,raw);
  }
});

test('signed decisions include owner ceiling as a ninth trusted policy check',()=>{
  const policy=evaluateSignedPolicy(intent,100,'2026-11-04T00:00:00Z');
  assert.equal(policy.verdict,'REVIEW');
  assert.equal(policy.checks.length,9);
  assert.equal(policy.checks.find(c=>c.id==='owner_ceiling')?.passed,true);
  assert.equal(policy.paymentExecuted,false);
});

test('raising client-supplied budgets does not bypass server hard cap',()=>{
  const proposal={...intent,amountUsd:2,budgetUsd:100,perTxUsd:100,remainingUsd:100};
  const policy=evaluateSignedPolicy(proposal,100);
  assert.equal(policy.verdict,'BLOCK');
  assert.equal(policy.checks.find(c=>c.id==='owner_ceiling')?.passed,false);
  assert.ok(policy.reasons.includes('Server-controlled single-purchase ceiling'));
});

test('server misconfiguration never authorizes a purchase',()=>{
  for(const invalid of [-1,0,10001,10.5]){
    const policy=evaluateSignedPolicy(intent,invalid);
    assert.equal(policy.verdict,'BLOCK');
  }
});

test('server cap does not override an already failed local spending policy',()=>{
  const policy=evaluateSignedPolicy({...intent,remainingUsd:0.01},100);
  assert.equal(policy.verdict,'BLOCK');
  assert.equal(policy.checks.find(c=>c.id==='owner_ceiling')?.passed,true);
  assert.ok(policy.reasons.includes('Within remaining allocation'));
});
