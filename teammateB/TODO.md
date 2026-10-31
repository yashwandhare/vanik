# Teammate B TODO

This checklist contains only Teammate B work. Main publishes and owns the backend contracts that these tasks consume.

## Phase 0 — Setup and contracts

- [ ] Read all files listed in `teammateB/ONBOARDING.md`.
- [ ] Confirm the assigned branch with Main.
- [ ] Confirm the frontend framework, Node version, package manager and test tools.
- [ ] Create the Next.js, TypeScript and Tailwind skeleton after authorization.
- [ ] Configure lint, type-check, test and build commands.
- [ ] Establish route groups, layout, navigation and design tokens.
- [ ] Create a typed API client boundary.
- [ ] Create mock fixtures only from Main-approved schemas.
- [ ] Create the Telegram Bot skeleton after Main confirms the library.

**Dependency:** Main must publish authentication, errors, routes and shared schemas.

**Checkpoint:** Initial web and bot checks pass, and both developers confirm the contract fields.

## Phase 1 — Registration and Agent Passport

- [ ] Build registration and login screens.
- [ ] Build business profile and role-selection screens.
- [ ] Build clearly labeled simulated-verification states.
- [ ] Build Telegram linking instructions and status.
- [ ] Build agent creation and agent list screens.
- [ ] Build Agent Passport details and public-key fingerprint presentation.
- [ ] Add loading, validation, empty, forbidden and error states.
- [ ] Add UI tests for the complete onboarding flow.

**Dependency:** Main must provide identity, principal, verification, Telegram-link and agent endpoints.

**Checkpoint:** The client completes the synthetic registration and Agent Passport flow against the real API.

## Phase 2 — Marketplace and catalogue

- [ ] Build marketplace overview metrics and recent activity.
- [ ] Build seller discovery cards and filters.
- [ ] Build seller and business profile pages.
- [ ] Build catalogue and inventory tables.
- [ ] Build search, filter and sort controls.
- [ ] Build explainable ranking factors and evidence views.
- [ ] Build seller inventory and business-profile workspace.
- [ ] Add responsive, keyboard and accessible-name checks.

**Dependency:** Main must provide seller, catalogue, inventory, activity and ranking contracts.

**Checkpoint:** The marketplace uses real seeded data and shows distinct seller principals and the 40-SKU catalogue.

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
- [ ] Fix integration defects only on B-owned branches.
- [ ] Stop adding features after Main declares the freeze.

**Dependency:** Main must provide stable integration, deterministic seed/reset and a release candidate.

**Checkpoint:** Main accepts the PRs and the complete demo runbook passes from a clean reset.
