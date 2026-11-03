import assert from 'node:assert/strict';
import test from 'node:test';
import { cents, evaluate, safeHttps, validProposal, type Proposal } from '../lib/policy.ts';

const base: Proposal = {
 task:'Retrieve one weather dataset for Tokyo', provider:'Weather API',
 endpoint:'https://api.weather.example.org/current', evidenceUrl:'https://weather.example.org/pricing',
 amountUsd:0.25, budgetUsd:1, perTxUsd:0.5, remainingUsd:0.75,
 supportsX402:true, method:'GET',
};
test('passable proposal remains REVIEW and never claims payment', () => {
 const d=evaluate(base);assert.equal(d.verdict,'REVIEW');assert.equal(d.paymentExecuted,false);
});
test('budget, per transaction ceiling, and remaining balance independently block overspend',()=>{
 assert.equal(evaluate({...base,amountUsd:1.01}).verdict,'BLOCK');
 assert.equal(evaluate({...base,amountUsd:0.51}).verdict,'BLOCK');
 assert.equal(evaluate({...base,remainingUsd:0.1}).verdict,'BLOCK');
});
test('a missing evidence URL or unsupported x402 claim blocks',()=>{
 assert.equal(evaluate({...base,evidenceUrl:''}).verdict,'BLOCK');
 assert.equal(evaluate({...base,supportsX402:false}).verdict,'BLOCK');
});
test('unsafe urls are rejected without network calls',()=>{
 for(const url of ['http://example.com','https://localhost/api','https://127.0.0.1/foo','https://10.0.0.1','https://192.168.1.1','https://service.internal','https://user:pass@example.org/']) assert.equal(safeHttps(url),false,url);
 assert.equal(safeHttps('https://api.example.org/data'),true);
});
test('amounts must have cent precision and remain positive',()=>{
 for(const n of [0,-1,0.001,Infinity,NaN]) assert.equal(cents(n),null);
 assert.equal(cents(0.25),25);
});
test('malformed inputs fail schema guard',()=>{
 assert.equal(validProposal(base),true);
 assert.equal(validProposal({...base,method:'DELETE'}),false);
 assert.equal(validProposal({...base,amountUsd:'1'}),false);
 assert.equal(validProposal({...base,task:'x'.repeat(701)}),false);
});
