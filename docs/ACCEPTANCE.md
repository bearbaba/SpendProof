# SpendProof — Acceptance gate (Kite track)

Status: **In development. Not submission-ready.** The target is product-quality 9.5/10, not an achieved judge score.

## Definition of done

| Requirement | Current state | Exit criteria |
| --- | --- | --- |
| Clear purpose and intuitive flow | Implemented in source | Responsive browser acceptance on desktop and mobile |
| Deterministic cost controls | 9 unit tests pass locally | Tests and CI pass on GitHub |
| Input constraints (unsafe URLs, unsupported POST) | Implemented | Negative inputs do not trigger inference or handoff |
| SERV Reasoning | API integration in source, unverified live | Real authorized inference, schema-validated decision, visible model and errors |
| Signed decision receipt | 4 unit tests pass locally | Live signing and public signature verification in the deployed app |
| Kite discovery | CLI handoff template in source | Verified catalog service ID and pricing, not hypothetical URL |
| Kite spending session | CLI handoff template in source | Human passkey-approved session with scoped limits |
| x402 payment | Not executed | Successful real/sandbox (as allowed by track) Kite payment and receipt, no placeholder |
| Failure path | Implemented for policy failures | Live invalid-key, expired-session, insufficient-budget and provider-error acceptance |
| Public demo and X post | Not available | Published public demo, concise walkthrough and tagged @openservai post |

## Required reproducible demo

1. Choose the Within budget fixture, run local checks, observe **REVIEW**, not APPROVED/PAID.
2. Choose Over spending cap, observe **BLOCK**.
3. Choose Missing evidence, observe **BLOCK**.
4. Configure SERV credentials and the audit signing secret. Run the live SERV assessment, inspect explanation and signed decision.
5. Verify decision signature using the in-app audit action and export the JSON record.
6. Discover a real x402 service with Kite; inspect the live offering and costs.
7. Request a narrow spending session and approve using a passkey, outside SpendProof.
8. Execute a permitted paid request with Kite; collect an actual receipt and external activity/transaction evidence.
9. Confirm no automatic payment was attempted by the SpendProof browser or server.

Important: a signed SpendProof **decision** is not a merchant certificate, payment proof, or an onchain attestation. The budget in the web form is advisory until reproduced in the passkey-approved Kite session.
