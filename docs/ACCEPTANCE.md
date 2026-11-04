# SpendProof — Acceptance gate (Kite track)

Status (2026-11-04): **Real operator-executed Kite x402 IP402 GET on Base succeeded following a verified live SERV decision and passkey-approved one-payment session. Kite returned HTTP 200, `completed` activity, and a 0.01 USDC debit; a user-shared BaseScan record shows Success, block 53494088 and the matching official USDC token transfer.** The website itself does not execute payment. The official hackathon submission is not independently confirmed; 9.5/10 remains a quality target, not a judge score. See [paid acceptance evidence](KITE_PAID_ACCEPTANCE.md).

## Definition of done

| Requirement | Current state | Exit criteria |
| --- | --- | --- |
| Clear purpose and intuitive flow | Implemented in source | Responsive browser acceptance on desktop and mobile |
| Deterministic cost controls | Eight client policy checks plus a server-owned signed-purchase ceiling | Server rejects inflated client caps before using SERV credits; CI passes |
| Input constraints (unsafe URLs, unsupported POST) | Implemented | Negative inputs do not trigger inference or handoff |
| SERV Reasoning | **Live model inference and localhost browser analysis PASS (operator evidence, 2026-11-04)**: `gemini-3.1-flash-lite`, medium / REVIEW, unpaid | Keep paid SERV disabled in public production; see [LOCAL_WEB_ACCEPTANCE.md](LOCAL_WEB_ACCEPTANCE.md) |
| Signed decision receipt | **Local CLI HMAC/tamper acceptance PASS** (916 prompt / 140 completion tokens), **browser `/api/analyze` → `/api/verify` PASS** (operator screenshots, 2026-11-04). No transfer executed. | Continue with fresh merchant quote, scoped Kite session, and independent x402 receipt verification; a signed decision is not payment proof |
| Kite discovery | User observed real IP402 service ID and GET endpoint, catalog listing of 0.01 USDC, and direct HTTP 402 x402 Base USDC challenge. Sample unpaid IP402 candidate added to UI. | Reinspect exact current URL, payment option, provider legitimacy and live costs immediately before any approved payment |
| Kite spending session | **PASS for one paid request**: second dedicated session approved via passkey, limits 0.01 USD per-call and total, expiry 2026-11-04T07:43:00.100242Z; subsequently spent 0.01. | Do not reuse the spent-cap session; session task is not a URL lock. Recurring allowance status was not captured |
| User-supplied Kite evidence comparison | Implemented without external Kite verification | Independently check success and settlement before advertising payment proof |
| x402 payment | **OPERATOR-OBSERVED PASS**: one external Kite x402 IP402 GET returned HTTP 200, `payment_response.success=true`, USDC session spent 10000 raw units, matching `completed` Kite Activity and 0.010000 USDC balance delta. User also supplied BaseScan Success block 53494088 and matching USDC transfer. | Public-explorer evidence is operator-shared, not a directly fetched JSON-RPC receipt; no payment execution in the web app |
| Failure path | Mocked SERV error coverage and production HTTP smoke tests | Live invalid-key, expired-session, insufficient-budget and provider-error acceptance |
| Public demo and X post | Production deployed at https://spendproof.vercel.app/; HTTP 200, live API safety checks PASS. X post still unverified. | Interactive desktop/mobile walkthrough and published tagged @openservai X post archived |

## Security acceptance: intent binding and request races

- **Always compare the signed SERV proposal to the currently edited purchase.** Changing amount, budget, per-transaction cap, remaining allocation, endpoint, provider, purpose, evidence URL, method or x402 claim invalidates handoff.
- **Invalidate in-flight requests when an input or example changes.** Browser responses from old requests must be ignored even when the upstream SERV request eventually finishes; aborting the browser request does not guarantee the model provider will not charge.
- **Verify API payload bounds using actual bytes**, including chunked requests without `Content-Length`. The production HTTP smoke test exercises this path.
- A valid old signature remains historically authentic but must never authorize a different purchase.

## Mocked API integration checks

The CI suite validates one-call SERV execution and rejects malformed JSON, truncated completions, unsupported recommendations, network errors, upstream authorization/credit errors and expired/unverified decision handoffs. These tests do **not** count as a live SERV or payment acceptance.

## Production HTTP acceptance

`npm run build && npm run smoke:production` runs the built Next.js service with fake test values and tests HTTP response shapes and cryptographic verification. This stage is mandatory in CI and **does not spend credits or constitute proof of live Kite or SERV operation**.

Read-only real provider evidence: docs/IP402_ACCEPTANCE.md. Successful later external paid request and evidence boundary: docs/KITE_PAID_ACCEPTANCE.md.

## Required reproducible demo

1. Choose the Within budget fixture, run local checks, observe **REVIEW**, not APPROVED/PAID.
2. Choose Over spending cap, observe **BLOCK**.
3. Choose Missing evidence, observe **BLOCK**.
4. Configure SERV credentials and the audit signing secret. Run the live SERV assessment, inspect explanation and signed decision.
5. Verify the full V2 decision bundle in Audit Trail. Confirm the Kite handoff stays locked until verification, and expires after ten minutes. Export the JSON record.
6. Discover a real x402 service with Kite; inspect the live offering and costs.
7. Request a narrow spending session and approve using a passkey, outside SpendProof.
8. Execute a permitted paid request with Kite; collect an actual receipt and external activity/transaction evidence.
9. Confirm no automatic payment was attempted by the SpendProof browser or server.

Important: a signed SpendProof **decision** is not a merchant certificate, payment proof, or an onchain attestation. The budget in the web form is advisory until reproduced in the passkey-approved Kite session.
