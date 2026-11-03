# SpendProof

**Decision evidence before agent payments.** Built for the OpenServ Hackathon 02 (Kite track).

SpendProof evaluates whether an AI agent's proposed API purchase is within explicit spending constraints and has enough evidence to proceed. It never represents a proposed or simulated charge as an executed payment.

## Current scope

- Deterministic policy checks (budget, per-transaction ceiling, merchant URL, evidence requirements).
- Optional **real SERV Reasoning** call via server-only `SERV_REASONING_API_KEY` and `SERV_MODEL`.
- User-controlled, clearly labeled test scenarios and JSON audit export.
- Server-HMAC-signed SERV decision receipt with public signature validation (not a payment receipt).
- Kite Passport CLI handoff (discover, request passkey-approved spending session, execute) — no server-side custody.
- No payment is executed by this web UI. The separate Kite CLI remains the only execution channel. Client-entered budgets are advisory until a human approves a scope-limited Kite session.

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Configure `SERV_REASONING_API_KEY`, an available `SERV_MODEL`, a private `SPENDPROOF_ACCESS_CODE`, and a random 32+ character `SPENDPROOF_AUDIT_SECRET` to enable the live analysis button. Without those variables, deterministic tests still work; the live endpoint refuses rather than faking AI output.

```bash
npm run test
npm run typecheck
npm run build
```

## Safety

All spending limits are enforced by deterministic code. AI analysis is advisory only. Do not paste private keys, Passport sessions, auth tokens or payment credentials into the application. Kite payment execution requires a separately approved, scoped session and an external `kpass` workflow. User-entered service prices and evidence are unverified claims.

Official references: https://www.openserv.ai/hackathon-2 · https://www.openserv.ai/ · https://docs.gokite.ai/passport/payments · https://docs.gokite.ai/api-reference

## Current verification and limits

- The local deterministic decision test suite can run without credentials using `npm test`.
- Real SERV Reasoning requires valid credentials and available model credits; it has not been exercised without them.
- Kite service discovery and passkey-approved x402 payment must be performed externally; there is no live Kite payment proof yet.
- HMAC authenticates the server-issued decision and does **not** establish merchant identity, on-chain payment, or fulfillment.
- Illustrative `example.org` providers are fixtures; do not send real payments to them.
- POST paid requests remain blocked until their payload can be explicitly reviewed.

## Deployment

Deploy to a Node-capable environment and set the two environment variables on the server. Avoid spending credentials on the frontend. No deployment has been performed.
