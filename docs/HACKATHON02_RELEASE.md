# SpendProof — Hackathon 02 release and submission pack

Status date: 2026-11-04. Owner: independent solo builder. Track: Kite Agent Passport + SERV Reasoning.
Repository: https://github.com/bearbaba/SpendProof

## Short product pitch (copy-ready)

**SpendProof — evidence before agent payments.**

AI agents should not spend money based on an unverified URL or a budget they declared themselves. SpendProof checks a purchase request against deterministic budget and safety rules, offers a separately configured SERV risk assessment, signs the complete decision for audit, and prepares a tightly scoped human-approved Kite Passport session. A denied request does not get payment commands. SpendProof itself never handles funds or falsely reports a proposed transaction as completed.

**What is working in code:** eight client-side policy checks; a server-owned decision signing ceiling; an optional protected SERV inference route; HMAC-signed audit decisions; a fail-closed manual Kite CLI handoff; JSON audit export; and manual post-payment reconciliation labeled unverified.

**What is NOT yet accepted:** live SERV call with user credentials and real model credits, authenticated Kite CLI with passkey, x402 payment proof, and independently verified settlement.

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
✅ SERV risk-review integration (live test pending)
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
| SERV API failure handling | Mock upstream tests | Tested with mocks; live provider unverified |
| HMAC decision integrity | Unit and production HTTP smoke | Tested with fake test-only signing secret |
| Kite CLI generated commands | Source and read-only dialect preflight | Local real CLI still needs verification |
| Real Kite x402 payment | Session, activity, independently checked transaction | NOT PERFORMED |
| Public demo | Deployed URL, desktop/mobile walkthrough | NOT YET VERIFIED |
| Official Hackathon 02 project submission | Actual final submission confirmation | NOT YET VERIFIED |

## Live acceptance — only the operator can complete

1. In OpenServ console, confirm the supported model, API key access, credits, provider-side spending limits and Hackathon 02 data-collection eligibility (do not send secrets in chat).
2. Run: npm run smoke:serv — this makes a **real potentially billable** API call. Save only redacted evidence.
3. Run: npm run preflight:kite — read-only version/help checks. Confirm actual CLI syntax on the operator's machine.
4. Discover a real paid service in the Kite catalog and inspect its price, URL, currency and payment method.
5. In a controlled test, run a live SERV analysis of the **same** purchase intent; verify the signed V2 decision in the UI.
6. Inspect/restrict any recurring allowance, create a single-price session, approve by passkey and verify it is currently active.
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
