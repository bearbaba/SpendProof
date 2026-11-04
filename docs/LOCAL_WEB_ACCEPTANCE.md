# Local web acceptance — SERV analysis, signed decision and verification

Status (2026-11-04): builder-reported terminal evidence confirms **one real signed SERV acceptance** using `gemini-3.1-flash-lite`. Output: `SERV_SIGNED_LIVE_ACCEPTANCE_PASS`, 916 prompt / 140 completion tokens, medium / REVIEW, `signatureValid=true`, `bundleIntact=true`, `tamperRejected=true`, `reviewGate=READY`, `paymentExecuted=false`. This proves the **local one-call CLI acceptance**, not the browser / Next.js HTTP workflow, merchant legitimacy or x402 payment. Keep the local signed receipt private; it is written to git-ignored `out/`.

## Before the next paid request

- Confirm the SERV console credit balance and provider-side credit cap. Each click of **Analyze with SERV** can consume credits. Do not retry automatically.
- Keep `SERV_REASONING_API_KEY`, `SPENDPROOF_ACCESS_CODE` and `SPENDPROOF_AUDIT_SECRET` in local `.env.local`. **Never share the file or add it to Git.**
- Keep Vercel production at `SPENDPROOF_ENABLE_LIVE_SERV=false`. Never set the live key in the public demo.
- Leave `SPENDPROOF_MAX_SIGNED_TX_USD=0.01`. The server-controlled review ceiling is not a Kite payment cap.
- This test uses only local HTTP on `127.0.0.1` and makes exactly one opt-in SERV inference. It does not open Kite, create a spending session, or transfer USDC.

## Operator walkthrough

1. In Git Bash, `cd ~/SpendProof`, then open `notepad.exe .env.local`.
2. Change only `SPENDPROOF_ENABLE_LIVE_SERV=false` to `SPENDPROOF_ENABLE_LIVE_SERV=true`. Save with Ctrl+S. Do not edit or disclose secrets.
3. Start a local server with `npm run dev -- --hostname 127.0.0.1`. Keep that terminal open. Open `http://127.0.0.1:3000` (or the port printed by Next.js).
4. In **Decision workspace**, click **Load candidate** under **IP402 — GET /v1/geo**. Do not change the request. Verify cost, budget, per-transaction cap and remaining amount are each `0.01`.
5. In **Project access code for live SERV**, paste **only** the value of `SPENDPROOF_ACCESS_CODE` from your local file (not the OpenServ API key). The status should indicate SERV is configured.
6. After explicitly approving a single billable SERV inference, click **Analyze with SERV** **once**. Expect **Live SERV analysis** with a risk assessment; `REVIEW` is not payment approval. Any API failure should halt the attempt: record the error, do not click again.
7. Open **Audit details** / **Audit trail**, confirm `ANALYSIS TYPE = LIVE SERV` and `EXECUTION = NOT EXECUTED`, then click **Verify signature**. A valid bundled decision should state the purchase, policy and SERV assessment were verified, but no payment verified. If it fails, stop.
8. Optionally **Export JSON audit** and keep it private. It is a decision audit, not proof of x402 settlement. The signed review expires for Kite handoff after **10 minutes**, so do not reuse it later.
9. Stop the Next.js server with Ctrl+C. In `.env.local`, restore `SPENDPROOF_ENABLE_LIVE_SERV=false`. Leave public production unchanged.

## Acceptance record (do not mark complete until observed)

| Gate | Current status | Required evidence |
| --- | --- | --- |
| Live OpenServ inference | **Builder-reported PASS** | Real `SERV_LIVE_RESPONSE_VALID`, 590 input / 132 output tokens |
| Signed live local assessment | **Builder-reported PASS** | Real `SERV_SIGNED_LIVE_ACCEPTANCE_PASS`, verified HMAC, tamper rejection, `paymentExecuted=false` |
| Live browser `/api/analyze` | **PENDING** | One authorized local request returns `mode: serv-live` and matching signed decision |
| Live browser `/api/verify` | **PENDING** | User sees verified signature for same intent |
| HTTP 402 quote, catalog and merchant | **Prior unpaid read-only observations; fresh review pending** | Fresh catalog + same-resource challenge and USDC amount |
| Kite passkey-approved session | **PENDING** | Human approval for one narrow payment session |
| x402 payment and independently checked receipt | **NOT EXECUTED** | Real transaction/service receipt and external verification |

**Safety:** a signed SERV decision confirms that the SpendProof server signed its own review data; it does not prove the provider exists, that quoted pricing is current, or that funds moved.
