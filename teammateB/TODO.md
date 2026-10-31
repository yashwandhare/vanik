# Teammate B TODO

This checklist contains only Teammate B work. Main publishes and owns the backend contracts that these tasks consume.

## Phase 0 — Setup and contracts

- [x] Read all files listed in `teammateB/ONBOARDING.md`.
- [x] Track or create `devb` and confirm it is the only B working and push branch.
- [x] Confirm the frontend framework, Node version, package manager and test tools.
- [x] Create the Next.js, TypeScript and Tailwind skeleton after authorization.
- [x] Configure lint, type-check, test and build commands.
- [x] Establish route groups, layout, navigation and design tokens.
- [x] Create a typed API client boundary.
- [x] Create mock fixtures only from Main-approved schemas.
- [x] Create the Telegram Bot skeleton after Main confirms the library.

**Dependency:** Main must publish authentication, errors, routes and shared schemas.

**Checkpoint:** Initial web and bot checks pass, and both developers confirm the contract fields.

## Phase 1 — Registration and Agent Passport

- [x] Build registration and login screens.
- [x] Build business profile and role-selection screens.
- [x] Build clearly labeled simulated-verification states.
- [x] Build Telegram linking instructions and status.
- [x] Build agent creation and agent list screens.
- [x] Build Agent Passport details and public-key fingerprint presentation.
- [x] Add loading, validation, empty, forbidden and error states.
- [x] Add UI, component, and contract regression tests for onboarding flow (17 Vitest tests passing).

**Dependency:** Main must provide identity, principal, verification, Telegram-link and agent endpoints.

**Checkpoint:** The client completes synthetic registration and Agent Passport flow; PR #7 opened with green CI.

## Phase 2 — Marketplace and catalogue

- [x] Build marketplace overview metrics and live tabbed workspace.
- [x] Build seller discovery cards and filters (query, coverage region, max delivery days, min credit terms).
- [x] Build catalogue ledger table consuming live `/v1/catalogue/products` (40-SKU basket, benchmark pricing).
- [x] Build search and category filter controls with live backend synchronization.
- [x] Build unrated history presentation (`reliability_score: null`, 0 trade outcomes) and synthetic seller tags.
- [x] Build live seller inventory inspector drawer (`GET /v1/principals/{id}/agents/{agent_id}/inventory`).
- [x] Build authenticated stock updater with error surfacing for 401/403/404/409/422 (`POST .../inventory`).
- [x] Add responsive layout, keyboard accessibility, Tab cycle trapping, and ARIA roles.
- [x] Add comprehensive regression test suite (28 Vitest tests passing across client, components, contexts).

**Dependency:** Main provided `/v1/catalogue/products`, `/v1/marketplace/sellers`, `/v1/principals/{id}/agents/{agent_id}/inventory`.

**Checkpoint:** The marketplace uses real seeded data, renders the 40-SKU catalogue, discovers distinct seller agents, and supports authenticated stock reconciliation.

## Phase 3 — Negotiation workspace

- [ ] Build live task and negotiation activity views.
- [ ] Build RFQ and offer details.
- [ ] Build side-by-side line-item offer comparison.
- [ ] Build negotiation timelines and status indicators.
- [ ] Build seller incoming-RFQ and offer views required for the demo.
- [ ] Handle pending, rejected, withdrawn, expired, cancelled and invalid states.
- [ ] Add tests for every published state and major transition displayed by the UI.

**Dependency:** Main must publish message examples, negotiation states, event fields and action endpoints.

**Checkpoint:** UI state matches backend state during parallel seller negotiations.

## Phase 4 — Trust and explainability

- [ ] Build prompt-injection and suspicious-content warnings.
- [ ] Build fake-discount evidence presentation.
- [ ] Build market rating, trust confidence and security status as separate views.
- [ ] Build security-event and evidence details.
- [ ] Label collusion and anomaly signals as review signals, not confirmed fraud.
- [ ] Add tests for safe rendering of untrusted seller text.

**Dependency:** Main must provide structured security results, evidence and status fields.

**Checkpoint:** The adversarial demo is clearly explained without client-side fraud or trust calculations.

## Phase 5 — Deal and approval

- [ ] Build the exact final deal summary.
- [ ] Build approval and rejection interactions.
- [ ] Build deal status, expiration and invalidation states.
- [ ] Build the clearly labeled simulated-payment receipt.
- [ ] Build Telegram approval messages and callbacks.
- [ ] Handle stale versions, expired challenges, forbidden actions and duplicate requests.
- [ ] Add UI and bot tests for approval outcomes.

**Dependency:** Main must provide deal, challenge, approval, settlement and receipt contracts.

**Checkpoint:** A stale or changed deal cannot appear approved, and successful settlement is shown only after backend confirmation.

## Phase 6 — Telegram and Mini App

- [ ] Complete Bot commands for linking, task creation and status.
- [ ] Complete offer, security, progress and approval notifications.
- [ ] Build Mini App mandate review and edit.
- [ ] Build Mini App Passport, offer comparison, approval and timeline views.
- [ ] Add authorized deep links between Telegram and web routes.
- [ ] Handle Bot and Mini App errors, expired sessions and permission failures.
- [ ] Connect proactive alerts to Main's notification interface.

**Dependency:** Main must provide task parsing, notifications, proactive triggers and authorization contracts.

**Checkpoint:** Web, Bot and Mini App show consistent state from the same backend.

## Phase 7 — Integration and demo freeze

- [ ] Run frontend and bot unit and integration tests.
- [ ] Run lint, type checks and production builds.
- [ ] Verify responsive behavior and accessibility basics.
- [ ] Verify all loading, empty, error and permission states.
- [ ] Rehearse the complete demo from a clean reset with Main.
- [ ] Prepare screenshots and concise demo navigation notes.
- [ ] Fix integration defects only on `devb`.
- [ ] Stop adding features after Main declares the freeze.

**Dependency:** Main must provide stable integration, deterministic seed/reset and a release candidate.

**Checkpoint:** Main accepts the PRs and the complete demo runbook passes from a clean reset.
