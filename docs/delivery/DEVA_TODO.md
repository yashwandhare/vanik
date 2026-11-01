# DevA TODO — Integration and Backend Critical Path

Updated after merged PR #17 (`fa092d6`). See [Project TODO](PROJECT_TODO.md) for the authoritative release status.

## Task and protocol

- [x] Typed task/mandate contracts and migrations.
- [x] Create/read/list/cancel with membership, principal policy and agent authority enforcement.
- [x] Canonical signed envelopes, nonce replay protection, message expiry and state transitions.
- [x] Concurrent per-seller job isolation and multi-round counters.

## Negotiation, trust and ranking

- [x] Persist negotiations, messages, offers, structured line items and security incidents.
- [x] Record prompt-injection, fake-discount and collusion evidence/actions.
- [x] Keep seller inputs free of buyer budget and competitor identities.
- [x] Integrate DevC's tool-less note classifier; merge its pure domain and 107 tests through PR #16.
- [ ] Consolidate service strategies, validation and ranking onto the remaining DevC domain functions.
- [ ] Reconcile note quarantine versus whole-offer invalidation policy.

## Deals and completion

- [x] Exact final-offer binding, stock reservations and immutable deal snapshot hash.
- [x] Single-use human approval challenge and stale-version checks.
- [x] Idempotent mock UPI settlement and labeled receipt.
- [x] Replay, supplier memory, corrections/disputes, proactive triggers and authorized notification queues.
- [x] Reject expired/changed/revoked-participant settlement; release rejected/expired reservations.

## Demo and integration

- [x] Safe seed, domain validator and isolated `make demo` workflow checks.
- [ ] Destructive reset remains disabled; use a fresh dedicated demo database.
- [x] Publish workflow schemas/fixtures and replace fake client workflow outcomes with live APIs.
- [x] Merge DevB/DevC PR #16 and DevA integration PR #17 with passing required CI.
- [x] Run API/PostgreSQL/Web/Bot tests, production build and migration round-trip/drift checks.
- [x] Run full 40-SKU API workflow against real PostgreSQL.
- [ ] Add exhaustive concurrency and browser-to-live-API automation.
- [ ] Rehearse deployed Telegram, cookies/CORS and browser interactions; capture a backup recording.
- [x] Update master TODO with verified work and explicit remaining engineering/manual limitations.
