import assert from 'node:assert/strict';
import test from 'node:test';
import { READ_ONLY_PROBES, summarizeKitePreflight, type CliProbeKey, type ProbeEvidence } from '../lib/kite-preflight.ts';

const pass=(output:string):ProbeEvidence=>({ok:true,output});
const fail=(output='not installed'):ProbeEvidence=>({ok:false,output});

const reference:Partial<Record<CliProbeKey,ProbeEvidence>>={
  kpassVersion:pass('kpass 6.8.0'),
  ksearchVersion:pass('ksearch 6.8.0'),
  kpassReference:pass('Usage: kpass agent:session create execute list use'),
  kpassWalkthrough:fail('Unknown command session'),
  ksearchReference:pass('Usage: ksearch services list get'),
  ksearchWalkthrough:fail('Unknown command service'),
};

test('Kite preflight only invokes version or help; never sessions or payments',()=>{
  assert.equal(READ_ONLY_PROBES.length,6);
  for(const item of READ_ONLY_PROBES){
    assert.ok(item.args.includes('--version')||item.args.includes('--help'));
    assert.ok(!item.args.includes('create'));
    assert.ok(!item.args.includes('execute'));
    assert.ok(!item.args.includes('login'));
    assert.ok(!item.args.includes('send'));
  }
});

test('CLI reference dialect is detected as candidate but does not claim payment proof',()=>{
  const result=summarizeKitePreflight(reference);
  assert.equal(result.sessionDialect,'cli-reference');
  assert.equal(result.discoveryDialect,'cli-reference');
  assert.equal(result.readyForManualInspection,true);
  assert.equal(result.livePaymentVerified,false);
});

test('walkthrough CLI dialect remains compatible with an alternate installation',()=>{
  const result=summarizeKitePreflight({
    ...reference,
    kpassReference:fail(),
    kpassWalkthrough:pass('kpass session create execute list'),
    ksearchReference:fail(),
    ksearchWalkthrough:pass('ksearch service list get'),
  });
  assert.equal(result.sessionDialect,'payments-walkthrough');
  assert.equal(result.discoveryDialect,'payments-walkthrough');
  assert.equal(result.readyForManualInspection,true);
});

test('ambiguous dialect is flagged without assuming a particular CLI is safe',()=>{
  const result=summarizeKitePreflight({
    ...reference,
    kpassWalkthrough:pass('create execute'),
    ksearchWalkthrough:pass('list get'),
  });
  assert.equal(result.sessionDialect,'both-candidates');
  assert.equal(result.discoveryDialect,'both-candidates');
  assert.equal(result.livePaymentVerified,false);
});

test('a missing or misleading CLI help output must not establish compatibility',()=>{
  const result=summarizeKitePreflight({
    ...reference,
    kpassVersion:fail(),
    kpassReference:pass('Generic CLI help'),
  });
  assert.equal(result.kpassInstalled,false);
  assert.equal(result.sessionDialect,'undetermined');
  assert.equal(result.readyForManualInspection,false);
});

test('a CLI version without valid verb help is insufficient for verified integration',()=>{
  const result=summarizeKitePreflight({
    kpassVersion:pass('v6.8.0'),
    ksearchVersion:pass('v6.8.0'),
    kpassReference:pass('Usage unknown'),
    ksearchReference:pass('list'),
  });
  assert.equal(result.readyForManualInspection,false);
  assert.equal(result.livePaymentVerified,false);
});
