import assert from 'node:assert/strict';
import test from 'node:test';
import {spawnSync} from 'node:child_process';

const secret='LOCAL-TEST-KEY-NEVER-SHOW-IN-LOGS';
const env={
  ...process.env,
  SERV_REASONING_API_KEY:secret,
  SERV_MODEL:'gemini-3.1-flash-lite',
  SPENDPROOF_ACCESS_CODE:'test-only-access-code-not-live',
  SPENDPROOF_AUDIT_SECRET:'test-only-very-long-audit-secret-for-acceptance',
  SPENDPROOF_MAX_SIGNED_TX_USD:'0.01',
  SPENDPROOF_ENABLE_LIVE_SERV:'false',
};

function run(args:string[],override:Record<string,string>={}){
  return spawnSync(process.execPath,['--experimental-strip-types','scripts/accept-serv-signed.mjs',...args],{
    cwd:process.cwd(),env:{...env,...override},encoding:'utf8',timeout:20_000,
  });
}

test('signed SERV acceptance defaults to free offline preflight, without leaking keys',()=>{
  const result=run([]);
  assert.equal(result.status,0,result.stderr);
  assert.match(result.stdout,/SERV_SIGNED_PREFLIGHT_PASS/);
  assert.match(result.stdout,/"paidRequestSent": false/);
  assert.doesNotMatch(result.stdout+result.stderr,/LOCAL-TEST-KEY-NEVER-SHOW-IN-LOGS/);
});

test('invalid 0.01 USD owner ceiling fails before any billable request',()=>{
  const result=run([], {SPENDPROOF_MAX_SIGNED_TX_USD:'1.00'});
  assert.equal(result.status,2);
  assert.match(result.stderr,/SERV_SIGNED_PREFLIGHT_FAILED/);
  assert.match(result.stderr,/paidRequestSent":false/);
  assert.doesNotMatch(result.stderr, /LOCAL-TEST-KEY-NEVER-SHOW-IN-LOGS/);
});

test('unsupported flags cannot accidentally start a live SERV call',()=>{
  const result=run(['--auto-retry']);
  assert.equal(result.status,2);
  assert.match(result.stderr,/USAGE/);
  assert.doesNotMatch(result.stdout+result.stderr, /SERV_SIGNED_LIVE_START/);
});
