# DevA TODO — Integration and Backend Critical Path

## Task and protocol

- [ ] Finalize typed Task/mandate contracts and migration.
- [ ] Implement create/read/list/cancel with membership, principal policy and agent authority enforcement.
- [ ] Implement canonical signed envelopes, nonce replay protection, message expiry and state transitions.
- [ ] Implement concurrent per-seller RFQ isolation and multi-round counters.

## Negotiation, trust and ranking

- [ ] Integrate DevC seller strategies, deterministic validators and ranking functions.
- [ ] Persist negotiations, messages, offers, line items and security incidents.
- [ ] Record prompt injection, fake-discount and collusion evidence/actions.
- [ ] Keep seller contexts free of buyer budget and competitor identities.

## Deals and completion

- [ ] Implement exact deal lock, stock reservations and immutable snapshot hash.
- [ ] Implement single-use approval challenge and stale-version invalidation.
- [ ] Implement idempotent mock UPI settlement and labeled receipt.
- [ ] Implement replay, supplier memory, proactive triggers and authorized notification queues.

## Demo and integration

- [ ] Complete safe `seed`, `reset-demo`, `demo` and validation commands.
- [ ] Publish every schema/fixture/handoff before DevB wiring.
- [ ] Review and merge DevC, then DevB.
- [ ] Run API/PostgreSQL/web/Bot tests, builds, migration drift/round-trip and end-to-end demo tests.
- [ ] Update the master TODO honestly; leave only user-dependent manual checks pending.
