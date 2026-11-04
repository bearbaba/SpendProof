# IP402 x402 acceptance — unpaid provider challenge

Status recorded: **2026-11-04**. User-operated Windows Kite Passport CLI and an anonymous Git Bash curl.exe call. No keys or funds disclosed. This is a reproducible **discovery + HTTP 402** milestone, **not** paid acceptance.

## Evidence already observed

- kpass 1.8.0 and ksearch 1.0.6 were installed; Passport backend healthy; account login and registered coding-assistant agent were confirmed; **no active spending session**.
- SpendProof preflight: both CLIs installed, session and discovery dialects cli-reference, readyForManualInspection true, livePaymentVerified false.
- Kite catalog discovery: 50 services overall, 43 under the x402 filter.
- Kite catalog ID **2a41b31ec8665c50f49098a7** identifies **IP402**, https://ip402.xyz, endpoint **GET /v1/geo**, starting price **0.01 USDC** and payment-only access. The alternative anchor-x402 provider exposes POST routes in its listed endpoints and is outside SpendProof GET-only policy.
- Anonymous request GET https://ip402.xyz/v1/geo returned **HTTP/1.1 402 Payment Required**, Date **2026-11-04 03:43:01 UTC**. The Payment-Required header advertised x402 version 2, Base Mainnet (eip155:8453), exact payment, USDC asset **0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913**, amount **10000** base units = **0.01 USDC**. Alternative networks and a separate MPP option were also present.
- Merchant response documents a required IP input (public example 8.8.8.8), optional lang, and protocol/network selection. Do NOT use bundle or MPP for one-payment acceptance.
- Merchant notes Arc payment uses Circle Gateway balance, not plain wallet USDC. Use the Base accept as the intended network.
- Challenge is time-bounded; it is not a frozen quote. **No SERV analysis, passkey session, user payment, receipt or confirmed settlement has occurred.**

## Reproducible read-only quote check

Run from the latest SpendProof main on a machine with internet access:

    npm run inspect:ip402

It sends only GET to https://ip402.xyz/v1/geo?ip=8.8.8.8&payment_protocol=x402&payment_network=base. It supplies no payment header, Passport token, wallet signature, Kite session or SERV access code. It requires HTTP 402 and a valid x402 v2 header for the exact GeoIP resource, Base USDC, and 0.01 USDC. Unexpected status, changed asset, network or price fails closed without retry. Output is a concise summary with paymentExecuted false.

A 402 response is **not** an IP lookup result and **not** payment proof. Do not publish secret tokens or login payloads with the output.

## Public UI demo

1. Open https://spendproof.vercel.app/ and Decision workspace.
2. Select **IP402 — GET /v1/geo** in *Real x402 catalog · unpaid*, separate from three fake fixtures.
3. Note the example public IP 8.8.8.8 and Base/x402 request URL. The provisional cost, budget and per-payment cap are 0.01 USD. Recheck the precise HTTP challenge.
4. Check locally. Expected deterministic verdict: REVIEW, not paid or approved.
5. Open Audit Trail. There is no live SERV signature or payment evidence.
6. Open Kite handoff. Service ID, exact URL and price require manual cross-check. Session and execute commands remain locked without a fresh, verified SERV-signed review and the required Kite session safety acknowledgements.

## Remaining real-money gates

- Enable SERV only in a protected environment with a confirmed provider-side credit budget and a durable shared throttle; public deployment stays disabled.
- Assess the exact reviewed IP402 query with real SERV and verify the complete signed V2 decision, unexpired within 10 minutes. If declined, STOP.
- Inspect the Passport recurring allowance. It can pay after a spending session expires, so one session is not an isolation guarantee.
- Check the fresh Base x402 price **and** Passport funding, transaction/bridge/routing fees; quoted provider cost is not the total fee estimate.
- Human operator must explicitly approve any costs and a one-payment session, with tightly bounded per-payment and total caps, via passkey. Confirm the correct session is active.
- Execute at most one authorized GET with an operator-controlled Kite CLI; inspect response, activity, amount and settlement evidence independently. No automatic retries, no paid batch.
- Do not claim a payment before independent payment evidence exists. Manually copied fields are MATCHED_UNVERIFIED at best.

This feature is a real catalog reference and an **unpaid quote inspection**, not an integrated payment gateway.
