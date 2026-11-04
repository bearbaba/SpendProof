import { NextRequest, NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'node:crypto';
import { evaluate, validProposal } from '../../../lib/policy';
import { requestServAssessment } from '../../../lib/serv-inference';
import { localServGate } from '../../../lib/serv-guard';
import { readBoundedJson, BoundedBodyError } from '../../../lib/limited-json';

export const runtime = 'nodejs';
export const maxDuration = 25;
const respond = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });

function secretMatches(value: string, expected: string) {
  const a = createHash('sha256').update(value).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  if (process.env.SPENDPROOF_ENABLE_LIVE_SERV !== 'true') {
    return respond({code:'LIVE_SERV_DISABLED',error:'Live paid inference is disabled by default. Enable it explicitly in the server environment.'},503);
  }
  const key = process.env.SERV_REASONING_API_KEY;
  const model = process.env.SERV_MODEL;
  const access = process.env.SPENDPROOF_ACCESS_CODE;
  const auditSecret = process.env.SPENDPROOF_AUDIT_SECRET;
  if (!key || !model || !access || access.length < 16 || !auditSecret || auditSecret.length < 32) {
    return respond({ code: 'NOT_CONFIGURED', error: 'SERV integration is not configured. Set server API key, model, access code and a 32+ character signing secret.' }, 503);
  }
  if (!secretMatches(req.headers.get('x-spendproof-access') || '', access)) {
    return respond({ code: 'UNAUTHORIZED', error: 'Invalid project access code.' }, 401);
  }
  let proposal: unknown;
  try { proposal = await readBoundedJson(req, 6000); }
  catch (error) {
    return respond({
      code: error instanceof BoundedBodyError && error.status === 413 ? 'TOO_LARGE' : 'BAD_JSON',
      error: error instanceof Error ? error.message : 'Invalid request body.',
    }, error instanceof BoundedBodyError ? error.status : 400);
  }
  if (!validProposal(proposal)) return respond({ code: 'INVALID', error: 'Invalid proposal.' }, 422);

  const policy = evaluate(proposal);
  if (policy.verdict === 'BLOCK') {
    return respond({ mode: 'policy', policy, serv: null, paymentExecuted: false });
  }
  // No cross-instance quota is claimed: provider credit limits remain essential.
  const gate = localServGate.reserve();
  if (!gate.allowed) {
    return NextResponse.json({
      code:'SERV_THROTTLED',
      error:'A cooldown, concurrent-request lock or process-local daily limit is active.',
      reason:gate.reason,
      retryAfterSeconds:gate.retryAfterSeconds,
    },{status:429,headers:{'Cache-Control':'no-store','Retry-After':String(gate.retryAfterSeconds)}});
  }
  try {
    const outcome=await requestServAssessment({
      proposal,policy,key,model,auditSecret,
    });
    if(!outcome.ok){
      return respond({
        code:outcome.code,
        error:outcome.error,
        policy,
        ...(outcome.upstreamStatus?{upstreamStatus:outcome.upstreamStatus}:{}),
      },outcome.status);
    }
    return respond(outcome.data);
  }finally{
    gate.release();
  }
}
