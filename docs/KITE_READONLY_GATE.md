# Kite Passport — read-only gate before any approved IP402 charge

Updated 2026-11-04. This is the next acceptance step after the builder's real local SERV inference, signed V2 decision, and localhost Audit verification passed.

**Operator acceptance update, November 4, 2026 05:31:15 UTC: PASS.** The builder's real Windows Git Bash output reported `READ_ONLY_PREFLIGHT_PASS` followed by `KITE_UNPAID_READINESS_PASS`; Kite catalog JSON contained expected service ID `2a41b31ec8665c50f49098a7`, domain, GET `/v1/geo` and 0.01 USDC price signals. Anonymous HTTP 402 x402-v2 challenge advertised Base `eip155:8453`, USDC `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`, amount `10000` base units (0.01 USDC). The output explicitly reported `providerAuthenticated=false`, `walletBalanceVerified=false`, `allowanceReviewed=false`, `sessionApproved=false`, `paidRequestAttempted=false`, `paymentExecuted=false`, `readyForPayment=false`. This is **builder-supplied terminal evidence**, not an independent verified merchant identity or payment.

## Exactly one safe local command

From Git Bash on your own Windows machine, after `git pull origin main`:

```bash
npm run preflight:kite
npm run accept:kite
```

- `preflight:kite` runs Kite CLI **version/help only**, detects installed command dialect. No login, session or payment.
- `accept:kite` executes **only** `ksearch services get --service-id 2a41b31ec8665c50f49098a7 --output json`, then sends an **anonymous GET** to the fixed IP402 GeoIP URL `https://ip402.xyz/v1/geo?ip=8.8.8.8&payment_protocol=x402&payment_network=base`. Neither sends money or calls OpenServ.
- The quote must be HTTP 402 x402 v2, exactly 0.01 USDC Base (`eip155:8453`, USDC contract `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`, raw `10000`).
- `KITE_UNPAID_READINESS_PASS` means **catalog identifiers were observed plus an unpaid Base USDC payment challenge**. Even PASS is *not* evidence of merchant ownership, source reliability, a fresh signed SERV decision, a passkey session or an onchain payment. The source may expire or change.
- `KITE_UNPAID_REVIEW_REQUIRED` means the lookup, JSON metadata or HTTP 402 claim needs human inspection. Do **not** repeat calls or substitute a different endpoint automatically.
- The CLI JSON may contain personal/private data; the script prints only fixed metadata signals and never echoes the underlying CLI output.

## Mandatory owner checks before approving real funds

1. On your own Kite Passport dashboard, inspect **Allowance**. Kite explicitly documents that an expired/absent session can fall back to a standing allowance and pay **without a new prompt**. If you require only one authorized payment, ensure unintended fallback spending cannot occur.
2. Inspect the Passport balance and the actual network/fees privately. The **0.01 USDC merchant quote** does not establish the total real-world funding cost, routing fees or final settlement. Do not share account details or secrets.
3. Cross-check the service ID, URL, GET method, latest price and accepted asset in the real Kite CLI and original merchant response. SpendProof checks displayed strings but does not verify the provider's legal identity or its quality.
4. The signed SERV review's handoff validity lasts only **10 minutes**. The previous accepted report is historical evidence, **not reusable authorization for a later transaction**. Obtain a fresh signed SERV risk review of precisely this request only when the other gates are ready. Every live SERV review can cost credits.
5. Confirm installed CLI syntax with `kpass agent:session --help` and `ksearch services --help`. The current official [CLI Reference](https://docs.gokite.ai/reference/kpass-cli) uses `kpass agent:session` / `ksearch services`, whereas the [Payments](https://docs.gokite.ai/passport/payments) walkthrough uses shorter `kpass session` / `ksearch service` verbs. Prefer the actual installed command help over guesses.
6. **Only after separate explicit approval** of the one-payment monetary scope, request a session with `--max-amount-per-tx 0.01 --max-total-amount 0.01 --ttl 15m --assets USDC` (without deprecated `--payment-approach`). Kite v1.8 reports sessions are **protocol-agnostic**; the resulting active delegation is denominated in **USD** rather than necessarily USDC, and a task summary does **not** cryptographically pin an endpoint. Approve with your own passkey and recheck its active state, actual expiry and USD limits immediately before an authorized paid GET. Never increase limits or change networks without a new owner decision.
7. Only when a human authorizes the actual charge, call the exact verified GET **once**; inspect Passport activity and independently verify any external transaction hash and paid service response. Do not count a copied `MATCHED_UNVERIFIED` reconciliation as settlement proof.

**Current state (operator logs/screenshots, 2026-11-04):** live SERV/HMAC/browser verification and Kite read-only catalog+HTTP 402 PASS; Passport login and original `coding-assistant` agent active; balance 0.978938 USDC Base; Dashboard shows allowance not set up and passkey saved; dedicated session approved and selected as active with 0.01 USD per-transaction and total, spent/reserved 0, actual expiry **2026-11-04T07:25:24.735376Z** (not a permanent session). Refreshed catalog + Base x402 quote PASS at **2026-11-04T07:13:54.867Z**. CLI status output does not authenticate the provider or certify a settled payment. **Outstanding:** new unexpired signed SERV review for the exact request, active-session and quote rechecks, explicit operator authorization for one paid GET, paid response, independent receipt/settlement, final Hackathon submission. Production SERV remains disabled.

## Official sources

- https://docs.gokite.ai/reference/kpass-cli
- https://docs.gokite.ai/passport/payments
- https://docs.gokite.ai/passport/payments/allowance
- https://docs.gokite.ai/passport/payments/funding
