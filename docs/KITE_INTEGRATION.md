# Kite Passport integration — manual catalog evidence and safe session handoff

SpendProof supports a **non-custodial, external CLI** handoff. As of November 2026, Kite documents Passport via the `kpass` and `ksearch` commands and **does not provide a public HTTP API reference**. Do not interpret this as a live Kite integration inside SpendProof.

Current official documentation:

- https://docs.gokite.ai/reference/kpass-cli
- https://docs.gokite.ai/passport/payments
- https://docs.gokite.ai/api-reference

## Integration boundaries

1. SpendProof validates a proposed API purchase against **8 deterministic controls**, including a GET-only policy.
2. A real configured SERV model evaluates the purchase. SpendProof issues a HMAC-signed decision receipt; it is **not a merchant certificate or payment receipt**.
3. The user discovers a **real service** with `ksearch services list`, then inspects it using `ksearch services get --service-id <ID>`.
4. The user enters the exact ID, URL and quoted price into SpendProof and explicitly acknowledges comparing them against the live CLI output. This is a **human attestation**, not a cryptographic catalog verification.
5. Only when all checks pass does SpendProof unlock the remaining CLI instructions.
6. The generated Kite spending session has both `--max-amount-per-tx` and `--max-total-amount` set to **exactly the one quoted amount**, with `--ttl 15m`.
7. The user executes the command in their trusted terminal, opens the approval link, and confirms with a passkey. SpendProof **never receives an authentication token or session secret**.
8. After a successful transaction, check the returned CLI data and `kpass activity --limit 20 --output json` and inspect Passport activity; don't present payment as verified before that.

## Fail-closed conditions

- A missing catalog service ID, URL mismatch, missing manual confirmation, or price mismatch blocks `session` and `execute` command creation.
- A malformed amount, budget overrun, unsupported POST, or no true SERV response blocks payment.
- A local policy pass or a copied service ID does **not** independently prove service existence or quoted terms.
- The sample `example.org` URLs are demonstration fixtures, not payable merchants.
- Expired sessions, payment failures, and status mismatches must be handled in the Kite terminal. Retry only after the actual failure is understood.

## Optional post-payment evidence comparison

After running the CLI, the Kite handoff screen accepts a manually entered session ID, service ID, exact paid URL, USDC amount, activity reference and reported status. It compares these against the reviewed intent and catalog values, then returns **MATCHED_UNVERIFIED** or **MISMATCH**. This is strictly a local reconciliation of user-supplied claims; it never queries Kite, confirms a blockchain transaction, or changes `paymentExecuted: false`. The audit JSON exports it under `externalObservation` with `coveredByServerSignature: false`.

Do not insert private keys, access tokens, passkeys, or session secrets. Check the actual transaction via Kite Passport before presenting it as executed.

## Next acceptance work

- Configure real SERV credentials and validate actual inference success/failure output.
- Confirm a real Kite catalog service and price (screenshots/redacted JSON).
- Authenticate a Kite CLI user; do not paste private keys, login codes, or session credentials into chat or into SpendProof.
- Approve a tightly scoped spending session via passkey.
- Execute one real or authorized sandbox x402 request and capture receipt/activity evidence.
- Compare `amount`, `service`, `status` and `tx` against the original intent. This verification is **not yet implemented automatically**.

User-facing records must keep `paymentExecuted: false` until separately verifiable evidence proves otherwise.
