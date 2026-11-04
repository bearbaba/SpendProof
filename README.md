# SpendProof

**Decision evidence before agent payments.** Built for the OpenServ Hackathon 02 (Kite track).

SpendProof evaluates whether an AI agent's proposed API purchase is within explicit spending constraints and has enough evidence to proceed. It never represents a proposed or simulated charge as an executed payment.

## Current scope

- Deterministic policy checks (budget, per-transaction ceiling, merchant URL, evidence requirements).
- Optional **real SERV Reasoning** call via server-only `SERV_REASONING_API_KEY` and `SERV_MODEL`.
- User-controlled, clearly labeled test scenarios and JSON audit export.
- Server-HMAC-signed V2 decision receipt binds the complete proposal, policy decision and SERV explanation. **The user must verify the signature, and that review must be under 10 minutes old, before a Kite handoff unlocks.** This is not a payment receipt.
- Post-payment local reconciliation of user-entered session/service/price/activity evidence. Matching data remains **unverified**, not a cryptographic payment proof.
- Kite Passport CLI handoff (discover, inspect the exact service, compare price/endpoint, review allowance fallback, passkey-approve and select a one-payment session, check active session, execute and inspect activity) — no server-side custody.
- No payment is executed by this web UI. The external Kite CLI remains the only execution channel. Client-entered budgets are advisory until a human approves a scope-limited Kite session.

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Configure `SERV_REASONING_API_KEY`, an available `SERV_MODEL`, a private **16+ character** `SPENDPROOF_ACCESS_CODE`, a random 32+ character `SPENDPROOF_AUDIT_SECRET`, and explicitly set `SPENDPROOF_ENABLE_LIVE_SERV=true` to enable live analysis. The default is `false` to prevent unexpected credit use. Without those variables, deterministic tests still work; the live endpoint refuses rather than faking AI output.

```bash
npm run test
npm run typecheck
npm run build
npm run smoke:production
```

The production smoke test starts the compiled Next.js application using **fake test-only server values**. It exercises public Home, capability status, disabled paid inference, complete V2 verification and tampering. It does not call SERV or Kite and is mandatory in CI.

To verify SERV Reasoning with **your own server-side credentials** (a real credit-bearing request), set the keys in `.env.local`, then run:

```bash
npm run smoke:serv
```

This command prints model, risk and token counts but never prints credentials. Do not commit `.env.local`.

To inspect **your installed Kite CLI syntax** without logging in or making any payment, run `npm run preflight:kite`. This checks only CLI `--version` and `--help`; it reports candidate command dialects, not a verified live transaction. The local Kite CLI is not required in GitHub Actions.

For the **no-wallet demo**, follow [Hackathon 02 release walkthrough and evidence checklist](docs/HACKATHON02_RELEASE.md). The public demo uses only local checks when SERV is disabled; there are no fake payment results.

Read [Kite integration and pending acceptance](docs/KITE_INTEGRATION.md) before generating a spending session.

## Server-owned decision ceiling

The browser's budget, remaining amount, and per-transaction limit are **untrusted inputs**, not an authoritative payment policy. To prevent an AI agent from raising those numbers and obtaining a larger signed recommendation, the server adds its own `owner_ceiling` decision check. By default `SPENDPROOF_MAX_SIGNED_TX_USD` is **1.00 USDC per reviewed purchase** (adjustable by the server owner up to 100.00). Invalid configuration fails closed; requests above the ceiling are blocked **before** contacting SERV. The signed audit bundle includes the server-controlled check.

This protects **what SpendProof signs**. It does **not** control or guarantee the actual external Kite payment. Only a passkey-approved session and Kite's own enforcement can do that. Never describe a manually entered browser budget as an on-chain cap.

## SERV credit protection

- The browser can always run local policy checks, even if SERV is disabled.
- Live paid inference defaults to **OFF**; set `SPENDPROOF_ENABLE_LIVE_SERV=true` on the server only after you configure an account spending limit.
- The server rejects malformed/oversized JSON requests, enforces a **15-second cooldown**, allows only **one concurrent call**, and caps usage to **20 calls per 24h per running process**.
- **Critical:** these are **process-local**, not durable rate limits across serverless instances, deployments, or restarts. Use an OpenServ provider-side spending/credit cap and preferably a durable shared rate limiter before public exposure.
- `/api/status` reports policy mode and whether SERV was configured, without revealing secrets. It cannot prove that a live inference succeeded.
- Never paste an API key or passkey into the project browser; the project access code is a separate credential, not the SERV API key.

## Developer acceptance: mocked SERV upstream

The normal `npm test` suite covers success and fail-closed SERV calls using a **mock upstream** (no credits, no real access). Tests cover malformed JSON, truncated results, upstream errors, DENY, network loss, signature binding and reuse of expired decisions. The real `npm run smoke:serv` remains a separate opt-in credit-bearing test.

## Safety

All spending limits are enforced by deterministic code. AI analysis is advisory only. Do not paste private keys, Passport sessions, auth tokens or payment credentials into the application. Kite payment execution requires a separately approved, scoped session and an external `kpass` workflow. **Kite can charge a preapproved recurring allowance when a session is absent or expired**; verify allowance status and active session in Passport immediately before any CLI execution. User-entered service prices and evidence are unverified claims.

Official references: https://www.openserv.ai/hackathon-2 · https://www.openserv.ai/ · https://docs.gokite.ai/passport/payments · https://docs.gokite.ai/api-reference

### Important decision isolation rule

A SERV assessment only applies to the exact task, provider, URL and monetary limits it reviewed. Editing any of these while the API is running cancels the browser request and discards late responses; a signed report for an older intent never unlocks a new Kite request. Cancellation does not guarantee the remote inference provider avoided a charge.

Kite's official documentation currently uses different session command forms in the CLI reference and the Payments walkthrough. The generated commands follow [CLI reference](https://docs.gokite.ai/reference/kpass-cli); always inspect your installed `kpass` / `ksearch` version and `--help` before using them with real funds.

## Real x402 candidate (read-only evidence)

A real Kite-catalog candidate, **IP402 GeoIP**, is available in the Decision workspace as an explicitly **UNPAID** example, separate from the three illustrative test fixtures. It uses `GET /v1/geo` with public example IP `8.8.8.8`, catalog service ID `2a41b31ec8665c50f49098a7` and an observed one-cent Base USDC HTTP 402 requirement. The exact URL's live challenge may change.

Run `npm run inspect:ip402` on your own machine for a **no-payment GET** that verifies HTTP 402, x402 version 2, Base USDC token and exactly 0.01 USDC. It does not authenticate with Kite, spend USDC, verify provider trust, run SERV or create a session. Any mismatch fails closed. See `docs/IP402_ACCEPTANCE.md`.

## Verified public demo

The demo deployment is at https://spendproof.vercel.app/. It supports policy-only walkthroughs without a wallet, an API key or funds. On 2026-11-04 the production deployment returned HTTP 200 and `/api/status` reported paid SERV disabled and no in-app payment execution.

Run `npm run smoke:live` from a machine with internet access to check the **public deployed** Home and safe API behaviour. This uses anonymous GETs and safe test POSTs only, and never requests SERV credits or a Kite payment. CI runs it on PRs. It does not perform click-through/mobile visual tests or prove live SERV/Kite acceptance.

## Current verification and limits

- The local deterministic decision test suite can run without credentials using `npm test`.
- Real SERV Reasoning requires valid credentials and available model credits; it has not been exercised without them.
- Kite service discovery and passkey-approved x402 payment must be performed externally; there is no live Kite payment proof yet.
- HMAC authenticates the complete server-issued decision bundle and does **not** establish merchant identity, on-chain payment, or fulfillment.
- Illustrative `example.org` providers are fixtures; do not send real payments to them.
- POST paid requests remain blocked until their payload can be explicitly reviewed.

## Deployment

Deploy to a Node-capable environment and set all four variables in .env.example on the server. Avoid spending credentials on the frontend. No deployment has been performed.
