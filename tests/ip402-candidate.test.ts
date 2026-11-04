import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluate } from '../lib/policy.ts';
import { buildKiteSteps,defaultKiteSafety,evaluateCatalogReview } from '../lib/kite.ts';
import {
  ip402Candidate,inspectIp402PaymentRequired,
  IP402_CATALOG_SERVICE_ID,IP402_BASE_USDC,IP402_BASE_CAIP2
} from '../lib/ip402-candidate.ts';

const quote={
  x402Version:2,
  resource:{url:'https://ip402.xyz/v1/geo'},
  accepts:[
    {scheme:'exact',network:'eip155:137',asset:'0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',amount:'10000'},
    {scheme:'exact',network:IP402_BASE_CAIP2,asset:IP402_BASE_USDC,amount:'10000'},
  ],
};
function encode(v:unknown){return Buffer.from(JSON.stringify(v)).toString('base64url');}

test('IP402 is a real-catalog candidate only: GET, HTTPS, capped at one cent',()=>{
  assert.match(ip402Candidate.endpoint,/^https:\/\/ip402\.xyz\/v1\/geo\?ip=8\.8\.8\.8/);
  assert.equal(ip402Candidate.method,'GET');
  assert.equal(ip402Candidate.amountUsd,0.01);
  assert.equal(ip402Candidate.perTxUsd,0.01);
  assert.equal(ip402Candidate.remainingUsd,0.01);
  assert.equal(evaluate(ip402Candidate).verdict,'REVIEW');
});

test('HTTP 402 challenge selects the one Base USDC 0.01 quote',()=>{
  const result=inspectIp402PaymentRequired(encode(quote));
  assert.equal(result.protocol,'x402-v2');
  assert.equal(result.network,'eip155:8453');
  assert.equal(result.quotedUsdc,0.01);
  assert.equal(result.paymentExecuted,false);
});

test('Changed price, wrong resource, other network, duplicate Base option and bad headers fail closed',()=>{
  const altered=(changes:Record<string,unknown>)=>encode({...quote,...changes});
  assert.throws(()=>inspectIp402PaymentRequired(altered({resource:{url:'https://example.com/v1/geo'}})),/different resource/);
  assert.throws(()=>inspectIp402PaymentRequired(altered({accepts:[{...quote.accepts[1],amount:'20000'}]})),/price changed/);
  assert.throws(()=>inspectIp402PaymentRequired(altered({accepts:[quote.accepts[0]]})),/exactly one/);
  assert.throws(()=>inspectIp402PaymentRequired(altered({accepts:[quote.accepts[1],quote.accepts[1]]})),/exactly one/);
  assert.throws(()=>inspectIp402PaymentRequired(altered({x402Version:1})),/Unsupported/);
  assert.throws(()=>inspectIp402PaymentRequired('not-base64!'),/malformed/);
});

test('Read-only candidate never unlocks session or paid command by itself',()=>{
  const review={
    serviceId:IP402_CATALOG_SERVICE_ID,
    endpoint:ip402Candidate.endpoint,
    priceUsd:0.01,userConfirmed:false,
  };
  assert.equal(evaluateCatalogReview(ip402Candidate,review).at(-1)?.passed,true);
  assert.equal(evaluateCatalogReview(ip402Candidate,review).find(x=>x.id==='manual_confirm')?.passed,false);
  const steps=buildKiteSteps(ip402Candidate,{...review,userConfirmed:true},false,defaultKiteSafety);
  assert.equal(steps.find(x=>x.id==='session')?.command,null);
  assert.equal(steps.find(x=>x.id==='execute')?.command,null);
});
