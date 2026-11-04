import assert from 'node:assert/strict';
import test from 'node:test';
import {IP402_CATALOG_READ_ARGS,summarizeIp402Catalog} from '../lib/kite-readonly.ts';
import {IP402_CATALOG_SERVICE_ID} from '../lib/ip402-candidate.ts';

test('Kite catalog probe is pinned to one safe read-only lookup',()=>{
  assert.deepEqual([...IP402_CATALOG_READ_ARGS],[
    'services','get','--service-id',IP402_CATALOG_SERVICE_ID,'--output','json',
  ]);
  for(const forbidden of ['execute','create','use','send','login','agent:session','--token']){
    assert.equal(IP402_CATALOG_READ_ARGS.includes(forbidden as never),false);
  }
});

test('Kite catalog response yields metadata-only signals, never payment verification',()=>{
  const raw=JSON.stringify({
    service:{id:IP402_CATALOG_SERVICE_ID,name:'IP402',url:'https://ip402.xyz',
      endpoints:[{path:'/v1/geo',method:'GET',price:'0.01 USDC'}]},
  });
  assert.deepEqual(summarizeIp402Catalog(raw),{
    jsonParsed:true,expectedServiceIdObserved:true,expectedDomainObserved:true,
    expectedGeoRouteObserved:true,getMethodObserved:true,priceTextObserved:true,
    manualReviewRequired:true,
  });
});

test('Catalog metadata cannot itself authenticate ownership or approve spending',()=>{
  const result=summarizeIp402Catalog(JSON.stringify({
    id:IP402_CATALOG_SERVICE_ID,site:'https://ip402.xyz',
  }));
  assert.equal(result.expectedGeoRouteObserved,false);
  assert.equal(result.priceTextObserved,false);
  assert.equal(result.manualReviewRequired,true);
});

test('Untrusted, oversized and private catalog contents stay out of output signals',()=>{
  const secret='NEVER-PRINT-A-CLI-TOKEN';
  for(const input of [null,'not-json',JSON.stringify({secret}), 'x'.repeat(128001)]){
    const result=summarizeIp402Catalog(input);
    assert.equal(result.manualReviewRequired,true);
    assert.equal(JSON.stringify(result).includes(secret),false);
  }
});
