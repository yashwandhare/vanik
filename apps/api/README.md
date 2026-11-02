# VANIK API

FastAPI backend application providing core identity, agent lifecycle, catalogue, negotiation, and settlement services.

---

## 1. Capabilities

- **Identity & Access:** Argon2id password hashing, opaque HttpOnly sessions, CSRF token validation, and rate limiting.
- **Business Principals:** Principal entity registration, membership roles (`owner`, `admin`, `operator`, `viewer`), and synthetic business credentials (GSTIN, PAN).
- **Agent Lifecycle:** Minting persistent Agent Passports, AES-GCM encrypted Ed25519 key storage, and public key fingerprint generation.
- **Marketplace & Catalogue:** Standardized 40-SKU commodity catalogue, wholesale seller directory, and real-time inventory management.
- **Autonomous Negotiations:** Concurrent multi-seller RFQ dispatch, deterministic quote evaluation, counter-offer rounds, and state machine enforcement.
- **Trust & Security:** Benchmark price validation against fake discounts, prompt injection sanitization, replay attack protection, and append-only audit events.
- **Cryptographic Settlement:** Canonical SHA-256 deal challenge generation and human authorization for simulated UPI, Escrow, and RTGS payment.

---

## 2. Tech Stack

- **Framework:** FastAPI 0.115, Starlette, Pydantic v2
- **Database:** PostgreSQL 16 (asyncpg, SQLAlchemy 2.0, Alembic migrations)
- **Cache & Sessions:** Redis 7
- **Cryptography:** PyNaCl (Ed25519 signatures), cryptography (AES-GCM encryption)
- **Package Manager:** `uv`
- **Testing:** Pytest, AnyIO

---

## 3. Setup and Execution

Run commands from the repository root:

```bash
# Install dependencies
uv --directory apps/api sync --locked

# Start infrastructure (PostgreSQL & Redis via Docker/Podman)
make infra

# Apply database migrations
make migrate

# Seed 40-SKU catalogue, sellers, and test agents
make seed

# Run FastAPI development server on port 8000
make dev-api

# Run test suite
make test-api

# Run linter and formatting checks
make lint-api
```

---

## 4. Endpoints and Inspection

- Service Health: `http://localhost:8000/health`
- Database Readiness: `http://localhost:8000/health/ready`
- Interactive OpenAPI Docs: `http://localhost:8000/docs`
