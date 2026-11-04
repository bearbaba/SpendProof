#!/usr/bin/env node
/**
 * Production black-box smoke test.
 *
 * Only harmless unauthenticated requests to the fixed SpendProof domain:
 * GET pages + API capability, POST disabled inference, POST disabled signing.
 * NO live SERV calls, secrets, wallet interaction, sessions, or payments.
 *
 * Fails closed if the public demo unexpectedly exposes paid inference.
 */
import assert from 'node:assert/strict';

const origin='https://spendproof.vercel.app';
const context={timeoutMs:10000};
async function request(path,options={}){
  const response=await fetch(new URL(path,origin),{
    ...options,signal:AbortSignal.timeout(context.timeoutMs),
    cache:'no-store',redirect:'manual',
  });
  assert.ok(response.status < 500 || path.includes('/api/'),
    'Unexpected server error on public page: '+path);
  return response;
}
async function json(res) {
  const value=await res.json();
  assert.ok(value && typeof value==='object','Expected JSON object');
  return value;
}

const results=[];
async function check(name,fn) {
  await fn();
  results.push(name);
  console.log('PASS: '+name);
}

try {
  await check('Production Home returns 200 and safe no-wallet walkthrough',async()=>{
    const response=await request('/');
    assert.equal(response.status,200);
    assert.match(response.headers.get('content-type')||'',/text\/html/i);
    const html=await response.text();
    for(const visible of [
      'SpendProof','Try the demo','Within budget','Over spending cap',
      'Missing evidence','Explore SpendProof without a wallet or API key',
      'No automatic transfers',
    ]) {
      assert.ok(html.includes(visible),'Missing public demo cue: '+visible);
    }
    assert.ok(!html.includes('SERV_REASONING_API_KEY'),'Do not disclose server variable names/values in HTML');
  });

  await check('Read-only status is public, uncached and non-secret',async()=>{
    const response=await request('/api/status');
    assert.equal(response.status,200);
    assert.match(response.headers.get('cache-control')||'',/no-store/);
    const status=await json(response);
    assert.equal(status.service,'SpendProof');
    assert.equal(status.policyEngine,'ready');
    assert.equal(status.servMode,'disabled');
    assert.equal(status.serverReviewMaxUsd,1);
    assert.equal(status.paymentExecution,'not-available-in-app');
    assert.equal(status.independentPaymentVerification,false);
    assert.equal(status.kiteMode,'external-cli-only');
  });

  await check('Paid SERV inference remains disabled over real HTTP',async()=>{
    const response=await request('/api/analyze',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({task:'demo request',method:'GET',amountUsd:0.25}),
    });
    assert.equal(response.status,503);
    const body=await json(response);
    assert.equal(body.code,'LIVE_SERV_DISABLED');
  });

  await check('No unconfigured audit signer gives false verification',async()=>{
    const response=await request('/api/verify',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        proposal:{task:'demo'},policy:{verdict:'REVIEW'},
        serv:{risk:'low'},attestation:{signature:'not-a-valid-signature'},
      }),
    });
    assert.equal(response.status,503);
    const body=await json(response);
    assert.equal(body.authentic,false);
  });

  await check('Analyze GET is not a payment or inference operation',async()=>{
    const response=await request('/api/analyze');
    assert.equal(response.status,405);
  });

  await check('Unknown public API path returns 404',async()=>{
    const response=await request('/api/no-such-public-endpoint');
    assert.equal(response.status,404);
  });

  console.log('LIVE_PUBLIC_SMOKE_PASS: '+results.length+' read-only/safe HTTP checks.');
  console.log('External Kite/real SERV/payment/browser interaction not tested.');
}catch(error){
  console.error('LIVE_PUBLIC_SMOKE_FAILED:',error instanceof Error?error.message:String(error));
  process.exitCode=1;
}
