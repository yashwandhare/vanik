# VANIK

**Autonomous commerce. Verifiable trust.**

VANIK is an agentic B2B marketplace where verified businesses create and manage AI agents that discover counterparties, negotiate commercial terms, compare offers and prepare transactions for human approval.

The product has three first-class surfaces:

- **Marketplace Web App:** the visual marketplace and command centre for discovering businesses and agents, inspecting catalogues, watching live activity, comparing offers, viewing rankings and managing deals.
- **Telegram Bot:** conversational access for instructions, task creation, proactive alerts, progress updates and approvals.
- **Telegram Mini App:** focused structured workflows for registration handoff, agent passports, task mandates, offer comparison and approval.

All surfaces use the same backend, identity system, marketplace registry, negotiation engine, trust layer and event history.

## Repository status

This repository contains the product and engineering documentation, local infrastructure configuration and a starter directory structure. It is **not a completed marketplace implementation**. PostgreSQL and Redis can run now. The API, web, bot, schema, test and demo commands remain specifications until their application code is implemented.

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
- [Protocol and API contracts](docs/engineering/PROTOCOL_AND_API.md)
- [Trust and security](docs/engineering/TRUST_AND_SECURITY.md)
- [Decision log](docs/decisions/DECISIONS.md)
- [Implementation plan](docs/delivery/IMPLEMENTATION_PLAN.md)
- [Team execution plan](docs/delivery/TEAM_EXECUTION_PLAN.md)
- [Project TODO](docs/delivery/PROJECT_TODO.md)
- [Demo runbook](docs/delivery/DEMO_RUNBOOK.md)
- [Teammate B workspace](teammateB/README.md)

## Proposed stack

- Backend: Python 3.12+, FastAPI, Pydantic v2, SQLAlchemy 2, Alembic.
- Database: PostgreSQL; Redis optional for task/event coordination.
- Web: Next.js, TypeScript, Tailwind CSS.
- Telegram: Python Telegram Bot or aiogram; Mini App served by the web app.
- Agent orchestration: Python async tasks; LLM provider behind an adapter.
- Identity signatures: Ed25519 via PyNaCl or cryptography.
- Local services: Docker Compose.

The stack is a proposed implementation baseline, not a claim that these services are already implemented in this bundle.

## Quick start

### 1. Requirements

- Git
- Docker Engine + Docker Compose plugin
- Python 3.12+
- Node.js 20+ and npm

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and set secrets before running real integrations. For a local mock-only setup, placeholder values can be used where explicitly marked.

### 3. Start infrastructure

```bash
docker compose up -d postgres redis
```

### 4. Backend (once implemented)

```bash
cd apps/api
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 5. Web app (once implemented)

```bash
cd apps/web
npm install
npm run dev
```

### 6. Telegram bot (once implemented)

```bash
cd apps/telegram-bot
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m bot.main
```

### 7. Demo data and reset (commands to implement)

```bash
make seed
make demo
make reset-demo
```

These Make targets are specified as required developer commands in the implementation plan. They are not executable until the corresponding implementation is added.

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
