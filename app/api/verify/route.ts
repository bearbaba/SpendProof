import { NextRequest, NextResponse } from 'next/server';
import { verifyDecisionBundle, type DecisionBundle } from '../../../lib/attestation';

export const runtime = 'nodejs';
const reply = (data: unknown, status = 200) => NextResponse.json(data, {
  status, headers: { 'Cache-Control': 'no-store' },
});

export async function POST(req: NextRequest) {
  const secret = process.env.SPENDPROOF_AUDIT_SECRET;
  if (!secret || secret.length < 32) {
    return reply({ authentic: false, error: 'Decision verification is not configured.' }, 503);
  }

  let body: unknown;
  try {
    if (Number(req.headers.get('content-length') || 0) > 18000) {
      return reply({ authentic: false, error: 'Payload too large.' }, 413);
    }
    body = await req.json();
  } catch {
    return reply({ authentic: false, error: 'Malformed JSON.' }, 400);
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return reply({ authentic: false, error: 'Expected a decision bundle.' }, 422);
  }
  const data = body as Record<string, unknown>;
  if (!Object.hasOwn(data, 'proposal') || !Object.hasOwn(data, 'policy') ||
      !Object.hasOwn(data, 'serv') || !Object.hasOwn(data, 'attestation')) {
    return reply({ authentic: false, error: 'Complete decision bundle required.' }, 422);
  }

  const verification = verifyDecisionBundle(secret, data as DecisionBundle);
  return reply({
    ...verification,
    assurance: verification.authentic
      ? 'SpendProof signed this policy, reasoning assessment and purchase intent without any payment claim.'
      : 'Decision missing, modified, inconsistent or signed by another SpendProof server.',
    merchantVerified: false,
    paymentVerified: false,
  });
}
