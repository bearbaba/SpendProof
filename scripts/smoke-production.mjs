#!/usr/bin/env node
/**
 * Boot the compiled Next.js application with test-only fake configuration,
 * exercise real HTTP endpoints, then stop it. No SERV credit or Kite payment.
 * Run after 'npm run build': npm run smoke:production
 */
import { spawn } from 'node:child_process';
import { createHash, createHmac } from 'node:crypto';

const port=31341;
const origin='http://127.0.0.1:'+port;
const testSecret='this-is-a-fake-test-only-hmac-key-32-chars-min';
const sentinel='DO_NOT_EXPOSE_THIS_FAKE_SERV_TEST_KEY';
const env={
  ...process.env,
  SPENDPROOF_ENABLE_LIVE_SERV:'false',
  SPENDPROOF_AUDIT_SECRET:testSecret,
  SPENDPROOF_ACCESS_CODE:'this-is-a-fake-local-test-access-code',
  SERV_REASONING_API_KEY:sentinel,
  SERV_MODEL:'test-model-not-available',
  PORT:String(port),
};
const nextBin='node_modules/next/dist/bin/next';
const child=spawn(process.execPath,[nextBin,'start','-p',String(port)],{
  env,stdio:['ignore','pipe','pipe'],
});
let logs='';
for(const stream of [child.stdout,child.stderr]){
  stream.on('data',chunk=>{logs=(logs+String(chunk)).slice(-3000);});
}

async function request(path,options={}){
  return fetch(origin+path,{...options,signal:AbortSignal.timeout(5000),cache:'no-store'});
}
async function ready(){
  for(let n=0;n<100;n++){
    if(child.exitCode!==null)throw Error('Next.js exited before ready.');
    try {
      const res=await request('/api/status');
      if(res.ok)return;
    }catch { /* Server is booting. */ }
    await new Promise(resolve=>setTimeout(resolve,200));
  }
  throw Error('Next.js did not become ready.');
}
function assert(condition,message){
  if(!condition)throw Error('Production smoke assertion: '+message);
}
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
async function post(path,body){
  const response=await request(path,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify(body),
  });
  const json=await response.json();
  return {response,json};
}

try {
  await ready();
  const home=await request('/');
  const html=await home.text();
  assert(home.status===200,'Home must render successfully');
  assert(html.includes('SpendProof'),'Home must contain product title');
  assert(!html.includes(sentinel),'Home must never expose server-side API keys');
  console.log('PASS: public homepage rendered without credentials');

  const status=await request('/api/status');
  const statusJson=await status.json();
  assert(status.status===200,'Status endpoint must respond 200');
  assert(statusJson.servMode==='disabled','Paid SERV inference must default off');
  assert(statusJson.paymentExecution==='not-available-in-app','Kite payments must be outside the app');
  assert(status.headers.get('cache-control')?.includes('no-store'),'Status must be no-store');
  assert(!JSON.stringify(statusJson).includes(sentinel),'Status must not leak server secrets');
  console.log('PASS: truthful status endpoint, no secrets');

  const disabled=await post('/api/analyze',{
    task:'Paid API request',provider:'Weather',endpoint:'https://weather.example.org/api',
    evidenceUrl:'https://weather.example.org/pricing',amountUsd:0.25,budgetUsd:1,
    perTxUsd:0.5,remainingUsd:0.8,supportsX402:true,method:'GET',
  });
  assert(disabled.response.status===503,'Live inference is not allowed when disabled');
  assert(disabled.json.code==='LIVE_SERV_DISABLED','Expected explicit closed-mode response');
  console.log('PASS: server rejects billable SERV calls in demo mode');

  const malformed=await post('/api/verify',{attestation:{signature:'fake'}});
  assert(malformed.response.status===422,'Verification must reject incomplete bundles');
  assert(malformed.json.authentic===false,'Incomplete bundle must not verify');
  console.log('PASS: incomplete signed bundle rejected');

  const proposal={task:'Purchase one data request',endpoint:'https://example.org/api',amountUsd:0.25};
  const policy={verdict:'REVIEW',paymentExecuted:false,checks:[{id:'budget',passed:true}]};
  const serv={summary:'Purchase is within budget but provider is unverified',
    recommendation:'REVIEW',risk:'medium',concerns:[],evidenceGaps:['Provider unverified']};
  const payload={
    requestDigest:digest(proposal),policyDigest:digest(policy),assessmentDigest:digest(serv),
    policyVerdict:'REVIEW',recommendation:'REVIEW',risk:'medium',model:'test-model',
    issuedAt:new Date().toISOString(),paymentExecuted:false,
  };
  const attestation={
    kind:'SPENDPROOF_DECISION_V2',
    algorithm:'HMAC-SHA256',payload,
    signature:createHmac('sha256',testSecret).update(JSON.stringify(payload)).digest('hex'),
  };
  const signed={attestation,proposal,policy,serv};
  const authentic=await post('/api/verify',signed);
  assert(authentic.response.status===200 && authentic.json.authentic===true,
    'Valid V2 decision must verify in production');
  assert(authentic.json.paymentVerified===false && authentic.json.merchantVerified===false,
    'A decision is never payment or merchant proof');
  console.log('PASS: authentic decision verifies, payment stays unverified');

  const tampered=await post('/api/verify',{
    ...signed,serv:{...serv,summary:'The merchant is fully verified.'},
  });
  assert(tampered.response.status===200 && tampered.json.authentic===false,
    'Changed SERV evidence must never verify');
  console.log('PASS: altered reasoning fails production HMAC verification');

  console.log('PRODUCTION_SMOKE_PASS: 6 end-to-end HTTP checks; no SERV or Kite payment initiated.');
}catch(error){
  console.error('PRODUCTION_SMOKE_FAIL:',error instanceof Error?error.message:String(error));
  console.error('Application diagnostic:',logs.replaceAll(sentinel,'[redacted]'));
  process.exitCode=1;
}finally{
  child.kill('SIGTERM');
}
