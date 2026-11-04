#!/usr/bin/env node
/**
 * Local, opt-in acceptance of one real OpenServ risk review and its signed V2
 * decision bundle. The default mode is a free, offline preflight.
 *
 * No Kite CLI, wallet or merchant payment is used. Never log credentials,
 * print upstream raw text, or automatically retry a paid SERV request.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ip402Candidate } from '../lib/ip402-candidate.ts';
import { evaluateSignedPolicy, resolveOwnerCeilingCents } from '../lib/owner-policy.ts';
import { requestServAssessment } from '../lib/serv-inference.ts';
import { verifyDecisionBundle } from '../lib/attestation.ts';
import { getHandoffState } from '../lib/handoff-readiness.ts';

const args=process.argv.slice(2);
if(args.length>1 || (args.length===1 && args[0]!=='--live')){
  console.error('USAGE: npm run accept:serv [-- --live]');
  console.error('Default: free offline preflight; --live: exactly ONE potentially billable SERV call.');
  process.exitCode=2;
}else{
  const live=args[0]==='--live';
  const key=process.env.SERV_REASONING_API_KEY||'';
  const model=process.env.SERV_MODEL||'';
  const access=process.env.SPENDPROOF_ACCESS_CODE||'';
  const auditSecret=process.env.SPENDPROOF_AUDIT_SECRET||'';
  const ownerCeiling=resolveOwnerCeilingCents(process.env.SPENDPROOF_MAX_SIGNED_TX_USD);
  const policy=ownerCeiling===null?null:evaluateSignedPolicy(ip402Candidate,ownerCeiling);
  const failures=[];
  if(!key || /^DIEN_|^KEY_CUA_/i.test(key))failures.push('SERV_REASONING_API_KEY');
  if(!model || /^DIEN_|^MODEL_ID_/i.test(model))failures.push('SERV_MODEL');
  if(access.length<16)failures.push('SPENDPROOF_ACCESS_CODE');
  if(auditSecret.length<32)failures.push('SPENDPROOF_AUDIT_SECRET');
  if(ownerCeiling!==1)failures.push('SPENDPROOF_MAX_SIGNED_TX_USD (must be 0.01 for this acceptance)');
  if(!policy || policy.verdict!=='REVIEW')failures.push('IP402_POLICY');
  if(failures.length){
    console.error('SERV_SIGNED_PREFLIGHT_FAILED:',JSON.stringify({missingOrInvalid:failures,paidRequestSent:false}));
    process.exitCode=2;
  }else if(!live){
    console.log(JSON.stringify({
      status:'SERV_SIGNED_PREFLIGHT_PASS',
      model,
      intendedPurchase:'IP402 GET GeoIP · 0.01 USDC · Base',
      ownerCeilingUsd:ownerCeiling/100,
      privateCredentialsDisplayed:false,
      paidRequestSent:false,
      next:'npm run accept:serv -- --live (one billable OpenServ inference, only if you consent)',
    },null,2));
  }else{
    console.log('SERV_SIGNED_LIVE_START: exactly one potentially billable OpenServ request; no retries or Kite payment.');
    const started=Date.now();
    const result=await requestServAssessment({
      proposal:ip402Candidate,
      policy,
      key,model,auditSecret,
    });
    if(!result.ok){
      console.error('SERV_SIGNED_LIVE_FAILED:',JSON.stringify({
        code:result.code,
        upstreamStatus:result.upstreamStatus??null,
        paidRequestAttempted:true,
        paymentExecuted:false,
        retryAttempted:false,
      }));
      process.exitCode=1;
    }else{
      const {policy:signedPolicy,serv,attestation}=result.data;
      const bundle={proposal:ip402Candidate,policy:signedPolicy,serv,attestation};
      const verification=verifyDecisionBundle(auditSecret,bundle);
      const tampered=verifyDecisionBundle(auditSecret,{
        ...bundle,
        proposal:{...bundle.proposal,amountUsd:0.02},
      });
      const tamperRejected=!tampered.authentic;
      if(!verification.authentic || !verification.signatureValid || !verification.documentIntact || !tamperRejected){
        console.error('SERV_SIGNED_VERIFICATION_FAILED: HMAC or tamper detection check failed. No acceptance receipt was written.');
        process.exitCode=1;
      }else{
        const reviewGate=getHandoffState({
          mode:'serv-live',
          proposal:ip402Candidate,
          policy:signedPolicy,
          serv,
          attestation,
        },ip402Candidate,'verified');
        const receipt={
          schema:'spendproof.serv.local-acceptance.v1',
          checkedAt:new Date().toISOString(),
          source:'ONE_LIVE_OPENSERV_CALL',
          bundle,
          verification,
          tamperRejected,
          reviewGate,
          merchantVerified:false,
          catalogReviewedForPayment:false,
          kiteSessionApproved:false,
          paymentExecuted:false,
          independentlyVerifiedPayment:false,
          model:result.data.model,
          usage:result.data.usage,
        };
        const directory='out';
        await mkdir(directory,{recursive:true});
        const filename='spendproof-serv-signed-'+Date.now()+'.json';
        const path=join(directory,filename);
        await writeFile(path,JSON.stringify(receipt,null,2)+'\n',{encoding:'utf8',mode:0o600});
        console.log(JSON.stringify({
          status:'SERV_SIGNED_LIVE_ACCEPTANCE_PASS',
          model:result.data.model,
          latencyMs:Date.now()-started,
          risk:serv.risk,
          recommendation:serv.recommendation,
          signatureValid:verification.signatureValid,
          bundleIntact:verification.documentIntact,
          tamperRejected,
          reviewGate,
          tokenUsage:result.data.usage,
          savedReceipt:path.replaceAll('\\','/'),
          paymentExecuted:false,
          note:'Review gate does NOT confirm catalog, allowance, Kite session, transaction or settlement.',
        },null,2));
      }
    }
  }
}
