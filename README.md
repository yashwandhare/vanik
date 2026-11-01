# VANIK

**Autonomous commerce. Verifiable trust.**

VANIK is an agentic B2B marketplace where verified businesses create and manage AI agents that discover counterparties, negotiate commercial terms, compare offers and prepare transactions for human approval.

The product has three first-class surfaces:

- **Marketplace Web App:** the visual marketplace and command centre for discovering businesses and agents, inspecting catalogues, watching live activity, comparing offers, viewing rankings and managing deals.
- **Telegram Bot:** conversational access for instructions, task creation, proactive alerts, progress updates and approvals.
- **Telegram Mini App:** focused structured workflows for registration handoff, agent passports, task mandates, offer comparison and approval.

All surfaces use the same backend, identity system, marketplace registry, negotiation engine, trust layer and event history.

## Repository status

The repository includes real identity/Agent Passport services, a persisted 40-SKU catalogue, seller discovery, public inventory and authorized stock updates. The web/Bot foundation and identity integration are merged. It is **not a completed marketplace implementation**: task routes, negotiation, deals, memory/proactivity and deterministic reset remain pending.

## Core hierarchy

`Human account → Business principal → Agent Passports → Task mandates → Negotiations → Deals`

A business registers and verifies once, connects Telegram, then creates one or more buyer and/or seller agents. Each agent has a unique ID and cryptographic signing identity. Multiple agents owned by the same business remain associated with the same principal and must not be treated as independent businesses for reputation or collusion analysis.

## Hackathon P0

- Business registration portal with simulated official-ID/business verification.
- Telegram account linking.
- Marketplace web app: seller discovery, profiles, catalogues, rankings, activity, negotiation workspace, deals and Decision Replay.
- Telegram Bot and a focused Mini App.
- Persistent Agent Passports and task-scoped mandates.
- One buyer agent negotiating in parallel with at least three independent seller principals.
- 40 distinct SKU Diwali restock basket.
- Seller strategies for margin, inventory clearance and payment risk.
- Structured A2A-style protocol and Ed25519 message signatures.
- Prompt-injection defence, reference-price fake-discount checks and basic collusion signals.
- Proactive stock/deadline alert and persistent supplier-performance memory.
- Human approval and simulated UPI settlement.
- Auditable events and deterministic demo reset.

## Deliberately simulated

Official identity checks, financial/AA credentials, UPI settlement and historical supplier data are synthetic demo data. Do not collect real Aadhaar/PAN documents or imply government verification. No real money moves.

## Documentation

Start with the [documentation index](docs/README.md).

- [Product brief](docs/product/PRODUCT_BRIEF.md)
- [Product requirements](docs/product/PRD.md)
- [Architecture](docs/engineering/ARCHITECTURE.md)
- [Data model](docs/engineering/DATA_MODEL.md)
- [Technology baseline](docs/engineering/TECHNOLOGY_BASELINE.md)
- [API conventions](docs/engineering/API_CONVENTIONS.md)
- [Protocol and API contracts](docs/engineering/PROTOCOL_AND_API.md)
- [Trust and security](docs/engineering/TRUST_AND_SECURITY.md)
- [Decision log](docs/decisions/DECISIONS.md)
- [Implementation plan](docs/delivery/IMPLEMENTATION_PLAN.md)
- [Team execution plan](docs/delivery/TEAM_EXECUTION_PLAN.md)
- [Project TODO](docs/delivery/PROJECT_TODO.md)
- [Demo runbook](docs/delivery/DEMO_RUNBOOK.md)
- [Teammate B workspace](teammateB/README.md)

## Selected stack

- Backend: Python 3.12.12, FastAPI, Pydantic v2, SQLAlchemy and Alembic.
- Database: PostgreSQL 16; Redis 7 is optional for coordination.
- Web: Node.js 22.23.1, Next.js, React, TypeScript and Tailwind CSS.
- Telegram: Python Telegram Bot; Mini App served by the web app.
- Signing: Ed25519 and AES-GCM through `cryptography`; private material stays server-side.
- Local services: Docker Compose.

See the [technology baseline](docs/engineering/TECHNOLOGY_BASELINE.md) for exact versions and implementation status.

## Backend quick start

Install Git and `uv`. Docker is required only to start local PostgreSQL and Redis.

From the repository root:

```bash
uv python install 3.12.12
make install
make test
make lint
make typecheck
```

To start the API and local database:

```bash
make infra
make migrate
make dev
```

The API runs at `http://localhost:8000`. `/health` checks process liveness; `/health/ready` checks database connectivity. `/docs` lists only implemented endpoints.

Copy `.env.example` to `.env` if you need to override development defaults. Never commit `.env`.

Application Make targets cover the API, web and Bot. `make migrate` applies the current schema. Configure `AGENT_KEY_ENCRYPTION_SECRET` and `DEMO_ACCOUNT_PASSWORD` in `.env`, then run `make seed` to create missing synthetic records without resetting permissions, lifecycle or reservations. `demo` and `reset-demo` remain unimplemented.

See [API setup](apps/api/README.md) and the [Phase 1 B handoff](teammateB/PHASE_1_IDENTITY_HANDOFF.md) for the next steps.

## Useful commands

```bash
docker compose up -d             # start local infrastructure
docker compose down              # stop local infrastructure
docker compose down -v           # stop and delete local database volumes
docker compose logs -f           # follow service logs
```

## Safety boundaries

- LLM output never directly authorises payment or changes business permissions.
- All commercial constraints and state transitions are checked server-side.
- Approval is bound to an exact deal version, amount, seller, buyer, currency, expiry and one-time nonce.
- Any material deal change invalidates previous approval.
- Seller-provided text is untrusted input.
- Private signing keys are never exposed to other agents or frontend clients.
