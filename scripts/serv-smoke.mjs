import { parseServAssessment, SERV_RESPONSE_FORMAT } from '../lib/serv.ts';

// Exactly one potentially billable SERV call. Never retry automatically.
// Never print credentials, upstream raw model output, or request headers.
const apiKey=process.env.SERV_REASONING_API_KEY;
const model=process.env.SERV_MODEL;
if(!apiKey || !model){
  console.error('NOT_CONFIGURED: set SERV_REASONING_API_KEY and SERV_MODEL in .env.local.');
  process.exitCode=2;
}else{
  const started=Date.now();
  try {
    const response=await fetch('https://inference-api.openserv.ai/v1/chat/completions',{
      method:'POST',
      headers:{Authorization:'Bearer '+apiKey,'Content-Type':'application/json'},
      body:JSON.stringify({
        model,
        temperature:0.1,
        max_completion_tokens:1200,
        response_format:SERV_RESPONSE_FORMAT,
        messages:[
          {role:'system',content:'You are the SpendProof purchase-risk reviewer. Return ONLY one JSON object strictly matching the supplied spendproof_risk_review_v1 JSON Schema. All five named fields are required. summary must be one useful sentence of 8 to 600 characters; risk must be exactly low, medium, or high; concerns and evidenceGaps must be arrays of up to eight short nonempty strings (use [] if empty); recommendation must be exactly REVIEW or DENY. Do not approve payments or claim merchant, cost, protocol support or settlement are independently verified.'},
          {role:'user',content:'Review an unpaid API purchase candidate: GET https://ip402.xyz/v1/geo?ip=8.8.8.8&payment_protocol=x402&payment_network=base. A read-only Kite catalog quote and an HTTP 402 challenge on 2026-11-04 indicated a price of 0.01 USDC on Base. These observations may be stale and the provider, endpoint, current cost, funds and payment success are not independently verified. Task budget 1.00 USD, transaction ceiling 0.01 USD. Give a short risk review in JSON.'},
        ],
      }),
      signal:AbortSignal.timeout(20000),
      cache:'no-store',
    });
    if(!response.ok){
      console.error('SERV_UPSTREAM_ERROR:',JSON.stringify({httpStatus:response.status,reason:'Check model compatibility, API key, account credits or request format. No retry performed.'}));
      process.exitCode=1;
    }else{
      const result=await response.json();
      const choice=result?.choices?.[0];
      const raw=choice?.message?.content;
      const finish=choice?.finish_reason;
      // Only coarse diagnostics are printed: never print model text or secrets.
      const context={
        finishReason:typeof finish==='string'?finish:'unknown',
        contentChars:typeof raw==='string'?raw.length:0,
        completionTokens:Number.isInteger(result?.usage?.completion_tokens)?result.usage.completion_tokens:null,
        paymentExecuted:false,
      };
      if(finish!==null && finish!==undefined && finish!=='stop'){
        console.error('SERV_OUTPUT_INCOMPLETE:',JSON.stringify({...context,reason:'Non-final completion; no decision accepted.'}));
        process.exitCode=1;
      }else if(typeof raw!=='string' || raw.trim().length===0){
        console.error('SERV_OUTPUT_EMPTY:',JSON.stringify({...context,reason:'No review text returned.'}));
        process.exitCode=1;
      }else{
        let parsed;
        try { parsed=parseServAssessment(raw); }
        catch(err){
          console.error('SERV_OUTPUT_INVALID:',JSON.stringify({
            ...context,
            reason:err instanceof Error?err.message:'Invalid JSON decision.',
          }));
          process.exitCode=1;
        }
        if(parsed){
          console.log(JSON.stringify({
            status:'SERV_LIVE_RESPONSE_VALID',
            model:result.model||model,
            latencyMs:Date.now()-started,
            assessment:parsed,
            tokens:result.usage?{prompt:result.usage.prompt_tokens,completion:result.usage.completion_tokens}:null,
            paymentExecuted:false,
          },null,2));
        }
      }
    }
  }catch(err){
    // Avoid raw response bodies and stack traces (may contain untrusted content).
    console.error('SERV_SMOKE_FAILED:',err instanceof SyntaxError?'SERV returned invalid HTTP JSON':err instanceof Error?err.name:'Unknown network error');
    process.exitCode=1;
  }
}
