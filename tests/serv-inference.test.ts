import assert from 'node:assert/strict';
import test from 'node:test';
import { requestServAssessment, SERV_ENDPOINT } from '../lib/serv-inference.ts';
import { verifyDecisionBundle } from '../lib/attestation.ts';
import { evaluate, type Proposal } from '../lib/policy.ts';
import { evaluateSignedPolicy } from '../lib/owner-policy.ts';

const proposal:Proposal={
  task:'Purchase one weather observation for a travel agent',
  provider:'Sample Weather Provider',
  endpoint:'https://weather.example.org/forecast',
  evidenceUrl:'https://weather.example.org/pricing',
  method:'GET',supportsX402:true,
  amountUsd:0.25,budgetUsd:1,perTxUsd:0.5,remainingUsd:0.75,
};
const secret='audit-secret-with-more-than-thirty-two-characters';
const assessment={
  summary:'The amount fits the cap, but the merchant and x402 price need catalog verification.',
  risk:'medium',recommendation:'REVIEW',
  concerns:['Unconfirmed merchant'],evidenceGaps:['Independent catalog inspection required'],
};
const result=(data:Record<string,unknown>=assessment)=>({
  model:'serv-test-model',
  choices:[{message:{content:JSON.stringify(data)},finish_reason:'stop'}],
  usage:{prompt_tokens:125,completion_tokens:70},
});
const originalPolicy=evaluateSignedPolicy(proposal,100,'2026-11-04T00:00:00.000Z');
const args={proposal,policy:originalPolicy,key:'private-serv-key-for-tests',model:'serv-test-model',auditSecret:secret};

test('one server-only SERV request signs complete output, not a payment receipt',async()=>{
  let called=0;
  const fetcher=(async(url:RequestInfo|URL,init?:RequestInit)=>{
    called+=1;
    assert.equal(String(url),SERV_ENDPOINT);
    assert.equal(init?.method,'POST');
    assert.equal((init?.headers as Record<string,string>).Authorization,'Bearer private-serv-key-for-tests');
    const body=JSON.parse(String(init?.body));
    assert.equal(body.model,'serv-test-model');
    assert.equal(body.messages.length,2);
    assert.equal(body.messages[1].role,'user');
    return new Response(JSON.stringify(result()),{status:200});
  }) as typeof fetch;
  const response=await requestServAssessment({...args,fetcher});
  assert.equal(called,1);
  assert.equal(response.ok,true);
  if(!response.ok)throw Error('unexpected SERV error');
  assert.equal(response.data.mode,'serv-live');
  assert.equal(response.data.serv.recommendation,'REVIEW');
  assert.equal(response.data.paymentExecuted,false);
  assert.equal(response.data.usage?.promptTokens,125);
  assert.equal(JSON.stringify(response.data).includes(args.key),false);
  assert.equal(verifyDecisionBundle(secret,{
    proposal,policy:response.data.policy,serv:response.data.serv,attestation:response.data.attestation,
  }).authentic,true);
});

test('missing server-owned ceiling check cannot be used to sign any decision',async()=>{
  let calls=0;
  const response=await requestServAssessment({
    ...args,
    policy:evaluate(proposal),
    fetcher:(async()=>{calls++;throw Error('should not call provider');}) as typeof fetch,
  });
  assert.equal(response.ok,false);
  assert.equal(calls,0);
});

test('a blocked spending proposal never sends billable SERV traffic',async()=>{
  let calls=0;
  const blocked={...proposal,amountUsd:10};
  const fetched=(async()=>{calls++;throw Error('should not happen');}) as typeof fetch;
  const response=await requestServAssessment({
    ...args,proposal:blocked,policy:evaluateSignedPolicy(blocked,100),fetcher:fetched,
  });
  assert.equal(response.ok,false);
  assert.equal(calls,0);
});

test('upstream unauthorized, out of credits or transient failure cannot create a signed record',async()=>{
  for(const status of [401,402,429,500]){
    const response=await requestServAssessment({
      ...args,fetcher:(async()=>new Response('{}',{status})) as typeof fetch,
    });
    assert.equal(response.ok,false);
    if(!response.ok){
      assert.equal(response.code,'SERV_UPSTREAM');
      assert.equal(response.upstreamStatus,status);
    }
  }
});

test('incomplete model output is not treated as an approved review',async()=>{
  const response=await requestServAssessment({
    ...args,
    fetcher:(async()=>new Response(JSON.stringify({
      ...result(),choices:[{message:{content:JSON.stringify(assessment)},finish_reason:'length'}],
    }),{status:200})) as typeof fetch,
  });
  assert.equal(response.ok,false);
  if(!response.ok)assert.equal(response.code,'SERV_INCOMPLETE');
});

test('invalid schema, missing fields, invalid JSON and huge responses fail closed',async()=>{
  for(const body of [
    JSON.stringify(result({...assessment,recommendation:'APPROVE'})),
    JSON.stringify(result({...assessment,risk:'none'})),
    JSON.stringify({choices:[{message:{},finish_reason:'stop'}]}),
    'not-json',
    'x'.repeat(50000),
  ]){
    const response=await requestServAssessment({
      ...args,fetcher:(async()=>new Response(body,{status:200})) as typeof fetch,
    });
    assert.equal(response.ok,false);
  }
});

test('DENY is a valid signed result but never authorizes payment',async()=>{
  const denied={...assessment,recommendation:'DENY',risk:'high'};
  const response=await requestServAssessment({
    ...args,fetcher:(async()=>new Response(JSON.stringify(result(denied)),{status:200})) as typeof fetch,
  });
  assert.equal(response.ok,true);
  if(!response.ok)throw Error('unexpected');
  assert.equal(response.data.serv.recommendation,'DENY');
  assert.equal(response.data.attestation.payload.recommendation,'DENY');
  assert.equal(response.data.paymentExecuted,false);
});

test('network rejection is mapped to an unambiguous error with no second attempt',async()=>{
  let calls=0;
  const response=await requestServAssessment({
    ...args,fetcher:(async()=>{calls++;throw Error('socket closed');}) as typeof fetch,
  });
  assert.equal(calls,1);
  assert.equal(response.ok,false);
  if(!response.ok)assert.equal(response.code,'SERV_NETWORK');
});

test('untrusted usage metrics are not printed as valid usage or used for billing decisions',async()=>{
  const fake={...result(),usage:{prompt_tokens:'4',completion_tokens:-5}};
  const response=await requestServAssessment({
    ...args,fetcher:(async()=>new Response(JSON.stringify(fake),{status:200})) as typeof fetch,
  });
  assert.equal(response.ok,true);
  if(response.ok)assert.equal(response.data.usage,null);
});
