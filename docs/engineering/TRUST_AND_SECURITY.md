# VANIK — Trust and Security

## 1. Threat model

Threats include forged agent identity, replayed messages, malicious seller text, fake discounts, manipulated inventory, colluding sellers, mandate escalation, duplicate approvals and unauthorised settlement.

## 2. Identity and message authenticity

- Each agent receives an Ed25519 keypair.
- Public key and fingerprint are associated with its Passport.
- Private key remains server-side in the hackathon implementation.
- Signed envelope includes sender, recipient, message ID, timestamp, nonce, negotiation/task IDs and payload hash.
- Reject invalid signatures, unknown/revoked keys, duplicate nonces and expired messages.
- Key rotation increments key version and records an audit event.

## 3. Authority boundaries

- Principal permissions define maximum authority.
- Task mandate can narrow but never expand principal authority.
- Every tool call and state-changing action checks principal membership, agent status and active mandate.
- Agents cannot create their own approval or settlement authorisation.
- Revoked agents cannot send accepted messages or invoke tools.

## 4. Prompt injection

- Never disclose buyer maximum budget to seller agents.
- Treat seller free text, catalogue descriptions and external content as untrusted.
- Parse commercial terms from structured fields only.
- Run optional free-text classification in a tool-less context with no secrets or action tools.
- Never execute instructions embedded in seller content.
- Record detected attempts as security events.

## 5. Fake discounts

- Seed trusted benchmark prices for the demo catalogue.
- Compare advertised original price and offered price against benchmark.
- Flag implausible claimed savings and offers above benchmark despite claimed discounts.
- Show benchmark, seller claim, observed price and rule explanation in the UI.
- Avoid asserting fraud solely from one price anomaly.

## 6. Collusion signals

- Compare floor prices and timing across distinct seller principals.
- Flag suspiciously identical prices or synchronised counteroffers for review.
- Agents under the same principal are grouped and excluded from independent-principal collusion counts.
- A signal is not proof. Show evidence and confidence.

## 7. Trust dimensions

Keep three distinct dimensions:

- Market rating: verified commercial outcomes.
- Trust confidence: amount and quality of evidence available.
- Security status: identity/policy incidents and current security posture.

New agents should show limited history, not an invented poor rating. Security incidents do not automatically alter market rating.

## 8. Approval and payment

Approval challenge is single-use, short-lived and bound to a canonical hash of exact deal terms. Any change to seller, buyer, line items, amount, currency, payment destination or material terms invalidates the approval. Mock payment endpoint requires a valid approval record and idempotency key.

## 9. Demo privacy

Use synthetic identities and synthetic business data. Clearly label all simulated verification and creditworthiness indicators. Never request actual Aadhaar, PAN scans or bank statements for the prototype.
