# Project TODO

Updated: 2026-11-01. This is the authoritative P0 delivery checklist.

## Current state

**The core synthetic procurement flow works end to end. This is a demo release candidate, not a production-ready marketplace.**

- PR #16 merged DevB and DevC into `main` at `a92c7c6`.
- PR #15 was closed because its DevC commits were included in PR #16.
- PR #17 merged the verified DevA integration into `main` at `fa092d6`. Both required API/Web workflow runs passed. Feature work is frozen for rehearsal.
- PR #16's passing unit tests did not prove live workflow integration. Its buyer approval, seller quotation and Mini App results still used local simulation.
- The follow-up replaces those simulated outcomes with real backend requests. Web and Mini App share `LiveWorkflow.tsx`.
- Local verification passed: **310 API tests** (two PostgreSQL tests run separately), **46 Web tests**, **77 Bot tests**, lint, strict type checks and production Web build.
- Real PostgreSQL verification passed: identity integration, 40-SKU workflow through settlement, migration upgrade/drift/downgrade/re-upgrade.
- **Remaining work is listed below. Do not describe every P0 requirement as finished.**

## Status and ownership

- `[x]` Implemented and checked locally, or previously merged with passing CI.
- `[ ]` Incomplete or not verified. A passing build does not replace a live browser rehearsal.
- DevA owns backend, contracts, integration and release. DevB owns Web/Mini App/Bot. DevC owns pure domain modules.
- Only synthetic identities, verification, delivery history and payments are used. No real funds move.

## Phase 0 — Repository, contracts and delivery

- [x] Repository, protected main branch, team ownership, setup and CI.
- [x] Versioned identity, verification, Telegram, Passport and marketplace schemas/fixtures.
- [x] Task, procurement policy, signed envelope, negotiation, offer, deal, approval, receipt, replay, security, memory and notification contract packs.
- [x] API, Web and Bot install/test/lint/type-check targets.
- [x] Review and merge PR #7 and marketplace PRs #11–13. Earlier PR #7 blockers are resolved.
- [x] Merge combined DevB/DevC PR #16; close superseded PR #15.
- [x] Merge the follow-up integration after required CI passes; freeze main features (PR #17).

## Phase 1 — Identity and Agent Passport

- [x] Users, opaque sessions, expiry/logout, CSRF and allowed origins.
- [x] Principals, memberships, roles and synthetic verification.
- [x] Single-use Telegram linking and unlinking.
- [x] Agent creation, pause/resume/revoke, key rotation and authority ceilings.
- [x] Encrypted Ed25519 signing identities and append-only lifecycle events.
- [x] Registration, login, business, verification and Passport interfaces.
- [x] Identity/authority tests and real PostgreSQL integration.
- [ ] Rehearse real Telegram linking and deployed browser session behavior.

## Phase 2 — Catalogue and seller workspace

- [x] Exactly 40 synthetic Diwali SKUs, one buyer and four distinct seller principals.
- [x] Product/inventory persistence, discovery filters and public seller profiles.
- [x] Real catalogue, seller discovery, inventory update and commercial policy interfaces.
- [x] Full-catalogue basket selection from live products; no invented product identities.
- [x] Explainable backend offer ranking and evidence display.
- [x] Seller-scoped RFQ reads; buyer budget and ranking inputs remain private.
- [ ] Full responsive, keyboard and accessibility browser audit.

## Phase 3 — Mandates, protocol and negotiation

- [x] Create/read/list/cancel tasks with principal membership and agent authority checks.
- [x] Owner/admin procurement policies; tasks can narrow but cannot exceed those policies.
- [x] Canonical signed envelopes with participant, state, time, hash, signature and nonce/replay checks.
- [x] Concurrent deterministic seller jobs, failure isolation, multiple rounds and anonymous benchmark counters.
- [x] Structured quantity/unit/product, arithmetic, stock, floor, budget, payment, deadline and expiry validation.
- [x] Latest eligible offers only; backend recommendation and weighted explanations.
- [x] Live task launch, seller messages/signatures, offer comparison and persisted state reload in Web/Mini App.
- [x] Failure paths no longer invent successful launches, signatures, approvals or receipts.
- [x] 40-SKU workflow tested against SQLite and real PostgreSQL.
- [ ] Complete exhaustive concurrent launch/accept/settlement load and race tests.

## Phase 4 — Trust and security

- [x] Merge DevC pure deterministic domain and its 107 tests.
- [x] Integrate DevC's tool-less seller-note classifier into the persisted workflow.
- [x] Benchmark-backed discount checks and distinct-principal collusion review signals.
- [x] Persist incident rules, evidence, actions and audit events.
- [x] Keep trust/history confidence separate from market rating; no invented rating for new sellers.
- [x] Display backend-provided security evidence without browser-computed fraud scores.
- [ ] Consolidate remaining service strategy/validation/ranking implementations onto DevC's full domain API. The current persisted service implementations work but still duplicate that logic.
- [ ] Reconcile policy for otherwise-valid offers with malicious notes. Current workflow invalidates the offer; the domain classifier supports note quarantine.

## Phase 5 — Deal, approval and mock payment

- [x] Bind deal lock to the latest signed final offer and its exact payload hash.
- [x] Reserve inventory and persist immutable deal snapshot/version/hash.
- [x] Single-use, user-bound approval challenge; reject stale versions, altered snapshots and expired terms.
- [x] Require explicit owner/admin approval before idempotent mock settlement.
- [x] Reject settlement after participant revocation, expiry or snapshot change.
- [x] Release reservations on rejection/expiry; consume them on settlement.
- [x] Clearly labeled mock receipt with upfront amount, contracted total and balance due.
- [x] Web/Mini App fetch current terms before approval and use a stable settlement idempotency key.
- [x] Tests cover stale approval UI, failed launch, replay tampering, settlement refusal and duplicate payment requests.
- [x] Telegram links navigate to authenticated approval; a link or Bot command never authorizes payment.

## Phase 6 — Replay, memory and Telegram

- [x] Material workflow events and Decision Replay.
- [x] Supplier memory with source event, scope, timestamp, confidence and synthetic provenance.
- [x] Authorized memory dispute/correction; revoked memberships cannot read private evidence.
- [x] Seeded due proactive trigger and trusted worker processing endpoint.
- [x] Notification claim/ack with five-minute lease recovery, failed delivery retries and idempotent delivered acknowledgement.
- [x] Bot lifecycle worker, `/task`, `/link`, informational `/status`, help and validated deep links.
- [x] Configurable HTTPS public application URL; no hardcoded localhost links presented as deployed links.
- [x] Live Mini App mandate, Passport, rounds, comparison, approval, replay and evidence views.
- [ ] Verify live notification delivery with real Telegram credentials and deployed session/CORS configuration.
- [ ] Telegram delivery is at-least-once, not exactly-once. A crash after sending can cause redelivery.

## Phase 7 — Verification and release

- [x] API lint/format/strict mypy and automated regression suite.
- [x] Web ESLint/TypeScript, 46 tests and production Next.js build.
- [x] Bot Ruff/strict mypy and 77 tests, including worker retry/lifecycle behavior.
- [x] Real PostgreSQL identity tests and full 40-SKU negotiation/approval/payment/replay scenario.
- [x] Migration head `20261101_0007`: clean upgrade, no drift, downgrade to base, re-upgrade, no drift.
- [x] Safe idempotent `make seed` inserts missing synthetic data without resetting existing permissions or reservations.
- [x] `make demo` runs domain validation and isolated API workflow regression tests without changing the configured demo database.
- [ ] Destructive `make reset-demo` remains intentionally blocked. Use a fresh dedicated demo database; do not reset shared data.
- [ ] Complete automated browser-to-live-API end-to-end coverage. Current UI tests mock the HTTP boundary; real PostgreSQL API flow is checked separately.
- [ ] Complete live browser/Telegram rehearsal and capture screenshots or a backup recording.
- [x] Record known limitations instead of marking incomplete work complete.

## Demo boundaries

- Use the seeded buyer for the fastest rehearsal. New buyer businesses need an owner/admin procurement policy through `/v1/tasks/policies/{principal_id}`; no policy editor is provided yet.
- Text task creation is deliberately limited: request the full Diwali basket and an explicit INR budget. It is not a general natural-language order parser.
- Negotiation completes within one launch request. The timeline shows persisted rounds after completion; it is not a streaming feed.
- Seller quotations are generated by backend strategies. There is no manual seller quote submission API.
- Tax, real KYC, real UPI, fulfillment verification and financial reconciliation are outside this synthetic demo.
- Bot editor imports use the dedicated virtual environment; two root-editor import annotations document the split. Fresh canonical-path LSP and session diagnostics report no blocking errors.
