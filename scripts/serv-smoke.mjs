import { parseServAssessment } from '../lib/serv.ts';

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
        max_tokens:400,
        messages:[
          {role:'system',content:'Return ONLY valid JSON with keys summary (string), risk (low|medium|high), concerns (array of strings), evidenceGaps (array of strings), recommendation (REVIEW|DENY). Never claim payment executed.'},
          {role:'user',content:'An agent proposes paying $0.25 for a weather API with task budget $1, but the merchant price and x402 compatibility have not been independently verified. Review the risks.'},
        ],
      }),
      signal:AbortSignal.timeout(20000),
      cache:'no-store',
    });
    if(!response.ok){
      console.error('SERV_UPSTREAM_ERROR:',response.status,'. Check model, API key and credits.');
      process.exitCode=1;
    }else{
      const result=await response.json();
      const raw=result?.choices?.[0]?.message?.content;
      if(typeof raw!=='string')throw Error('SERV response has no text content');
      const parsed=parseServAssessment(raw);
      console.log(JSON.stringify({
        status:'SERV_LIVE_RESPONSE_VALID',
        model:result.model||model,
        latencyMs:Date.now()-started,
        assessment:parsed,
        tokens:result.usage?{prompt:result.usage.prompt_tokens,completion:result.usage.completion_tokens}:null,
        paymentExecuted:false,
      },null,2));
    }
  }catch(err){
    console.error('SERV_SMOKE_FAILED:',err instanceof Error?err.message:'Unknown network or parsing error');
    process.exitCode=1;
  }
}
