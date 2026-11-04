import type { Proposal } from './policy.ts';

export const IP402_CATALOG_SERVICE_ID='2a41b31ec8665c50f49098a7';
export const IP402_GEO_ENDPOINT='https://ip402.xyz/v1/geo?ip=8.8.8.8&payment_protocol=x402&payment_network=base';
export const IP402_BASE_USDC='0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
export const IP402_BASE_CAIP2='eip155:8453';
export const IP402_MAX_QUOTED_USDC=0.01;

/**
 * This is a candidate from the real Kite catalog, NOT an authenticated purchase,
 * a provider partnership, or an automatically verified quote. The operator
 * must inspect the fresh HTTP 402 challenge before using a spending session.
 */
export const ip402Candidate:Proposal={
  task:'Look up GeoIP and ASN information for the public example IP 8.8.8.8.',
  provider:'IP402 (real catalog candidate; unpaid)',
  endpoint:IP402_GEO_ENDPOINT,
  evidenceUrl:'https://ip402.xyz/',
  amountUsd:IP402_MAX_QUOTED_USDC,
  budgetUsd:IP402_MAX_QUOTED_USDC,
  perTxUsd:IP402_MAX_QUOTED_USDC,
  remainingUsd:IP402_MAX_QUOTED_USDC,
  method:'GET',
  supportsX402:true,
};

export type Ip402Quote={
  protocol:'x402-v2';
  endpoint:'https://ip402.xyz/v1/geo';
  network:'eip155:8453';
  asset:string;
  quotedUsdc:0.01;
  quotedBaseUnits:'10000';
  paymentExecuted:false;
};

const REQUIRED_AMOUNT='10000';

/**
 * Read-only parser: rejects missing/malformed/changing challenges and searches
 * for the Base USDC option rather than assuming the first advertised chain.
 * Never consumes payment credentials or builds a signed payload.
 */
export function inspectIp402PaymentRequired(header:unknown):Ip402Quote {
  if(typeof header!=='string' || header.length===0 || header.length>24000 ||
     !/^[A-Za-z0-9_-]+={0,2}$/.test(header)) {
    throw Error('Missing or malformed HTTP Payment-Required challenge.');
  }
  let decoded:unknown;
  try {
    decoded=JSON.parse(Buffer.from(header,'base64url').toString('utf8'));
  }catch{
    throw Error('Could not decode HTTP x402 challenge.');
  }
  if(!decoded || typeof decoded!=='object')throw Error('Invalid x402 challenge format.');
  const x=decoded as Record<string,unknown>;
  if(x.x402Version!==2)throw Error('Unsupported x402 challenge version.');
  const resource=x.resource;
  if(!resource || typeof resource!=='object' ||
     (resource as Record<string,unknown>).url!=='https://ip402.xyz/v1/geo') {
    throw Error('The challenge refers to a different resource.');
  }
  if(!Array.isArray(x.accepts))throw Error('No accepted payment options.');
  const baseOptions=x.accepts.filter((item):item is Record<string,unknown>=>
    item!==null && typeof item==='object' && !Array.isArray(item) &&
    (item as Record<string,unknown>).scheme==='exact' &&
    (item as Record<string,unknown>).network===IP402_BASE_CAIP2 &&
    typeof (item as Record<string,unknown>).asset==='string' &&
    ((item as Record<string,unknown>).asset as string).toLowerCase()===IP402_BASE_USDC.toLowerCase()
  );
  if(baseOptions.length!==1)throw Error('Expected exactly one Base USDC x402 quote.');
  if(baseOptions[0].amount!==REQUIRED_AMOUNT){
    throw Error('Base USDC price changed; refuse to use this sample amount.');
  }
  return {
    protocol:'x402-v2',
    endpoint:'https://ip402.xyz/v1/geo',
    network:IP402_BASE_CAIP2,
    asset:IP402_BASE_USDC,
    quotedUsdc:0.01,
    quotedBaseUnits:'10000',
    paymentExecuted:false,
  };
}
