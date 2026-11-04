# SpendProof — Hackathon 02 release and submission pack

Status date: 2026-11-04. Owner: independent solo builder. Track: Kite Agent Passport + SERV Reasoning.
Repository: https://github.com/bearbaba/SpendProof

## Short product pitch (copy-ready)

**SpendProof — evidence before agent payments.**

AI agents should not spend money based on an unverified URL or a budget they declared themselves. SpendProof checks a purchase request against deterministic budget and safety rules, offers a separately configured SERV risk assessment, signs the complete decision for audit, and prepares a tightly scoped human-approved Kite Passport session. A denied request does not get payment commands. SpendProof itself never handles funds or falsely reports a proposed transaction as completed.

**What is working in code:** eight client-side policy checks; a server-owned decision signing ceiling; an optional protected SERV inference route; HMAC-signed audit decisions; a fail-closed manual Kite CLI handoff; JSON audit export; and manual post-payment reconciliation labeled unverified.

**What is accepted (builder-reported terminal evidence):** live SERV risk inference and a separate real OpenServ call signed and verified as a SpendProof V2 HMAC decision on 2026-11-04. **Not yet accepted:** a Kite passkey-approved spending session, x402 payment, independently verified settlement, and final Hackathon submission. The local browser SERV + signature verification roundtrip also **passed via builder screenshots** on 2026-11-04.

## 90-second judge walkthrough (no credentials needed)

| Time | Screen | Demonstrate | Correct claim |
| --- | --- | --- | --- |
| 0:00–0:15 | Home | Explain spend controls and the separation between review, signed proof and actual payment | Not a custodial wallet |
| 0:15–0:30 | Decision workspace | Run Within budget / Check locally | REVIEW means further checks are necessary, NOT approval or payment |
| 0:30–0:45 | Decision workspace | Run Over spending cap / Check locally | BLOCK; no paid SERV call or transfer |
| 0:45–0:55 | Decision workspace | Run Missing evidence / Check locally | BLOCK on missing evidence |
| 0:55–1:10 | Audit trail | Show 8 deterministic checks, export JSON | A local checksum alone does not authenticate a server |
| 1:10–1:25 | Kite handoff | Show CLI discovery, catalog review and default-locked execution | No real Kite authentication or x402 charge is claimed |
| 1:25–1:30 | End card | Show project GitHub and planned live acceptance | Explain exactly what remains to verify |

For a **live-enhanced version**, additionally show: SERV inference using the builder's private credentials, signed V2 verification, a fresh matching purchase intent, a real Kite catalog quote, a passkey-approved active session, one authorized x402 payment, and payment activity. Do not include these scenes until they actually work.

## Suggested X post after public demo is verified

SpendProof — evidence before AI agent payments. 🛡️

Built for @openservai Hackathon 02 × @GoKiteAI.

✅ Deterministic spend limits
✅ Live SERV risk-review and locally signed decision (2026-11-04 operator evidence)
✅ Tamper-evident decision receipts
✅ Human-approved Kite Passport handoff

No autonomous wallet custody. No fake payment receipts.

GitHub: https://github.com/bearbaba/SpendProof
Demo: [INSERT VERIFIED PUBLIC DEMO URL]

#SERV #KiteAI #AIAgents

**Publishing rule:** replace the placeholder with an actual working URL. Add a real screenshot or original walkthrough. Never say live SERV/x402 succeeded unless evidence is available. The X post above is a draft only; it has not been published.

## Evidence matrix

| Claim | Proof type | Status |
| --- | --- | --- |
| Eight deterministic checks | Source, tests, browser fixtures | Implemented and automatically tested |
| Owner-controlled signed-review ceiling | Source + unit tests | Implemented; not a Kite on-chain cap |
| Correct SERVER status and demo UI | HTTP production smoke, tests | Automated checks passed; public browser acceptance pending |
| SERV API failure handling | Mock upstream tests + operator's SERV terminal outputs | Live valid JSON and signed V2 decision confirmed by builder; failure paths mocked |
| HMAC decision integrity | Unit + production HTTP smoke, live local CLI and browser | Operator reports signed V2 PASS, HMAC/tamper rejection and live localhost Audit signature verification. No payment proof. |
| Kite CLI generated commands | Source and read-only dialect preflight | Windows kpass 1.8.0 + ksearch 1.0.6 real CLI preflight PASS; no paid session |
| Read-only Kite acceptance | `npm run accept:kite` CLI catalog + anonymous HTTP 402 (operator rerun pending) | Implemented in source; no session/payment and not yet run on operator's machine |
| Real Kite x402 payment | Session, activity, independently checked transaction | NOT PERFORMED |
| Public demo | Deployed URL + real production HTTP smoke | HTTP 200 and 6 safe live checks PASS; interactive desktop/mobile walkthrough pending |
| Official Hackathon 02 project submission | Actual final submission confirmation | NOT YET VERIFIED |

## Real IP402 x402 catalog evidence (unpaid)

User-initiated Kite discovery and direct merchant HTTP 402 validated a GET-only IP402 catalog candidate at a listed 0.01 USDC on Base. On the public workspace, load it separately from fake fixtures; run the read-only quote inspection locally with npm run inspect:ip402. These observations do NOT prove live SERV or a payment. See docs/IP402_ACCEPTANCE.md.

## Live acceptance — only the operator can complete

1. In OpenServ console, confirm the supported model, API key access, credits, provider-side spending limits and Hackathon 02 data-collection eligibility (do not send secrets in chat).
2. Run: npm run smoke:serv — this makes a **real potentially billable** API call. Save only redacted evidence.
3. Run: npm run preflight:kite — read-only version/help checks. Confirm actual CLI syntax on the operator's machine.
4. Discover a real paid service in the Kite catalog and inspect its price, URL, currency and payment method.
5. Both local SERV signing and localhost browser `/api/analyze` → `/api/verify` acceptance are builder-observed PASS from November 4, 2026. A fresh SERV-signed review is required when a real Kite session is later requested because handoff freshness expires after 10 minutes.
6. First run `npm run accept:kite` (free read-only IP402 catalog/quote gate) on the operator's machine; inspect the live output. Then inspect/restrict any recurring allowance, confirm wallet funding/fees, and **only after separate owner approval** create a single-price session, approve by passkey and verify it is currently active. See [KITE_READONLY_GATE.md](KITE_READONLY_GATE.md).
7. Execute exactly one authorized x402 API request. Verify service response, Passport activity, amount and transaction on an independent source.
8. Save a redacted receipt, upload any screenshots to the actual submission system, and update this evidence table from NOT PERFORMED to verified with actual URLs/IDs.
9. Verify the **official Hackathon 02 project submission workflow** is completed. An OpenServ pre-registration/feedback Typeform receipt alone does not prove the finished project has been submitted.

## Public demo deployment and verification

- **Public demo:** https://spendproof.vercel.app/
- **Environment:** isolated Vercel production project `spendproof`, SERV inference intentionally disabled, default server decision ceiling 1 USDC.
- **Published:** 2026-11-04, commit `4a22833a7fe7a7407ee547a730e9b43d1cf03982`.
- **Observed on production:** Home and `/api/status` HTTP 200; no grouped runtime errors were reported at inspection time. This proves basic availability only, not browser UX on every device.
- **Reproducible live smoke:** `npm run smoke:live` checks the real public host, disabled paid inference, unconfigured audit signing and safe REST behaviour. This cannot substitute for live SERV or Kite evidence.

## No-fee public demo policy

- Keep paid SERV inference disabled in the public demo unless a durable shared rate limiter and OpenServ credit cap are in place.
- Do not publish private SERV keys, login codes, passkey data, Kite session secrets, HMAC signing keys or full raw authentication output.
- A public demo can demonstrate deterministic spending review, local audit and the locked Kite handoff without connecting a wallet.
- When production resources are constrained, avoid linking the existing Veyra project or enabling automatic preview builds.
- See docs/ACCEPTANCE.md and docs/ROADMAP_TO_95.md for detailed technical acceptance.

## Official references

- https://www.openserv.ai/hackathon-2
- https://docs.gokite.ai/reference/kpass-cli
- https://docs.gokite.ai/passport/payments
- https://docs.gokite.ai/api-reference
