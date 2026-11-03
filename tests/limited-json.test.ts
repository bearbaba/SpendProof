import assert from 'node:assert/strict';
import test from 'node:test';
import { readBoundedJson, BoundedBodyError } from '../lib/limited-json.ts';

const request=(payload:string, headers?:Record<string,string>) =>
  new Request('https://spendproof.example/api/analyze',{method:'POST',headers,body:payload});

test('valid bounded JSON parses without SDK or credentials',async()=>{
  assert.deepEqual(await readBoundedJson(request('{"cost":0.25}'),256),{cost:0.25});
});

test('a large body is rejected even if content-length is missing or deceptive',async()=>{
  const input=request('{"data":"'+'a'.repeat(500)+'"}',{'content-length':'0'});
  await assert.rejects(readBoundedJson(input,120),(e:unknown)=>e instanceof BoundedBodyError && e.status===413);
});

test('oversized declared content-length is rejected before reading',async()=>{
  const input=request('{"ok":true}',{'content-length':'99999'});
  await assert.rejects(readBoundedJson(input,150),(e:unknown)=>e instanceof BoundedBodyError && e.status===413);
});

test('garbled JSON and empty bodies fail closed',async()=>{
  await assert.rejects(readBoundedJson(request('{bad'),128),(e:unknown)=>e instanceof BoundedBodyError && e.status===400);
  await assert.rejects(readBoundedJson(request(''),128),(e:unknown)=>e instanceof BoundedBodyError && e.status===400);
});

test('non-UTF8 bytes cannot be accepted by parser',async()=>{
  const req=new Request('https://spendproof.example/api/analyze',{method:'POST',body:new Uint8Array([0xff,0xfe,0xfd])});
  await assert.rejects(readBoundedJson(req,128),(e:unknown)=>e instanceof BoundedBodyError && e.status===400);
});
