import assert from 'node:assert/strict';
import test from 'node:test';
import { buildKiteSteps, evaluateCatalogReview, shellQuote, type CatalogReview } from '../lib/kite.ts';
import type { Proposal } from '../lib/policy.ts';

const proposal: Proposal = {
  task: 'Get fresh Tokyo weather for an agent report',
  provider: 'Weather paid data service',
  endpoint: 'https://api.weather.example.org/current?city=Tokyo',
  evidenceUrl: 'https://weather.example.org/pricing',
  amountUsd: 0.25,
  budgetUsd: 8,
  perTxUsd: 5,
  remainingUsd: 4,
  method: 'GET',
  supportsX402: true,
};
const safety = { allowanceReviewed:true, activeSessionConfirmed:true };
const review: CatalogReview = {
  serviceId: 'catalog-service-123',
  endpoint: proposal.endpoint,
  priceUsd: 0.25,
  userConfirmed: true,
};

test('discovery is always available but payment commands are blocked by default', () => {
  const steps = buildKiteSteps(proposal, {...review,userConfirmed:false}, false);
  assert.ok(steps.find(s => s.id === 'discover')?.command);
  assert.ok(steps.find(s => s.id === 'inspect')?.command);
  for (const id of ['session','approve','execute','activity']) {
    assert.equal(steps.find(s => s.id === id)?.command, null, id);
  }
});

test('manual catalog review alone never authorizes payments without a live SERV assessment', () => {
  const steps = buildKiteSteps(proposal, review, false);
  assert.equal(steps.find(s => s.id === 'execute')?.command, null);
  assert.equal(steps.find(s => s.id === 'session')?.command, null);
});

test('session maximum is one quoted price, not unused budget or remaining allocation', () => {
  const steps = buildKiteSteps(proposal, review, true, safety);
  const command = steps.find(s => s.id === 'session')?.command || '';
  assert.match(command, /--max-amount-per-tx 0\.25\b/);
  assert.match(command, /--max-total-amount 0\.25\b/);
  assert.match(command, /--ttl 15m/);
  assert.doesNotMatch(command, /--max-total-amount (8|4|5)\b/);
  assert.match(steps.find(s => s.id === 'execute')?.command || '', /--method GET/);
});

test('mismatched catalog URL blocks payment even with human claim', () => {
  const checks = evaluateCatalogReview(proposal,{...review,endpoint:'https://other.example.org/api'});
  assert.equal(checks.find(c => c.id === 'catalog_url')?.passed,false);
  assert.equal(buildKiteSteps(proposal,{...review,endpoint:'https://other.example.org/api'},true,safety).find(s=>s.id==='execute')?.command,null);
});

test('price mismatch or fractional cents prevents a payment plan', () => {
  assert.equal(buildKiteSteps(proposal,{...review,priceUsd:0.26},true,safety).find(s=>s.id==='session')?.command,null);
  assert.equal(buildKiteSteps(proposal,{...review,priceUsd:0.251},true,safety).find(s=>s.id==='session')?.command,null);
});

test('invalid or injected service ID disables inspection and execution', () => {
  const checks = evaluateCatalogReview(proposal,{...review,serviceId:'foobar; rm -rf /'});
  assert.equal(checks[0].passed,false);
  const steps = buildKiteSteps(proposal,{...review,serviceId:'foobar; rm -rf /'},true,safety);
  assert.equal(steps.find(s=>s.id==='inspect')?.command,null);
  assert.equal(steps.find(s=>s.id==='execute')?.command,null);
});

test('POST and policy blocked proposals can never get executable commands', () => {
  assert.equal(buildKiteSteps({...proposal,method:'POST'},review,true,safety).find(s=>s.id==='session')?.command,null);
  assert.equal(buildKiteSteps({...proposal,remainingUsd:0.1},review,true,safety).find(s=>s.id==='execute')?.command,null);
});

test('shell quoting prevents apostrophes from exiting one argument', () => {
  assert.equal(shellQuote("Bob's data"),"'Bob'\\''s data'");
  assert.equal(shellQuote("task; echo unsafe"),"'task; echo unsafe'");
});

test('a catalog claim never represents independent backend verification',()=>{
  const checks = evaluateCatalogReview(proposal,review);
  assert.equal(checks.length,5);
  assert.equal(checks.every(c=>c.passed),true);
  assert.equal(buildKiteSteps(proposal,review,true,safety).find(s=>s.id==='activity')?.command, 'kpass activity --limit 20 --output json');
});

test('no allowance acknowledgement disables the priced session and execution by default',()=>{
 const steps=buildKiteSteps(proposal,review,true);
 assert.equal(steps.find(s=>s.id==='session')?.command,null);
 assert.equal(steps.find(s=>s.id==='execute')?.command,null);
 assert.ok(steps.find(s=>s.id==='discover')?.command);
 assert.ok(steps.find(s=>s.id==='activity')?.command);
});

test('reviewing allowance permits session request but not execution until active session checked',()=>{
 const steps=buildKiteSteps(proposal,review,true,{allowanceReviewed:true,activeSessionConfirmed:false});
 assert.match(steps.find(s=>s.id==='session')?.command||'',/--max-total-amount 0\\.25/);
 assert.match(steps.find(s=>s.id==='activate')?.command||'',/agent:session use --session-id/);
 assert.match(steps.find(s=>s.id==='check_active')?.command||'',/agent:session list --status active/);
 assert.equal(steps.find(s=>s.id==='execute')?.command,null);
});

test('active session confirmation alone is insufficient if allowance risks were not reviewed',()=>{
 const steps=buildKiteSteps(proposal,review,true,{allowanceReviewed:false,activeSessionConfirmed:true});
 assert.equal(steps.find(s=>s.id==='session')?.command,null);
 assert.equal(steps.find(s=>s.id==='execute')?.command,null);
});

test('all safety confirmations unlock only an external CLI command',()=>{
 const steps=buildKiteSteps(proposal,review,true,safety);
 assert.match(steps.find(s=>s.id==='execute')?.command||'',/agent:session execute/);
 assert.ok(steps.find(s=>s.id==='execute')?.description.includes('allowance'));
});
