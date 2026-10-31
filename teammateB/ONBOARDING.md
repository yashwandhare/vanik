# Teammate B Onboarding

## 1. Product summary

The project is an agentic B2B marketplace. Businesses own persistent buyer and seller agents. Human users give agents task-scoped mandates. Buyer agents discover suppliers and negotiate structured price, delivery and credit terms with several seller principals in parallel.

The backend validates identity, authority, signatures, inventory, negotiation states, approvals and simulated settlement. The user interfaces display and submit data. They do not replace backend validation.

The product has three interfaces:

1. Marketplace Web App.
2. Telegram Bot.
3. Telegram Mini App.

## 2. Current repository state

The repository now includes a working API foundation: settings, health checks, database sessions, initial identity schemas and tests. It also contains PostgreSQL and Redis configuration and project documentation.

Business workflows, authentication endpoints, database revisions, the web application, Telegram clients and demo data are not implemented yet. Read [the Phase 0 handoff](PHASE_0_HANDOFF.md) for the client work that can start.

## 3. Required reading

Read these files before implementation:

1. `docs/product/PRODUCT_BRIEF.md`
2. `docs/product/PRD.md`
3. `docs/engineering/ARCHITECTURE.md`
4. `docs/engineering/PROTOCOL_AND_API.md`
5. `docs/engineering/TRUST_AND_SECURITY.md`
6. `docs/delivery/TEAM_EXECUTION_PLAN.md`
7. `teammateB/WORKING_INSTRUCTIONS.md`
8. `teammateB/GIT_PROTOCOL.md`
9. `teammateB/TODO.md`

Read `docs/engineering/TECHNOLOGY_BASELINE.md`, `docs/engineering/API_CONVENTIONS.md` and `teammateB/PHASE_0_HANDOFF.md` before scaffolding.

Read `docs/engineering/DATA_MODEL.md` when a view depends on entity relationships. Read `docs/delivery/DEMO_RUNBOOK.md` before demo integration.

## 4. Your ownership

You own the following client-side work:

- Marketplace dashboard, discovery, profiles, catalogues and inventory views.
- Registration, login, business onboarding and simulated verification views.
- Agent creation, roster and Agent Passport views.
- Negotiation workspace, offer comparison and timeline.
- Seller workspace.
- Deal summary, approval interaction and simulated receipt views.
- Telegram Bot commands, notifications and approval interaction.
- Telegram Mini App mandate, Passport, comparison, approval and timeline views.
- Frontend and bot loading, empty, error and permission states.
- Frontend, bot, responsive and accessibility tests.

## 5. Main-owned boundaries

Do not independently change:

- Backend business rules.
- Database models or migrations.
- Authentication or authorization behavior.
- Shared API or message schemas.
- Agent signing or key management.
- Task authority enforcement.
- Negotiation state transitions or ranking logic.
- Security, trust or collusion calculations.
- Deal locking, approval validity or settlement behavior.

Request these changes from Main. Continue with another unblocked client task while Main resolves the dependency.

## 6. Contract rules

- Use only schemas and state names published by Main.
- Keep API access in a dedicated typed client layer.
- Do not copy backend business logic into components, bot handlers or Mini App code.
- Treat all remote data as untrusted until it passes client boundary validation.
- Use mock data only when it matches a published contract.
- Label mock-only behavior. Do not present it as integrated behavior.
- Report contract mismatches instead of silently adapting shared fields.

## 7. Security rules

- Never commit `.env`, tokens, credentials, private keys or real personal or business data.
- Never place agent private keys in the browser, bot messages or client storage.
- Never expose the buyer maximum budget to seller-facing views.
- Never execute seller-provided HTML, JavaScript, CSS or instructions.
- Never let the client mark an invalid action as successful.
- Always display simulated verification and payment as simulated.

## 8. First authorized work

After Main confirms the branch and publishes the initial contracts:

1. Create the web application skeleton.
2. Configure TypeScript, Tailwind, linting and tests.
3. Establish layout, routes, navigation and design tokens.
4. Create the typed API client boundary.
5. Build static page shells using Main-approved fixtures.
6. Create the Telegram Bot skeleton after Main confirms the library.

Do not initialize applications, install packages or select major libraries before Main authorizes them.

## 9. Handoff format

At the end of each work session, report:

```text
DONE:
- Completed and verified work.

IN PROGRESS:
- Current task and branch.

BLOCKED:
- Exact contract, endpoint or decision needed from Main.

CONTRACT CHANGES:
- None, or the approved changes used.

VERIFICATION:
- Tests, lint, build and manual checks actually run.

NEXT:
- First task for the next session.
```
