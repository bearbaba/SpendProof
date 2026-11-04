import { IP402_CATALOG_SERVICE_ID } from './ip402-candidate.ts';

/**
 * Hardcoded read-only Kite command. Never accept caller-supplied executable,
 * flags, URL, HTTP headers, signing material, or payment amount.
 */
export const IP402_CATALOG_READ_ARGS = [
  'services','get','--service-id',IP402_CATALOG_SERVICE_ID,'--output','json',
] as const;

export type CatalogSignals = {
  jsonParsed:boolean;
  expectedServiceIdObserved:boolean;
  expectedDomainObserved:boolean;
  expectedGeoRouteObserved:boolean;
  getMethodObserved:boolean;
  priceTextObserved:boolean;
  manualReviewRequired:true;
};

/**
 * Safe metadata-only check; absence of any flag does not prove the service is
 * invalid, and presence of all flags does not authenticate provider ownership
 * or current pricing. Never print/copy raw catalog stdout or client tokens.
 */
export function summarizeIp402Catalog(raw:unknown):CatalogSignals {
  const summary:CatalogSignals={
    jsonParsed:false,
    expectedServiceIdObserved:false,
    expectedDomainObserved:false,
    expectedGeoRouteObserved:false,
    getMethodObserved:false,
    priceTextObserved:false,
    manualReviewRequired:true,
  };
  if(typeof raw!=='string' || raw.length===0 || raw.length>128_000)return summary;
  try {
    const data:unknown=JSON.parse(raw);
    if(!data || typeof data!=='object')return summary;
    const text=JSON.stringify(data);
    return {
      jsonParsed:true,
      expectedServiceIdObserved:text.includes(IP402_CATALOG_SERVICE_ID),
      expectedDomainObserved:text.toLowerCase().includes('ip402.xyz'),
      expectedGeoRouteObserved:text.includes('/v1/geo'),
      getMethodObserved:/\bGET\b/.test(text),
      priceTextObserved:/\b0[.]01\b/.test(text),
      manualReviewRequired:true,
    };
  }catch{
    return summary;
  }
}
