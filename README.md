# SpendProof

**Decision evidence before agent payments.** Built for the OpenServ Hackathon 02 (Kite track).

SpendProof evaluates whether an AI agent's proposed API purchase is within explicit spending constraints and has enough evidence to proceed. It never represents a proposed or simulated charge as an executed payment.

## Current scope

- Deterministic policy checks (budget, per-transaction ceiling, merchant URL, evidence requirements).
- Optional **real SERV Reasoning** call via server-only `SERV_REASONING_API_KEY` and `SERV_MODEL`.
- User-controlled, clearly labeled test scenarios and JSON audit export.
- Kite Passport CLI handoff (discover, request passkey-approved spending session, execute) — no server-side custody.
- No payment is executed by this web UI.

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Configure `SERV_REASONING_API_KEY` and a model ID available to your OpenServ account in `SERV_MODEL` to enable the live analysis button. Without those variables, deterministic tests still work; the live endpoint refuses rather than faking AI output.

```bash
npm run test
npm run typecheck
npm run build
```

## Safety

All spending limits are enforced by deterministic code. AI analysis is advisory only. Do not paste private keys, Passport sessions, auth tokens or payment credentials into the application. Kite payment execution requires a separately approved, scoped session and an external `kpass` workflow. User-entered service prices and evidence are unverified claims.

Official references: https://www.openserv.ai/hackathon-2 · https://www.openserv.ai/ · https://docs.gokite.ai/passport/payments · https://docs.gokite.ai/api-reference

## Deployment

Deploy to a Node-capable environment and set the two environment variables on the server. Avoid spending credentials on the frontend. No deployment has been performed.
