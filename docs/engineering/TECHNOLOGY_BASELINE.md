# Technology Baseline

Main selected this baseline for Phase 0. Backend versions are pinned in `apps/api/pyproject.toml`; transitive dependencies are locked in `apps/api/uv.lock`.

## Backend environment

| Component | Version | Status |
| --- | --- | --- |
| Python | 3.12.12 | Installed and used for backend verification |
| uv | 0.9.30 | Used to resolve and lock the development environment |
| FastAPI | 0.162.0 | Installed |
| Pydantic | 2.14.2 | Installed |
| Pydantic Settings | 2.16.2 | Installed |
| SQLAlchemy | 2.1.6 | Installed |
| Alembic | 1.20.1 | Installed; identity revision implemented |
| Psycopg | 3.3.6 | Installed with binary extra |
| Uvicorn | 0.54.0 | Installed |
| email-validator | 2.3.0 | Installed for identity email validation |
| Pytest | 9.2.0 | Installed |
| HTTPX2 | 2.16.0 | Installed for the current Starlette TestClient |
| Ruff | 0.17.3 | Installed |
| Mypy | 2.4.1 | Installed |
| PostgreSQL | 16 | Compose configuration; service not available in the current environment |
| Redis | 7 Alpine | Compose configuration; optional for coordination |

The API requires Python 3.12 or newer and below 3.15. The team development baseline is the exact version above.

## Client baseline for Teammate B

| Component | Selected version |
| --- | --- |
| Node.js | 22.23.1 |
| npm | 10.9.8 |
| Next.js | 16.4.3 |
| React and React DOM | 19.3.1 |
| TypeScript | 7.0.2 |
| Tailwind CSS | 4.3.3 |
| ESLint | 10.14.0 |
| Vitest | 5.0.5 |
| Playwright | 1.64.1 |
| Python Telegram Bot | 22.8 |

These versions were checked in the package registries. They are the selected starting baseline, not proof that the client applications install or build. B must verify compatibility during scaffolding and report any required version adjustment before changing the baseline.

Use npm, not a second package manager. Commit `package-lock.json` when B creates the application. Serve the Mini App through the web application; do not create a separate negotiation backend.

## Selected Phase 1 libraries

- `cryptography==50.0.2` for Ed25519 and private-key encryption. It will be added with agent identity.
- `argon2-cffi==25.1.0` for password hashing. It is installed and used by authentication.

## LLM boundary

No LLM provider is selected or required for Phase 0. Deterministic demo behavior must remain available without an API key.
