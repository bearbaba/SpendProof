import assert from 'node:assert/strict';
import test from 'node:test';
import { createServGate } from '../lib/serv-guard.ts';

test('SERV gate blocks concurrent paid calls and releases on completion',()=>{
 const gate=createServGate({cooldownMs:1000,dailyLimit:2});
 const first=gate.reserve(10000);
 assert.equal(first.allowed,true);
 assert.deepEqual(gate.reserve(10001),{allowed:false,reason:'BUSY',retryAfterSeconds:5});
 if(first.allowed)first.release();
 assert.deepEqual(gate.reserve(10002),{allowed:false,reason:'COOLDOWN',retryAfterSeconds:1});
});

test('SERV gate enforces per-process daily cap and resets on next day',()=>{
 const gate=createServGate({cooldownMs:1000,dailyLimit:2});
 const first=gate.reserve(10000);
 assert.equal(first.allowed,true);
 if(first.allowed)first.release();
 const second=gate.reserve(12000);
 assert.equal(second.allowed,true);
 if(second.allowed)second.release();
 const denied=gate.reserve(14000);
 assert.equal(denied.allowed,false);
 if(!denied.allowed)assert.equal(denied.reason,'DAILY_LIMIT');
 const next=gate.reserve(10000+86400000);
 assert.equal(next.allowed,true);
 if(next.allowed)next.release();
});

test('repeated release cannot incorrectly unlock another active call',()=>{
 const gate=createServGate({cooldownMs:0,dailyLimit:3});
 const first=gate.reserve(100);
 if(!first.allowed)throw Error('not reserved');
 first.release();
 const second=gate.reserve(101);
 assert.equal(second.allowed,true);
 first.release();
 assert.equal(gate.reserve(102).allowed,false);
 if(second.allowed)second.release();
});

test('limits are fail-closed during cooldown after an upstream error',()=>{
 const gate=createServGate({cooldownMs:15000,dailyLimit:5});
 const first=gate.reserve(0);
 if(!first.allowed)throw Error('not reserved');
 first.release();
 assert.deepEqual(gate.reserve(2000),{allowed:false,reason:'COOLDOWN',retryAfterSeconds:13});
});
