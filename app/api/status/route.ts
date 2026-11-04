import { NextResponse } from 'next/server';

export const runtime='nodejs';
export const dynamic='force-dynamic';

import { resolveOwnerCeilingCents } from '../../../lib/owner-policy';

export function GET() {
  const enabled = process.env.SPENDPROOF_ENABLE_LIVE_SERV === 'true';
  const ownerCeiling=resolveOwnerCeilingCents(process.env.SPENDPROOF_MAX_SIGNED_TX_USD);
  const configured = Boolean(
    process.env.SERV_REASONING_API_KEY &&
    process.env.SERV_MODEL &&
    (process.env.SPENDPROOF_ACCESS_CODE?.length || 0) >= 16 &&
    (process.env.SPENDPROOF_AUDIT_SECRET?.length || 0) >= 32
  );
  return NextResponse.json({
    service:'SpendProof',
    policyEngine:'ready',
    servMode:enabled && configured && ownerCeiling!==null ? 'live-enabled-unverified' : 'disabled',
    serverReviewMaxUsd:ownerCeiling===null?null:ownerCeiling/100,
    serverReviewCapConfigured:ownerCeiling!==null,
    kiteMode:'external-cli-only',
    paymentExecution:'not-available-in-app',
    independentPaymentVerification:false,
  },{headers:{'Cache-Control':'no-store'}});
}
