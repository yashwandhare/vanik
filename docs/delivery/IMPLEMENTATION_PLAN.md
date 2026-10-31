# VANIK — Implementation Plan

## 1. Repository layout

```text
<repository>/
├── README.md
├── PROJECT_MANIFEST.json
├── .env.example
├── .gitignore
├── docker-compose.yml
├── Makefile
├── apps/
│   ├── api/
│   ├── web/
│   └── telegram-bot/
├── packages/
│   └── shared-schemas/
├── scripts/
├── docs/
│   ├── README.md
│   ├── product/
│   │   ├── PRODUCT_BRIEF.md
│   │   └── PRD.md
│   ├── engineering/
│   │   ├── ARCHITECTURE.md
│   │   ├── DATA_MODEL.md
│   │   ├── TECHNOLOGY_BASELINE.md
│   │   ├── API_CONVENTIONS.md
│   │   ├── PROTOCOL_AND_API.md
│   │   └── TRUST_AND_SECURITY.md
│   ├── decisions/
│   │   └── DECISIONS.md
│   └── delivery/
│       ├── IMPLEMENTATION_PLAN.md
│       ├── TEAM_EXECUTION_PLAN.md
│       ├── PROJECT_TODO.md
│       └── DEMO_RUNBOOK.md
└── teammateB/
    ├── README.md
    ├── ONBOARDING.md
    ├── GIT_PROTOCOL.md
    ├── TODO.md
    ├── PHASE_0_HANDOFF.md
    └── WORKING_INSTRUCTIONS.md
```

Application source and tests now exist inside `apps/api/`. The web and Bot remain placeholders until B scaffolds them.

## 2. Build order

### Phase 0 — Repository, scope and contracts

Repository rules, exact technology versions, authentication behavior, API conventions, shared schemas, fixtures and application skeletons.

### Phase 1 — Identity and registration

Human accounts, business principals, simulated verification, memberships, Telegram link tokens, agent creation and Passport.

### Phase 2 — Marketplace foundation

Seller/business profiles, agent listings, catalogue, inventory, search/filter, activity feed and rankings.

### Phase 3 — Protocol and negotiation

Canonical message schema, Ed25519 signing/verification, replay protection, negotiation state machine, parallel RFQs and deterministic validation.

### Phase 4 — Security and trust

Prompt-injection boundary, reference-price validation, collusion signals, reputation evidence and security event UI.

### Phase 5 — Deal lifecycle

Matching acceptance, deal lock, exact approval challenge, mock UPI and receipt.

### Phase 6 — Events, Telegram, proactivity and memory

Complete Bot and Mini App integration, event history, supplier memory, Decision Replay and the proactive alert. Client shells are built alongside the backend in earlier phases.

### Phase 7 — Integration and demo freeze

Seed/reset verification, security and interface tests, final integration, rehearsal and release freeze.

## 3. 24-hour execution guidance

- First milestone: end-to-end backend negotiation script with 40-SKU fixture and three independent seller principals.
- Second milestone: signature verification, malicious seller detection and deal approval/payment.
- Third milestone: marketplace web interface connected to real backend events.
- Fourth milestone: Telegram Bot and focused Mini App.
- Final milestone: proactive alert, persistent memory, reset, tests and rehearsal.

If time is constrained, reduce advanced UI polish and analytics before cutting parallel negotiation, identity/security, marketplace visibility or approval.

## 4. Developer commands to implement

The repository should expose:

```bash
make install
make dev
make test
make lint
make format
make migrate
make seed
make demo
make reset-demo
make down
```

Expected behaviour:

- `install`: install backend and frontend dependencies.
- `dev`: run API, web and bot services.
- `test`: run unit/integration tests.
- `lint` / `format`: static checks and formatting.
- `migrate`: apply database migrations.
- `seed`: load synthetic principals, agents, products and inventory.
- `demo`: launch/reset the canonical demo scenario.
- `reset-demo`: clear demo state and reseed.
- `down`: stop local services.

Current application targets implement backend install, development, tests, lint, format, type checks and contract export. Infrastructure start/stop targets require Docker. Web and Bot commands will be added with those applications.

`migrate` fails until a real revision exists. `seed`, `demo` and `reset-demo` fail explicitly until their workflows are implemented. Do not mistake an empty migration history for a working database schema.
