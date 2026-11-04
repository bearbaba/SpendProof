#!/usr/bin/env node
/**
 * Read-only HTTP 402 inspection. Sends no payment credentials and never calls
 * Kite execute, SERV, WalletConnect, or any blockchain transaction endpoint.
 */
import { IP402_GEO_ENDPOINT,inspectIp402PaymentRequired } from '../lib/ip402-candidate.ts';

try {
  const response=await fetch(IP402_GEO_ENDPOINT,{
    method:'GET',
    cache:'no-store',
    redirect:'manual',
    headers:{'Accept':'application/json'},
    signal:AbortSignal.timeout(15_000),
  });
  if(response.status!==402)throw Error('Expected HTTP 402, got HTTP '+response.status);
  const quote=inspectIp402PaymentRequired(response.headers.get('payment-required'));
  console.log(JSON.stringify({
    service:'IP402',
    checkedAt:new Date().toISOString(),
    requestedUrl:IP402_GEO_ENDPOINT,
    httpStatus:402,
    ...quote,
    approvalGranted:false,
    liveServReviewed:false,
    status:'READ_ONLY_QUOTE_CONFIRMED',
    warning:'No payment has been attempted. The HTTP quote may change or expire. Inspect allowance and fees before any approved Kite request.',
  },null,2));
}catch(error){
  console.error('IP402_INSPECTION_REQUIRED:',error instanceof Error?error.message:String(error));
  process.exitCode=1;
}
