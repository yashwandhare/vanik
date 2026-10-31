# Project TODO

This checklist tracks delivery of the P0 hackathon scope. It does not indicate that documented features are already implemented.

## Status rules

- `[ ]` Not started or not verified.
- `[x]` Completed and verified.
- Main owns backend, contracts, security, integration and release work.
- Teammate B owns the marketplace interfaces and Telegram clients.
- A phase closes only after its checkpoint passes.

## Current snapshot

- **Phase 0:** Repository/contracts/backend and B web/Bot foundation are merged and CI-verified through PR #7.
- **Phase 1:** Identity, verification, Telegram linking, Agent Passports and corresponding client screens are implemented. The complete live Web/Telegram demo checkpoint still requires rehearsal.
- **Phase 2:** Catalogue/inventory/discovery and deterministic 40-SKU seeding are implemented; task-specific ranking and B marketplace wiring remain pending.
- **Phases 3–7:** Not complete. The task draft is not exposed as an API; signed envelopes, negotiation, trust, deals, complete replay/memory, deterministic reset and rehearsal remain pending.

## Phase 0 — Repository, scope and contracts

### Main

- [x] Organize product, engineering and delivery documentation.
- [x] Publish Main and Teammate B ownership boundaries.
- [x] Create phased project and Teammate B checklists.
- [x] Add repository ignore rules for secrets and generated files.
- [x] Initialize Git and connect the project GitHub repository.
- [x] Configure `main` as the protected integration branch.
- [x] Select and record the initial backend, frontend, bot and cryptography versions.
- [x] Define the Phase 1 authentication and session design.
- [x] Define API route, pagination and error conventions.
- [x] Publish initial identity schemas and representative JSON fixtures.
- [x] Create the backend skeleton, configuration and database connection code.
- [x] Verify the real PostgreSQL integration tests in CI.
- [x] Publish identity, verification, Telegram-linking and Agent Passport contract packs before dependent client integration.
- [ ] Publish marketplace, task, negotiation, trust, deal and event contract packs before dependent client integration.

### Teammate B

- [x] Complete the reading sequence in `teammateB/ONBOARDING.md`.
- [x] Confirm ownership and contract boundaries with Main.
- [x] Create the Next.js, TypeScript and Tailwind application skeleton after authorization.
- [x] Establish routes, layout, navigation, design tokens and API client boundaries.
- [x] Create contract-aligned mock fixtures only after Main publishes schemas.
- [x] Create the Telegram Bot skeleton after Main confirms the library and contract.
- [x] Merge the verified web/Bot foundation through PR #7 after clean install and required CI pass.

### Checkpoint

- [x] Both developers confirm the same routes, fields, state names and error format.
- [x] Backend, web and bot skeletons pass their initial lint and test commands.

## Phase 1 — Identity, registration and Agent Passport

### Main

- [x] Implement users, principals, memberships and business roles.
- [x] Implement authentication, session expiry and logout.
- [x] Implement explicitly simulated verification states.
- [x] Implement short-lived, single-use Telegram linking tokens.
- [x] Implement agent creation, lifecycle and ownership checks.
- [x] Generate and protect Ed25519 signing identities.
- [x] Implement Agent Passport responses and principal authority ceilings.
- [x] Add unit tests for authentication, CSRF and principal authority boundaries.
- [x] Verify the identity, verification, Telegram and Agent Passport migrations/integration flows against PostgreSQL in CI.

### Teammate B

- [x] Build registration and login screens.
- [x] Build business profile, role selection and simulated verification views.
- [x] Build Telegram linking instructions and status views.
- [x] Build agent creation and agent list screens.
- [x] Build Agent Passport views.
- [x] Add loading, validation, empty, permission and error states.
- [x] Add UI tests for the identity flow.

### Checkpoint

- [ ] A demo user can register a synthetic business, see `demo_verified`, link Telegram and create an Agent Passport.

## Phase 2 — Marketplace and catalogue

### Main

- [x] Implement product, catalogue and inventory persistence.
- [x] Implement seller profiles and marketplace discovery APIs.
- [x] Implement search and filters for category, coverage, stock, delivery and credit.
- [ ] Implement explainable task-specific ranking inputs and responses.
- [x] Seed exactly 40 distinct Diwali SKUs with internally consistent prices and quantities.
- [x] Seed at least three legitimate seller principals and one adversarial principal.
- [x] Test principal grouping, catalogue arithmetic and discovery behavior.

### Teammate B

- [ ] Build marketplace overview and seller discovery pages.
- [ ] Build seller cards and seller profile pages.
- [ ] Build catalogue and inventory tables.
- [ ] Build search, filter and sort controls.
- [ ] Build ranking-factor and evidence views.
- [ ] Build the seller inventory and business-profile workspace.
- [ ] Add responsive and accessibility checks for marketplace views.

### Checkpoint

- [ ] The UI displays real API data for distinct seller principals and all 40 requested SKUs.

## Phase 3 — Protocol and negotiation

### Main

- [ ] Finalize canonical signed message schemas.
- [ ] Implement mandate-authorized signed message envelopes, replay protection and message expiry using the existing Ed25519 identity primitive.
- [ ] Implement the negotiation state machine and valid transitions.
- [ ] Implement concurrent per-seller RFQ dispatch with timeout isolation.
- [ ] Implement margin, clearance and payment-risk seller strategies.
- [ ] Implement deterministic stock, quantity, price, budget, delivery and credit validation.
- [ ] Implement multi-round counters with anonymized benchmark data.
- [ ] Test signatures, invalid transitions, timeouts and seller isolation.

### Teammate B

- [ ] Build the negotiation workspace and live activity feed.
- [ ] Build RFQ and structured offer detail views.
- [ ] Build side-by-side line-item comparison.
- [ ] Build negotiation timeline and status indicators.
- [ ] Build pending, rejected, withdrawn, expired and invalid states.
- [ ] Build seller-side incoming RFQ and offer views required by the demo.
- [ ] Add UI tests against Main's published negotiation states.

### Checkpoint

- [ ] One buyer negotiates with at least three seller principals in parallel without cross-seller state leakage.

## Phase 4 — Trust, security and explainability

### Main

- [ ] Treat seller notes and catalogue text as untrusted input.
- [ ] Implement a tool-less prompt-injection classification boundary.
- [ ] Implement benchmark-backed fake-discount checks.
- [ ] Implement basic collusion signals across distinct principals.
- [ ] Keep market rating, trust confidence and security status separate.
- [ ] Record evidence, rules, outcomes and security events.
- [ ] Test malicious content, false claims, principal grouping and incident isolation.

### Teammate B

- [ ] Build security warning and suspicious-offer indicators.
- [ ] Build trust, rating and evidence explanation panels.
- [ ] Build security event detail views.
- [ ] Label review signals separately from confirmed violations.
- [ ] Display backend-provided evidence without calculating fraud or trust scores in the UI.

### Checkpoint

- [ ] The seeded adversarial seller is detected and explained without blocking valid structured seller data.

## Phase 5 — Deal, approval and mock payment

### Main

- [ ] Require matching accepted structured terms before deal lock.
- [ ] Store immutable deal versions and exact line items.
- [ ] Bind approval to the complete canonical deal hash and one-time nonce.
- [ ] Invalidate approval after any material deal change.
- [ ] Implement an idempotent, explicitly simulated UPI transition.
- [ ] Generate a clearly labeled mock receipt and audit events.
- [ ] Test stale approvals, duplicate requests, authorization and settlement failures.

### Teammate B

- [ ] Build exact deal summary and warning views.
- [ ] Build approve and reject interactions.
- [ ] Build deal status and simulated receipt views.
- [ ] Build Telegram approval messages and callbacks against Main's API.
- [ ] Prevent stale UI state from appearing to authorize changed or expired deals.
- [ ] Add UI and bot tests for approval outcomes.

### Checkpoint

- [ ] A deal completes only after valid human approval, and duplicate settlement requests do not create duplicate payments.

## Phase 6 — Events, Telegram, proactivity and memory

### Main

- [x] Implement append-only Agent Passport lifecycle and key-rotation events.
- [ ] Extend append-only material event history across tasks, negotiations, security decisions and deals.
- [ ] Implement Decision Replay from recorded events.
- [ ] Implement supplier memory with source, time, scope and evidence.
- [ ] Implement one scheduled or seeded proactive trigger.
- [ ] Implement authorized notification APIs and delivery tracking.
- [ ] Test memory provenance, corrections and proactive trigger behavior.

### Teammate B

- [ ] Complete Telegram Bot task, status and notification commands.
- [ ] Complete Mini App mandate, Passport, comparison, approval and timeline views.
- [ ] Add authorized deep links between Telegram and web views.
- [ ] Add bot and Mini App failure states.
- [ ] Connect proactive notifications to Main's notification contract.

### Checkpoint

- [ ] A proactive alert occurs without a new prompt, and a verified prior event affects a later ranking with visible evidence.

## Phase 7 — Integration, testing and demo freeze

### Main

- [x] Implement functional API install, development, tests, lint, format, type-check and migration targets.
- [ ] Integrate verified web/Bot targets and implement deterministic seed, demo and reset targets.
- [x] Run identity/authority backend unit, PostgreSQL integration and security tests.
- [ ] Run negotiation state-machine, trust, deal and full end-to-end tests.
- [x] Verify implemented API authorization and principal isolation.
- [x] Verify migration upgrade, drift, downgrade and re-upgrade behavior from clean PostgreSQL in CI.
- [ ] Verify deterministic seed and reset behavior from a clean environment.
- [ ] Integrate and review Teammate B PR #7; currently blocked by failed required CI and unresolved review findings.
- [ ] Freeze `main` before final rehearsal.

### Teammate B

- [ ] Run frontend, bot and Mini App tests.
- [ ] Verify responsive layout and accessibility basics.
- [ ] Verify loading, empty, error and permission states.
- [ ] Verify consistent task and deal state across all interfaces.
- [ ] Prepare screenshots and demo navigation notes.
- [ ] Stop feature additions after Main declares the freeze.

### Checkpoint

- [ ] Complete the full demo runbook from a clean deterministic reset.
- [ ] Confirm the main negotiation sequence completes predictably within the target duration.
- [ ] Confirm no real identity verification, financial data or payment is used.
- [ ] Record all remaining limitations before release.
