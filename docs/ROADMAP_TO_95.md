# SpendProof — release plan toward a 9.5/10 product-quality target

Updated: 2026-11-04. Track: OpenServ Hackathon 02 / Kite.

The 9.5/10 score is an internal goal, **not** a judge rating or a claim that an end-to-end payment has already succeeded.

## Completed and checked

- Responsive decision workspace, local spending policies, explicit BLOCK / REVIEW decision stages.
- SERV server-side inference integration, fail-closed parsing and no-retry mock-upstream tests covering happy and failure paths. Live smoke test is opt-in and still unverified.
- HMAC-signed V2 decision receipt binding the original proposal, policy checks and exact SERV assessment. Kite handoff now requires verified signature and a review less than ten minutes old.
- Public verification route for full decision bundles, including tamper tests.
- Kite CLI discovery, manual catalog cross-check, least-privilege single-payment spending session.
- Kite post-payment observation reconciliation with explicit `MATCHED_UNVERIFIED` / `MISMATCH` outcomes.
- CI has passed earlier iterations; the current release branch must pass all unit tests, typechecking, Next production build and seven HTTP smoke tests before merging.
- No in-app payment, custody, or on-chain verification is falsely represented as completed.

## Remaining acceptance blockers

| Priority | Task | Completion evidence | Requires |
| --- | --- | --- | --- |
| P0 | Live SERV inference | `npm run smoke:serv` succeeds using an available SERV model, server-signed assessment verifies from the app | Builder's own API key and credits |
| P0 | Live Kite catalog service | Real service ID, endpoint, quoted USDC and catalog inspection response | Authenticated Kite CLI |
| P0 | Approve tightly scoped Kite session | User sees one-payment cap and approves the exact scope via passkey | User interaction, USDC funds if live |
| P0 | Real or authorized sandbox x402 execution | Executed response + Passport activity record + independently inspected payment details | Actual Kite account/session |
| P1 | Public playable demo | Responsive app available on an accessible URL; local mode works without secrets | Deployment to a separate project / hosting |
| P1 | End-to-end error paths | Denied, invalid key, insufficient balance, expired session and provider failure show trustworthy states | Live acceptance |
| P1 | Judge-ready documentation | Short walkthrough, real screenshots, redacted receipts, matching X post | Evidence from real run |
| P1 | Check OpenServ hackathon data-collection eligibility | Confirm exact Hackathon 02 policy in console/event instructions | Official rules and account setting |

## Live SERV preparation

Never place keys in GitHub, X posts, recorded videos or chat. Set `SPENDPROOF_ENABLE_LIVE_SERV=true` only after OpenServ provider-side credit limits are set. Process-local call limits alone are not a durable financial control. Configure server-only variables in `.env.local`:

- `SERV_REASONING_API_KEY` — OpenServ SERV Reasoning key.
- `SERV_MODEL` — account-supported model ID.
- `SPENDPROOF_ACCESS_CODE` — strong, separate access code for paid model calls.
- `SPENDPROOF_AUDIT_SECRET` — randomly generated server-only signing key of 32+ characters.

After `npm install`, run `npm run smoke:serv`, then `npm run dev`. The smoke command makes one credit-bearing request; it never automatically runs in CI.

## Live Kite acceptance

1. Install Kite Passport CLI from official docs: https://docs.gokite.ai/passport/install
2. Sign in using Kite's own method and configure a passkey. Check `kpass health --output json`.
3. `ksearch services list --query weather --payment-approach x402_http --asset USDC --limit 10 --output json`
4. Inspect the exact service with `ksearch services get --service-id <SERVICE_ID> --output json`. Copy only public service URL / price / ID into SpendProof; do not paste credentials.
5. Run live SERV analysis. Match the catalog price and endpoint. Check signed decision.
6. Use the generated `kpass agent:session create` command for a strictly capped one-payment session, approve on Kite Passport using passkey.
7. Check whether any recurring allowance could pay if the session expires. Select and inspect the active approved session immediately before execution. Execute once using `kpass agent:session execute`. Inspect CLI result and `kpass activity --limit 20 --output json`.
8. Enter reported public activity details into SpendProof. Its result remains **MATCHED_UNVERIFIED** until independent settlement confirmation.
9. Export the audit record; remember the server signature authenticates only the decision, not the external payment.

## Deployment policy

Do not deploy to the Vercel Hobby team while existing quota pressure is unresolved, and do not change Veyra or other active services. A new isolated low-traffic deployment is preferred after checking usage. A public demo without credentials may show local policy decisions; the real SERV endpoint should stay protected.

## Evidence status

The project source has passed automated tests and build. **No real SERV request, Kite passkey approval, on-chain payment, or public demo has been verified in this build session.** Those results must never be fabricated.
