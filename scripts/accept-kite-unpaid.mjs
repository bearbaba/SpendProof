#!/usr/bin/env node
/**
 * Zero-payment Kite IP402 readiness snapshot.
 * The ONLY CLI subcommand used is ksearch services get (catalog metadata).
 * The ONLY network request is an unauthenticated GET with redirect disabled.
 * No login, wallet, spending session, SERV model call or transaction is made.
 * No raw catalog response (may contain unexpected data) is printed.
 */
import { spawnSync } from 'node:child_process';
import { kiteExecutableForPlatform } from '../lib/kite-preflight.ts';
import { IP402_CATALOG_READ_ARGS, summarizeIp402Catalog } from '../lib/kite-readonly.ts';
import {
  IP402_GEO_ENDPOINT, IP402_CATALOG_SERVICE_ID,
  inspectIp402PaymentRequired,
} from '../lib/ip402-candidate.ts';

const readOnly={
  catalogServiceId:IP402_CATALOG_SERVICE_ID,
  catalogLookup:'NOT_CHECKED',
  catalogSignals:null,
  quoteStatus:'NOT_CHECKED',
  quote:null,
  freshAt:new Date().toISOString(),
  providerAuthenticated:false,
  walletBalanceVerified:false,
  allowanceReviewed:false,
  sessionApproved:false,
  paidRequestAttempted:false,
  paymentExecuted:false,
  readyForPayment:false,
};

try {
  const cli=spawnSync(
    kiteExecutableForPlatform('ksearch',process.platform),
    [...IP402_CATALOG_READ_ARGS],
    {encoding:'utf8',timeout:12_000,maxBuffer:128_000,windowsHide:true,shell:false},
  );
  if(cli.error || cli.status!==0) {
    readOnly.catalogLookup='CLI_UNAVAILABLE_OR_FAILED';
  }else{
    const signals=summarizeIp402Catalog(cli.stdout);
    readOnly.catalogSignals=signals;
    readOnly.catalogLookup=signals.jsonParsed?'CATALOG_JSON_OBSERVED':'UNEXPECTED_CATALOG_OUTPUT';
  }
}catch{
  readOnly.catalogLookup='CLI_UNAVAILABLE_OR_FAILED';
}

try {
  const response=await fetch(IP402_GEO_ENDPOINT,{
    method:'GET',redirect:'manual',cache:'no-store',
    headers:{Accept:'application/json'},
    signal:AbortSignal.timeout(15_000),
  });
  if(response.status!==402) {
    readOnly.quoteStatus='UNEXPECTED_HTTP_STATUS_'+response.status;
  }else {
    try {
      const q=inspectIp402PaymentRequired(response.headers.get('payment-required'));
      readOnly.quoteStatus='BASE_USDC_0_01_CHALLENGE_CONFIRMED';
      readOnly.quote={
        network:q.network,asset:q.asset,quotedUsdc:q.quotedUsdc,
        quotedBaseUnits:q.quotedBaseUnits,protocol:q.protocol,
      };
    }catch{
      readOnly.quoteStatus='CHALLENGE_INVALID_OR_PRICE_CHANGED';
    }
  }
}catch{
  readOnly.quoteStatus='QUOTE_NETWORK_FAILED';
}

const passed=readOnly.catalogLookup==='CATALOG_JSON_OBSERVED' &&
  readOnly.catalogSignals?.expectedServiceIdObserved===true &&
  readOnly.catalogSignals?.expectedDomainObserved===true &&
  readOnly.quoteStatus==='BASE_USDC_0_01_CHALLENGE_CONFIRMED';

console.log(JSON.stringify({
  status:passed?'KITE_UNPAID_READINESS_PASS':'KITE_UNPAID_REVIEW_REQUIRED',
  ...readOnly,
  meaning:'Read-only catalog metadata and HTTP 402 challenge only. This does not authorize or execute a charge.',
  next:'Manually review live Kite catalog, account allowance, wallet balance, current fees and a newly signed SERV decision before requesting a passkey-approved 0.01 USDC session.',
},null,2));
if(!passed)process.exitCode=1;
