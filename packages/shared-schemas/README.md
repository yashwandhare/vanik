# Shared Schemas

Version-controlled JSON schema definitions and wire contract fixtures for VANIK.

---

## 1. Overview

This package defines shared contracts between the backend API, frontend web portal, and Telegram bot clients:

- Pydantic models define source contracts in `apps/api/app/contracts/`.
- Exported JSON Schema specifications are committed in `v1/`.
- Synthetic test fixtures validate against committed schemas in `v1/fixtures/`.

---

## 2. Included Contracts

- **Health & Readiness:** Service status and database connection envelopes.
- **Error Envelopes:** Standardized `ErrorResponse` with request correlation IDs and validation details.
- **Identity & Membership:** Registration, login, principal profiles, and business identifiers (GSTIN, PAN).
- **Agent Lifecycle:** Agent creation, Agent Passports, Ed25519 public key fingerprints, and capability scopes.
- **Telegram Linking:** Token generation and bi-directional user binding.

---

## 3. Export and Validation

Run commands from the repository root:

```bash
# Export updated schemas from Python contract models
make contracts

# Verify that committed schemas and fixtures match Python definitions
make test
```
