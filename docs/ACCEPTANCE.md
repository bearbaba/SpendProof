# SpendProof — Acceptance gate (Kite track)

Status: **An OpenServ Hackathon 02 registration/feedback form was acknowledged; an official completed-project submission has not been independently confirmed. Product is not yet end-to-end validated.** The target is product-quality 9.5/10, not an achieved judge score.

## Definition of done

| Requirement | Current state | Exit criteria |
| --- | --- | --- |
| Clear purpose and intuitive flow | Implemented in source | Responsive browser acceptance on desktop and mobile |
| Deterministic cost controls | Eight client policy checks plus a server-owned signed-purchase ceiling | Server rejects inflated client caps before using SERV credits; CI passes |
| Input constraints (unsafe URLs, unsupported POST) | Implemented | Negative inputs do not trigger inference or handoff |
| SERV Reasoning | **Real model inference passed on 2026-11-04**, per builder's local terminal output: `gemini-3.1-flash-lite`, 590 input / 132 output tokens, medium / REVIEW, no payment | Separate live signed V2 acceptance and local API/UI walkthrough still required |
| Signed decision receipt | Server-signed V2 full bundle tested with mocked CI data; optional opt-in local live signed acceptance script now exists | Execute one owner-approved paid `npm run accept:serv -- --live` and verify live signed V2 + tamper rejection; UI/HTTP verification remains separate |
| Kite discovery | User observed real IP402 service ID and GET endpoint, catalog listing of 0.01 USDC, and direct HTTP 402 x402 Base USDC challenge. Sample unpaid IP402 candidate added to UI. | Reinspect exact current URL, payment option, provider legitimacy and live costs immediately before any approved payment |
| Kite spending session | Least-privilege one-payment CLI command, 15-minute TTL | Human passkey-approved session with bounded limits |
| User-supplied Kite evidence comparison | Implemented without external Kite verification | Independently check success and settlement before advertising payment proof |
| x402 payment | Not executed; no in-app payment API | Successful real/sandbox (as allowed by track) Kite payment and receipt, no placeholder |
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

Read-only real provider evidence and its limits: docs/IP402_ACCEPTANCE.md (HTTP 402 is not a paid response or successful Kite transaction).

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
