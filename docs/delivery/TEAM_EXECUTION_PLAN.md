# Two-Person Execution and Git Collaboration Plan

**Project:** VANIK

**Working model:** Two developers working in parallel.

**Authority:** `main` is the integration branch. Only Main may merge into `main`.

This plan divides delivery by ownership, dependencies and integration points. It is designed to keep both people productive without allowing two developers to modify the same core files unpredictably.

---

## 1. Roles and ownership

### Main — Project lead and core systems owner

Main owns the architecture, critical backend logic, integration and release decisions.

**Main is responsible for:**

- Repository structure, architecture decisions and shared contracts.
- Backend foundation, database models and migrations.
- Authentication, business principals, simulated verification and agent identity.
- Agent Passport and Ed25519 signing/verification.
- Task mandates and authority enforcement.
- Marketplace discovery and seller/inventory APIs.
- Negotiation protocol, state machine and parallel negotiation orchestration.
- Deterministic offer validation, trust/security checks and ranking logic.
- Deal locking, approval binding and mock UPI state transitions.
- Event/audit system, persistent supplier memory and proactive triggers.
- API integration, end-to-end tests, demo stability and final merges.
- Reviewing and merging all teammate pull requests.

Main is the only person allowed to merge code into `main`.

### Teammate B — Product interfaces and supporting integrations

B owns user-facing implementation and supporting client integrations, using the API contracts agreed with Main.

**B is responsible for:**

- Marketplace web UI: dashboard, seller discovery, seller profiles, catalogues and inventory views.
- Negotiation workspace: RFQs, offer comparison, negotiation timeline and deal summary.
- Seller workspace: seller agent activity, incoming RFQs, offers and performance views.
- Registration and onboarding screens, using Main's agreed API contract.
- Telegram Bot commands, notifications and approval interaction.
- Telegram Mini App: task mandate form, Agent Passport view, offer comparison and approval view.
- Frontend loading, empty, error and permission states.
- UI-level tests, responsive layout and accessibility basics.
- Integration fixes within B-owned files after Main exposes working endpoints.

B does not independently change core backend rules, database migrations, signing logic or negotiation state transitions. If a change to those is needed, B raises it to Main and waits for an agreed contract or implementation.

---

## 2. Repository and branch rules

### Branches

| Branch | Owner | Purpose |
| --- | --- | --- |
| `main` | Main only | Stable, integrated project |
| `feat/main-*` | Main | Main's own feature work |
| `feat/b-*` | Teammate B | B's feature work |
| `fix/main-*` | Main | Main-owned fixes |
| `fix/b-*` | Teammate B | B-owned fixes |

Examples:

- `feat/main-identity-api`
- `feat/main-negotiation-engine`
- `feat/b-marketplace-ui`
- `feat/b-telegram-bot`

### Non-negotiable rules

1. **Only Main merges into `main`.**
2. B must never push directly to `main`.
3. B pushes work only to B's own feature branch.
4. B opens a Pull Request (PR) targeting `main`; Main reviews and merges it.
5. B regularly pulls the latest `main` into B's feature branch to stay current.
6. Main also works on feature branches, then merges their own completed work into `main`.
7. No one force-pushes a shared branch. B may use `--force-with-lease` on B's private branch only after Main explicitly approves it.
8. Never commit secrets, `.env`, API keys, tokens, private signing keys, real business identifiers or personal data.
9. Do not commit generated build output, virtual environments, dependency folders or local databases.
10. A PR must not silently change a shared API contract. Update the contract and notify the other developer first.

### Initial setup

Main performs this setup only after the project lead provides the GitHub repository URL:

```bash
git switch -c feat/main-repo-setup
git add .
git commit -m "chore: initialise project structure"
git push -u origin feat/main-repo-setup
```

Main opens a PR and merges it into `main`.

Both developers then clone the repository:

```bash
git clone <REPOSITORY_URL>
cd <REPOSITORY_DIRECTORY>
git switch main
git pull --ff-only origin main
```

B starts work on a separate branch:

```bash
git switch -c feat/b-marketplace-ui
```

Main starts work on a separate branch:

```bash
git switch -c feat/main-backend-foundation
```

---

## 3. Phase-by-phase task division

Both developers work in parallel wherever contracts and dependencies permit. Each phase has a Main track, a B track, and an integration checkpoint.

### Phase 0 — Repository, scope and contracts

**Goal:** Agree on boundaries before parallel implementation begins.

**Main**

- Own the repository and branch protection rules.
- Confirm the architecture and P0 scope.
- Define API route conventions, error format and authentication approach.
- Define shared Pydantic/API response schemas and sample JSON fixtures.
- Create backend skeleton, configuration and database connection.
- Publish endpoint contracts for registration, agents, marketplace, negotiations and deals.

**Teammate B**

- Inspect the PRD and architecture.
- Set up the Next.js app, TypeScript, Tailwind and UI component structure.
- Establish page routes, navigation, layout and design tokens.
- Create UI wireframes and static page shells.
- Prepare API client structure and mock data matching Main's schemas.
- Set up Telegram Bot project skeleton and configuration placeholders.

**Parallel condition:** B can build static layouts and mock-data views while Main defines APIs. Do not invent incompatible field names or response shapes.

**Checkpoint:** Main publishes the first shared schema/contract document. Both confirm the same field names and route expectations.

---

### Phase 1 — Identity, registration and Agent Passport

**Goal:** A user can register a business and create an agent identity.

**Main**

- Implement human account and business principal models.
- Implement business roles: buyer, seller or both.
- Implement simulated verification states.
- Implement Telegram linking token generation and validation.
- Implement agent creation, lifecycle and ownership checks.
- Generate Agent Passport data and Ed25519 keypair.
- Enforce principal authority ceilings.

**Teammate B**

- Build registration and login screens.
- Build business profile and role selection screens.
- Build simulated verification status UI.
- Build Telegram linking UI and instructions.
- Build agent creation/list screens.
- Build Agent Passport display: agent ID, owner, capabilities, public-key fingerprint and status.
- Add loading, validation and error states.

**Parallel condition:** B uses Main's published identity schemas and mock responses until endpoints are ready.

**Checkpoint:** Main provides working registration/agent endpoints. B connects the screens and reports contract mismatches rather than patching backend behavior independently.

---

### Phase 2 — Marketplace and catalogue

**Goal:** Buyer users can discover sellers and inspect their products and business details.

**Main**

- Implement seller business profiles.
- Implement catalogue, SKU and inventory models.
- Implement marketplace discovery/search/filter APIs.
- Implement seller ranking inputs and explainable ranking response.
- Seed the 40-SKU Diwali restock catalogue.
- Seed three distinct legitimate seller principals and their inventories.

**Teammate B**

- Build marketplace home and seller discovery pages.
- Build seller cards and detailed seller profile pages.
- Build catalogue and inventory tables.
- Build search/filter/sort controls.
- Build seller ranking explanation UI.
- Build seller-side workspace for inventory and business profile.

**Parallel condition:** B can build against seeded mock seller/catalogue data. Main owns the actual discovery and ranking logic.

**Checkpoint:** Connect marketplace pages to real APIs. Verify that sellers are distinct business principals and that all 40 requested SKUs are represented.

---

### Phase 3 — Negotiation engine and live workspace

**Goal:** Buyer and seller agents exchange structured offers and negotiate concurrently.

**Main**

- Implement canonical negotiation message schemas.
- Implement Ed25519 signing and verification.
- Implement replay protection and message expiry checks.
- Implement negotiation state machine and valid transitions.
- Implement concurrent RFQ dispatch and seller isolation.
- Implement deterministic offer validation: budget, stock, quantity, price, delivery and credit terms.
- Implement buyer/seller agent strategies and multi-round counteroffers.
- Keep buyer maximum budget and seller identities private where required.

**Teammate B**

- Build negotiation workspace and live activity feed.
- Build RFQ and offer detail views.
- Build side-by-side offer comparison table.
- Build negotiation timeline and message status indicators.
- Build seller-side incoming RFQ and offer submission screens if human review is part of the demo.
- Build responsive empty, pending, rejected, expired and error states.

**Parallel condition:** Main publishes message examples and state names before B wires timeline states. B must not implement negotiation decisions in the frontend.

**Checkpoint:** Run a backend negotiation scenario first. Then connect the UI to the event/API stream and verify that the displayed state matches backend state.

---

### Phase 4 — Trust, security and explainability

**Goal:** The system identifies suspicious inputs and explains trust signals without pretending to prove more than it can.

**Main**

- Treat seller free-text notes as untrusted input.
- Implement prompt-injection classification/reporting boundary.
- Implement seeded reference-price checks for fake discounts.
- Implement basic collusion signals across distinct principals.
- Separate market rating, trust confidence and security status.
- Record evidence and security events in the audit log.
- Ensure multiple agents belonging to one principal are not treated as independent sellers.

**Teammate B**

- Build security warning and suspicious-offer indicators.
- Build seller trust/rating explanation panels.
- Build evidence and event detail views.
- Build security status and review-needed states.
- Add clear labels that distinguish a signal from a confirmed violation.

**Parallel condition:** B consumes Main's structured security result fields. B must not infer fraud or alter trust scores in the UI.

**Checkpoint:** Demonstrate a seeded adversarial seller with a fake discount and prompt-injection attempt. Confirm that UI labels reflect backend evidence and status.

---

### Phase 5 — Deal, approval and mock payment

**Goal:** Matching final terms become a deal, and a human approves the exact deal before simulated payment.

**Main**

- Implement matching buyer/seller acceptance.
- Lock the final deal version and line items.
- Bind approval to exact deal ID/version, parties, amount, currency, destination and expiry.
- Invalidate approval when material deal terms change.
- Implement idempotent mock UPI payment state transition and receipt.
- Add audit events for approval and payment.

**Teammate B**

- Build final deal summary.
- Build approval screen with exact terms and clear approve/reject actions.
- Build deal status and receipt view.
- Build Telegram approval message and callback handling using Main's API.
- Ensure changed/expired deals cannot be approved from stale UI state.

**Parallel condition:** B builds the approval experience against Main's approval challenge schema. The backend remains the only authority for approval validity and payment.

**Checkpoint:** Complete one end-to-end deal. Verify that changing a deal version invalidates an earlier approval and duplicate payment requests do not create duplicate payments.

---

### Phase 6 — Telegram, proactive alerts and memory

**Goal:** The demo works across web and Telegram and can show one proactive behavior.

**Main**

- Implement event source and persistent event history.
- Implement supplier-performance memory from verified events.
- Implement one scheduled/triggered stock or Diwali deadline alert.
- Implement notification API and authorization checks.
- Ensure memory has source event/time and can be inspected or corrected.

**Teammate B**

- Complete Telegram Bot commands and notifications.
- Complete focused Telegram Mini App screens for mandate, Passport, offer comparison and approval.
- Add deep links between Telegram and web views where appropriate.
- Add bot error handling and user-facing status messages.
- Connect the proactive alert delivery path to Main's notification interface.

**Parallel condition:** B can implement bot commands and Mini App screens using the notification and task contracts. Main owns scheduling, memory and trigger correctness.

**Checkpoint:** Trigger one proactive alert without a new user prompt. Show a prior supplier event influencing a later ranking, with the evidence visible.

---

### Phase 7 — Integration, testing and demo freeze

**Goal:** One reliable end-to-end demonstration.

**Main**

- Own integration and release branch.
- Run backend unit and integration tests.
- Run security and state-machine tests.
- Verify all API permissions and authority checks.
- Verify event/audit history and Decision Replay.
- Run database migrations and seed/reset scripts.
- Resolve integration conflicts and approve merges.
- Freeze `main` before final demo rehearsal.

**Teammate B**

- Run frontend and bot tests.
- Verify every P0 page and interaction.
- Check responsive layout and loading/error states.
- Verify web and Telegram show consistent task/deal status.
- Fix UI bugs on B-owned branches.
- Prepare screenshots/demo navigation notes if needed.
- Avoid feature additions after demo freeze unless Main approves.

**Checkpoint:** Both developers rehearse the exact demo from a clean reset. No unreviewed code is merged after freeze.

---

## 4. Parallel work and waiting protocol

The developers should not wait for entire phases to finish. They should wait only at explicit dependency boundaries.

### Work independently when

- B is building static UI with agreed mock JSON while Main builds APIs.
- Main is implementing backend logic while B builds layouts and tests.
- B is implementing Telegram command handlers while Main implements event/notification services, provided the contract is fixed.
- Either person is writing tests against an agreed schema.

### Stop and coordinate when

- A shared schema or endpoint needs to change.
- A database migration affects fields B is displaying.
- A state name or negotiation transition changes.
- A feature depends on a backend endpoint that is not yet defined.
- A PR causes conflicts in shared files.
- A security or approval rule is unclear.

### Daily handoff

At the end of a work session, each person posts:

```text
DONE:
- What is complete?

IN PROGRESS:
- What is currently being worked on?

BLOCKED:
- What is waiting and who/what is needed?

CONTRACT CHANGES:
- Any API/schema/route changes?

NEXT:
- First task for the next session.
```

### Dependency rule

If B is blocked by Main:

1. B continues with mock data, UI states, tests or another unblocked task.
2. B posts the exact missing endpoint/schema and the expected fields.
3. Main either provides the contract, a stub endpoint or an estimated handoff point.
4. B switches to real integration only after the contract is stable.

If Main is blocked by B:

1. Main continues backend tests, service logic or API documentation.
2. Main provides a minimal interface contract or stub response.
3. B implements against that contract.
4. Main integrates after B's PR is reviewable.

---

## 5. Commit and push protocol

### Before starting work

Always update the local base branch:

```bash
git switch main
git pull --ff-only origin main
```

Then create or switch to your own feature branch:

```bash
git switch -c feat/<owner>-<short-task>
```

If the branch already exists:

```bash
git switch feat/<owner>-<short-task>
```

### Before every commit

```bash
git status
git diff
```

Run the relevant formatter, linter and tests. Stage only the files related to the task:

```bash
git add <specific-files>
git commit -m "type: short description"
```

### Commit message format

Use Conventional Commit-style prefixes:

| Prefix | Use |
| --- | --- |
| `feat:` | New functionality |
| `fix:` | Bug fix |
| `docs:` | Documentation |
| `refactor:` | Internal restructuring |
| `test:` | Tests |
| `chore:` | Tooling/configuration |
| `style:` | Formatting only |

Examples:

```text
feat: add business registration endpoint
feat: build seller discovery page
fix: reject expired negotiation messages
test: cover approval version validation
docs: define telegram bot commands
chore: configure frontend linting
```

Keep commits focused. Do not combine unrelated frontend, backend and documentation changes into one giant commit.

### Push protocol

**Main pushes only to Main's feature branches until ready to merge:**

```bash
git push -u origin feat/main-<short-task>
```

**B pushes only to B's feature branches:**

```bash
git push -u origin feat/b-<short-task>
```

B must never run:

```bash
git push origin main
```

### Keep B's branch updated with main

B first commits or stashes any local changes, then:

```bash
git fetch origin
git switch feat/b-<short-task>
git merge origin/main
```

Resolve conflicts locally, run tests, then push the updated B branch:

```bash
git push origin feat/b-<short-task>
```

For this two-person project, merging `origin/main` into B's feature branch is preferred over rebasing shared work because it is easier to reason about and avoids rewriting pushed commits.

### Pull Request protocol

B opens a PR:

- **Base:** `main`
- **Compare:** `feat/b-<short-task>`
- **Title:** same style as commit, e.g. `feat: build marketplace seller discovery`
- **Description:** summary, changed routes/components, tests run, screenshots for UI, API/schema dependencies, known limitations.

Main reviews:

1. Does it follow the agreed architecture and contract?
2. Does it stay within B's ownership?
3. Does it contain secrets or unrelated files?
4. Do tests and checks pass?
5. Does it conflict with current `main`?
6. Does it preserve security and approval boundaries?

If changes are requested, B updates the same branch and pushes again. Main merges only after approval.

### Merge protocol

Only Main performs the merge.

Preferred method: **Squash and merge** for feature PRs, keeping `main` history readable.

After merge:

```bash
git switch main
git pull --ff-only origin main
```

B then updates their branch using the branch-update protocol above.

Delete merged feature branches after confirming the merge is present.

---

## 6. Pull Request checklist

Every PR should include:

```text
## What
-

## Why
-

## Files / modules changed
-

## API or schema changes
- None / describe changes

## Tests run
- [ ] Unit tests
- [ ] Integration tests
- [ ] Lint / format
- [ ] Manual UI or bot check

## Screenshots / demo evidence
-

## Risks / known limitations
-

## Reviewer notes
-
```

A PR is not ready just because it works on the author's machine. Include enough evidence for Main to review it without reconstructing the entire development session.

---

## 7. Ownership boundaries and conflict prevention

| Area | Owner | Other developer's rule |
| --- | --- | --- |
| Architecture and shared contracts | Main | Propose changes; do not silently redefine |
| Backend, database and migrations | Main | B consumes APIs; request changes through Main |
| Agent identity, keys and mandates | Main | B displays returned data only |
| Negotiation engine and state machine | Main | B displays states and submits authorised actions |
| Trust, security and ranking logic | Main | B displays structured results only |
| Deal locking, approval and mock payment | Main | B builds the user interaction; backend validates |
| Marketplace web UI | B | Main reviews integration and API fit |
| Telegram Bot and Mini App | B | Main owns backend event/notification contracts |
| Frontend tests and UI polish | B | Main may request fixes |
| Integration, release and merge to `main` | Main | B opens PRs and responds to review |

If a task crosses ownership boundaries, split it: Main implements the backend contract; B implements the client experience.

---

## 8. Definition of done

A task is complete only when:

- The implementation matches the agreed contract.
- Relevant tests pass.
- No secrets or local-only files are committed.
- The change is pushed to the owner's feature branch.
- The PR is reviewed and merged by Main, if it is intended for `main`.
- The other developer is informed of any API, schema or behavior change.

A phase is complete only when its checkpoint passes. Both developers can move to the next independent task while waiting for a checkpoint, but neither should build against an undocumented assumption.

---

## 9. Golden rules

1. Main owns integration; B owns their feature branches.
2. Only Main merges into `main`.
3. B pushes code to B's branch and pulls updates from `main`.
4. Agree on contracts before parallel implementation.
5. Keep commits small and PRs focused.
6. Backend authorization and deterministic rules are authoritative; frontend visibility is not security.
7. Never let the UI or LLM bypass mandate, negotiation, approval or payment validation.
8. Communicate blockers early; work on independent tasks instead of waiting idle.
9. Stabilise the demo before adding optional features.
10. If ownership is unclear, Main decides the split before either person edits the shared area.
