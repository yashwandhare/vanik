# Project Documentation

This directory contains the product, engineering and delivery sources of truth for VANIK, an agentic B2B marketplace.

## Current repository status

The repository contains working registration, opaque sessions, logout, principal creation, membership-authorized principal reads, identity migrations and backend tests. PostgreSQL and Redis have Compose configuration. Verification, agents, commerce workflows, the web application, Telegram clients and demo data are not implemented yet.

Do not assume that a feature exists because a document specifies it.

## Required reading order

1. [Product brief](product/PRODUCT_BRIEF.md)
2. [Product requirements](product/PRD.md)
3. [Architecture](engineering/ARCHITECTURE.md)
4. [Data model](engineering/DATA_MODEL.md)
5. [Technology baseline](engineering/TECHNOLOGY_BASELINE.md)
6. [API conventions](engineering/API_CONVENTIONS.md)
7. [Protocol and API contracts](engineering/PROTOCOL_AND_API.md)
8. [Trust and security](engineering/TRUST_AND_SECURITY.md)
9. [Decision log](decisions/DECISIONS.md)
10. [Implementation plan](delivery/IMPLEMENTATION_PLAN.md)
11. [Team execution plan](delivery/TEAM_EXECUTION_PLAN.md)
12. [Project TODO](delivery/PROJECT_TODO.md)
13. [Demo runbook](delivery/DEMO_RUNBOOK.md)

## Documentation map

### Product

- `product/PRODUCT_BRIEF.md` defines the vision, users and product principles.
- `product/PRD.md` defines scope, requirements, non-goals and acceptance criteria.

### Engineering

- `engineering/ARCHITECTURE.md` defines component boundaries and runtime flow.
- `engineering/DATA_MODEL.md` defines the logical entities and integrity requirements.
- `engineering/TECHNOLOGY_BASELINE.md` records selected versions and verification status.
- `engineering/API_CONVENTIONS.md` defines implemented identity wire conventions and remaining contract work.
- `engineering/PROTOCOL_AND_API.md` distinguishes published identity contracts from proposed commerce contracts.
- `engineering/TRUST_AND_SECURITY.md` defines threat boundaries and security rules.

### Delivery

- `delivery/IMPLEMENTATION_PLAN.md` defines build order and developer commands.
- `delivery/TEAM_EXECUTION_PLAN.md` defines ownership and collaboration rules.
- `delivery/PROJECT_TODO.md` tracks implementation by phase.
- `delivery/DEMO_RUNBOOK.md` defines the required demonstration.

### Decisions

- `decisions/DECISIONS.md` records locked and deferred product decisions.

## Source-of-truth order

When documents conflict, use this order:

1. Locked decisions and explicit instructions from the project lead.
2. Product requirements.
3. Architecture, security and protocol contracts.
4. Team execution and implementation plans.
5. Application README files and examples.

Report unresolved conflicts to Main. Do not silently choose a new requirement or change a shared contract.

## Change rules

- Main owns product architecture, backend contracts and final integration.
- Teammate B owns the web, Telegram Bot and Telegram Mini App implementations.
- Update affected links when a document moves.
- Update contracts before clients depend on changed fields or states.
- Clearly label simulations and proposed functionality.
- Never add real KYC, real payment or unapproved production integrations to the hackathon scope.
