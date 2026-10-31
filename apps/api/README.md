# VANIK API

Main owns this application, database revisions and API contracts.

## Implemented

- FastAPI application factory and resource lifecycle.
- Environment-based settings with production secret and CORS checks.
- Lazy PostgreSQL connection and request-scoped sessions.
- Liveness and database-readiness endpoints.
- Email/password registration with Argon2id password hashing.
- Opaque HttpOnly sessions, session expiry, CSRF validation and logout.
- Per-worker authentication-attempt limiting.
- Principal creation with atomic owner membership.
- Principal reads restricted to active members.
- Synthetic identifier storage using keyed digests and display-safe masks.
- Explicitly labeled demo verification for owner/admin members.
- Standard error responses and server-generated request IDs.
- Alembic identity schema migration.
- Versioned identity contracts, JSON schemas and synthetic fixtures.
- Backend, contract and PostgreSQL integration tests.

Telegram linking, agents, negotiation and settlement endpoints are not implemented. A published schema is not a working endpoint.

## Setup

Run commands from the repository root. Install `uv` first.

```bash
uv python install 3.12.12
make install
make test
make lint
make typecheck
```

The committed `apps/api/uv.lock` pins all resolved backend dependencies. The local API environment lives in `apps/api/.venv` and is ignored by Git.

Copy `.env.example` to the root `.env` if you need to override local defaults. Never commit `.env`.

## Run locally

Start PostgreSQL and Redis if Docker is available:

```bash
make infra
make migrate
make dev
```

Open:

- `http://localhost:8000/health`
- `http://localhost:8000/health/ready`
- `http://localhost:8000/docs`

Liveness does not need a database. Readiness executes `SELECT 1` and returns `503` if PostgreSQL is unavailable. It does not verify schema migrations, seller data or negotiation readiness.

## Contracts

The Pydantic source is `app/contracts/`. Export its wire schemas with:

```bash
make contracts
make test
```

Generated schemas and synthetic examples are checked in under [`packages/shared-schemas/v1`](../../packages/shared-schemas/v1). They are intentional public contract artifacts, not application build output.

## Database revisions

Alembic reads the same `DATABASE_URL` as the API. Apply the identity schema with:

```bash
make migrate
```

Do not run a destructive downgrade or demo reset without explicit approval.

## Test boundaries

Unit tests check the database-query path with an isolated SQLite connection and simulate PostgreSQL failures. Two real PostgreSQL tests are skipped unless `RUN_POSTGRES_INTEGRATION=1`.

After `make infra`, run those tests with:

```bash
RUN_POSTGRES_INTEGRATION=1 make test
```

The GitHub Actions API workflow provides PostgreSQL and enables those checks. Adding the workflow is not proof that CI has run; its result must be checked after the branch is pushed.

## Related documents

- [Architecture](../../docs/engineering/ARCHITECTURE.md)
- [Technology baseline](../../docs/engineering/TECHNOLOGY_BASELINE.md)
- [API conventions](../../docs/engineering/API_CONVENTIONS.md)
- [Identity contract handoff](../../teammateB/PHASE_0_HANDOFF.md)
