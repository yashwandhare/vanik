# VANIK — API Reference

This document describes the API conventions, authentication mechanisms, and primary endpoints for the VANIK backend.

---

## 1. Conventions

- **Base URL:** `/v1` for all business endpoints.
- **Health Endpoints:** `/health` and `/health/ready` operate outside the `/v1` prefix.
- **Data Format:** JSON requests and responses. Unknown request body fields are rejected.
- **Identifiers:** Canonical UUID v4 strings for all resource IDs.
- **Timestamps:** ISO 8601 UTC strings (e.g., `2026-11-01T10:14:00Z`).
- **Monetary Values:** Fixed-precision decimal strings in Indian Rupees (`INR`), such as `"79850.00"`. Floating-point numbers are not used for currency.

---

## 2. Authentication and Security

- **Session Management:** Opaque HttpOnly cookies (`vanik_session`) store session tokens. Sessions expire after eight hours.
- **CSRF Protection:** State-changing requests (`POST`, `PUT`, `DELETE`) require an `X-CSRF-Token` header matching the active session.
- **Rate Limiting:** Authentication routes enforce per-IP and per-account attempt limits.

---

## 3. Error Envelope

All error responses return HTTP status codes >= 400 with a standard JSON envelope:

```json
{
  "error": {
    "code": "validation_error",
    "message": "Request validation failed.",
    "request_id": "70d5049b-77ed-4747-a54a-5ecc4a9cecd6",
    "details": [
      {
        "field": "body.email",
        "code": "value_error",
        "message": "Invalid email address format."
      }
    ]
  }
}
```

---

## 4. Primary Endpoints

### 4.1 System Health

| Method | Path | Description | Auth Required |
|---|---|---|---|
| `GET` | `/health` | Service liveness probe | No |
| `GET` | `/health/ready` | Database readiness check (`SELECT 1`) | No |

### 4.2 Authentication & User Sessions

| Method | Path | Description | Auth Required |
|---|---|---|---|
| `POST` | `/v1/auth/register` | Register human account with email and password | No |
| `POST` | `/v1/auth/login` | Authenticate credentials and receive session cookie | No |
| `GET` | `/v1/auth/session` | Retrieve active session details and CSRF token | Yes |
| `POST` | `/v1/auth/logout` | Revoke active session | Yes |

### 4.3 Business Principals

| Method | Path | Description | Auth Required |
|---|---|---|---|
| `POST` | `/v1/principals` | Register business principal entity | Yes |
| `GET` | `/v1/principals/{principal_id}` | Read principal details and authority bounds | Yes |
| `POST` | `/v1/principals/{principal_id}/identifiers` | Submit GSTIN/PAN business identifiers | Yes |
| `POST` | `/v1/principals/{principal_id}/verification/demo` | Run simulated credential verification | Yes |

### 4.4 Agent Lifecycle & Passports

| Method | Path | Description | Auth Required |
|---|---|---|---|
| `POST` | `/v1/principals/{principal_id}/agents` | Create autonomous trading agent with Ed25519 key | Yes |
| `GET` | `/v1/principals/{principal_id}/agents` | List agents belonging to principal | Yes |
| `GET` | `/v1/agents/{agent_id}/passport` | Retrieve public Agent Passport and key fingerprint | No |
| `POST` | `/v1/agents/{agent_id}/pause` | Temporarily suspend agent trading permissions | Yes |
| `POST` | `/v1/agents/{agent_id}/resume` | Restore agent trading permissions | Yes |
| `POST` | `/v1/agents/{agent_id}/revoke` | Permanently revoke agent and invalidate key | Yes |

### 4.5 Catalogue & Inventory

| Method | Path | Description | Auth Required |
|---|---|---|---|
| `GET` | `/v1/catalogue` | List mandi commodity SKUs and benchmark prices | No |
| `GET` | `/v1/sellers` | Discover wholesale sellers and ratings | No |
| `GET` | `/v1/sellers/{principal_id}/inventory` | Inspect available wholesale stock for seller | No |
| `POST` | `/v1/sellers/{principal_id}/inventory` | Update stock quantity or pricing policy | Yes |

### 4.6 Mandates, Negotiations & Deals

| Method | Path | Description | Auth Required |
|---|---|---|---|
| `POST` | `/v1/tasks` | Create procurement task and assign mandate | Yes |
| `GET` | `/v1/negotiations/{negotiation_id}` | Retrieve real-time rounds and message timeline | Yes |
| `POST` | `/v1/negotiations/{negotiation_id}/messages` | Submit signed A2A wire message | Yes |
| `GET` | `/v1/deals/{deal_id}` | Retrieve finalized deal terms and counterparty info | Yes |
| `POST` | `/v1/deals/{deal_id}/authorize` | Submit cryptographic human approval for settlement | Yes |

### 4.7 Telegram Integration

| Method | Path | Description | Auth Required |
|---|---|---|---|
| `POST` | `/v1/telegram/link/start` | Generate single-use six-character link code | Yes |
| `POST` | `/v1/telegram/link/complete` | Complete account linkage with Telegram user ID | Yes (Bot) |
| `DELETE` | `/v1/telegram/link` | Unlink Telegram account | Yes |
