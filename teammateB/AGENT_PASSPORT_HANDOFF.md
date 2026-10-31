# Persistent Agent Passport Handoff

After this backend branch reaches `main`, B can integrate the agent screens with real persistence. Use the existing version 1 Passport and list shapes; do not keep fixture fallback on these implemented routes.

## Endpoints

| Route | Requirements | Response |
| --- | --- | --- |
| `POST /v1/principals/{id}/agents` | Session, Origin, CSRF; owner/admin | `201 AgentPassportResponse` |
| `GET /v1/principals/{id}/agents` | Session; active principal membership | `AgentListResponse` |
| `GET /v1/agents/{id}/passport` | Public identity subset | `AgentPassportResponse` |
| `POST /v1/agents/{id}/pause` | Session, Origin, CSRF; owner/admin | Updated Passport |
| `POST /v1/agents/{id}/resume` | Session, Origin, CSRF; owner/admin | Updated Passport |
| `POST /v1/agents/{id}/revoke` | Session, Origin, CSRF; owner/admin | Updated Passport |
| `POST /v1/agents/{id}/keys/rotate` | Session, Origin, CSRF; owner/admin | Updated Passport |

Lists use `limit` (default 20, maximum 100) and `offset` (default 0). Ordering is creation time, then UUID. Revoked agents remain in the owner's list for inspection.

## Authority and lifecycle

- Creation requires an active, `demo_verified` principal.
- Agent role must be present in the principal's business roles.
- Requested permissions must fit both the server catalog and the principal's persisted ceiling.
- Buyer capabilities: `request_quote`, `evaluate_offers`.
- Seller capabilities: `receive_rfq`, `generate_offer`.
- Allowed tools for either role: `marketplace_search`, `benchmark_compare`.
- Buyer strategy: `default`. Seller strategies: `default`, `margin`, `clearance`, `payment_risk`, `adversarial` (synthetic red-team profile).
- Permission names must be unique, 1–64 characters; at most 30 per list.
- Operators/viewers can inspect their roster, but cannot create or manage signing identities.
- Pause is reversible; revoke is terminal. Repeating the current state does not create a new version.
- Rotation increments key and Passport versions, changes the fingerprint and revokes the previous key.

## Display rules

- Display real returned IDs, lifecycle state, versions and fingerprint.
- New agents have no commercial rating; show limited history rather than inventing a score.
- Security restriction is separate from market rating.
- The public Passport contains no private ciphertext, nonce, actor identity or principal policy ceiling.
- `404` means the resource is unavailable to the caller; `403` means management is forbidden.
- `409` means the principal/lifecycle state is incompatible; `422` means the permission/profile request violates policy.
- `503` on creation/rotation means the signing-key encryption secret is not configured safely. Do not replace this failure with a fake Passport.

## Backend setup

Before creating agents, Main must configure a high-entropy `AGENT_KEY_ENCRYPTION_SECRET` of at least 32 characters. Generate one locally with `python -c 'import secrets; print(secrets.token_urlsafe(32))'`. Never commit it or put it in a `NEXT_PUBLIC_*` value.

Private Ed25519 keys are encrypted with AES-GCM and bound to their agent UUID and key version. Agent lifecycle actions append audit records. Internal signing/verification primitives are tested, but signed negotiation envelopes, task mandates, nonce/replay checks and tool execution remain later backend work.
