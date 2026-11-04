#!/usr/bin/env node
/**
 * Read-only local Kite CLI preflight. Only executes --version and --help.
 * It never authenticates, creates a session, signs, spends or requests funds.
 */
import { spawnSync } from 'node:child_process';
import { READ_ONLY_PROBES, summarizeKitePreflight } from '../lib/kite-preflight.ts';

const probes={};
for(const spec of READ_ONLY_PROBES){
  if(!spec.args.includes('--version') && !spec.args.includes('--help')){
    throw Error('Unsafe CLI preflight command refused');
  }
  const result=spawnSync(spec.executable,[...spec.args],{
    encoding:'utf8',
    timeout:8000,
    maxBuffer:16_384,
    windowsHide:true,
    shell:process.platform==='win32',
  });
  probes[spec.key]={
    ok:!result.error && result.status===0,
    output:String(result.stdout||'')+'\n'+String(result.stderr||''),
  };
}

const summary=summarizeKitePreflight(probes);
console.log('SpendProof Kite CLI preflight (READ ONLY)');
console.log(JSON.stringify(summary,null,2));
console.log('\nGenerated commands follow the CLI Reference (agent:session / services).');
console.log('The Payments walkthrough uses different verbs (session / service).');
console.log('Check the actual local help output before executing any paid request.');
console.log('Never paste Passport login codes, keys or session credentials here.');
console.log('No authenticated or payment-bearing command was run.');
if(!summary.readyForManualInspection){
  console.error('\nCHECK_REQUIRED: Kite CLI not detected or help did not establish a clear syntax.');
  console.error('Install/update the official Kite CLI, then inspect kpass --help and ksearch --help.');
  process.exitCode=2;
}else{
  console.log('\nREAD_ONLY_PREFLIGHT_PASS: command syntax candidates detected, payment NOT verified.');
}
