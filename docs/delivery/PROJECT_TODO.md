# Project TODO

This checklist tracks delivery of the P0 hackathon scope. It does not indicate that documented features are already implemented.

## Status rules

- `[ ]` Not started or not verified.
- `[x]` Completed and verified.
- Main owns backend, contracts, security, integration and release work.
- Teammate B owns the marketplace interfaces and Telegram clients.
- A phase closes only after its checkpoint passes.

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
- [ ] Publish the remaining Telegram, marketplace and commerce contract packs before their dependent client work.

### Teammate B

- [ ] Complete the reading sequence in `teammateB/ONBOARDING.md`.
- [ ] Confirm ownership and contract boundaries with Main.
- [ ] Create the Next.js, TypeScript and Tailwind application skeleton after authorization.
- [ ] Establish routes, layout, navigation, design tokens and API client boundaries.
- [ ] Create contract-aligned mock fixtures only after Main publishes schemas.
- [ ] Create the Telegram Bot skeleton after Main confirms the library and contract.

### Checkpoint

- [ ] Both developers confirm the same routes, fields, state names and error format.
- [ ] Backend, web and bot skeletons pass their initial lint and test commands.

## Phase 1 — Identity, registration and Agent Passport

### Main

- [x] Implement users, principals, memberships and business roles.
- [x] Implement authentication, session expiry and logout.
- [x] Implement explicitly simulated verification states.
- [x] Implement short-lived, single-use Telegram linking tokens.
- [ ] Implement agent creation, lifecycle and ownership checks.
- [ ] Generate and protect Ed25519 signing identities.
- [ ] Implement Agent Passport responses and principal authority ceilings.
- [x] Add unit tests for authentication, CSRF and principal authority boundaries.
- [x] Verify the identity migration and integration flow against PostgreSQL in CI.

### Teammate B

- [ ] Build registration and login screens.
- [ ] Build business profile, role selection and simulated verification views.
- [ ] Build Telegram linking instructions and status views.
- [ ] Build agent creation and agent list screens.
- [ ] Build Agent Passport views.
- [ ] Add loading, validation, empty, permission and error states.
- [ ] Add UI tests for the identity flow.

### Checkpoint

- [ ] A demo user can register a synthetic business, see `demo_verified`, link Telegram and create an Agent Passport.

## Phase 2 — Marketplace and catalogue

### Main

- [ ] Implement product, catalogue and inventory persistence.
- [ ] Implement seller profiles and marketplace discovery APIs.
- [ ] Implement search and filters for category, coverage, stock, delivery and credit.
- [ ] Implement explainable task-specific ranking inputs and responses.
- [ ] Seed exactly 40 distinct Diwali SKUs with internally consistent prices and quantities.
- [ ] Seed at least three legitimate seller principals and one adversarial principal.
- [ ] Test principal grouping, catalogue arithmetic and discovery behavior.

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
- [ ] Implement Ed25519 signing and verification.
- [ ] Implement key status, replay protection, nonce tracking and expiry checks.
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

- [ ] Implement append-only material event history.
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

- [ ] Implement functional Make targets for install, development, tests, lint, format, migrations, seed, demo and reset.
- [ ] Run backend unit, integration, state-machine and security tests.
- [ ] Verify API authorization and principal isolation.
- [ ] Verify migration, seed and reset behavior from a clean environment.
- [ ] Integrate and review Teammate B pull requests.
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
