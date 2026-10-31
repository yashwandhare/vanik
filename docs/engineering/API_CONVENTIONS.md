# API Conventions — Version 1

Main owns these conventions. Client changes must not redefine them.

## Implementation status

Only `GET /health` and `GET /health/ready` are implemented. The initial identity schemas are published, but their endpoints are not implemented yet.

## Routes and responses

- Business routes use `/v1`.
- Health routes remain outside the business API prefix.
- Successful object responses return the object directly.
- Successful collection responses use `items` and `pagination`.
- Errors use the common `ErrorResponse` contract.
- Unknown request fields are rejected.
- Server-generated UUIDs identify resources.
- Timestamps use timezone-aware ISO 8601 values. The server emits UTC.
- Monetary JSON values use decimal strings, not floating-point numbers.
- P0 commerce uses `INR`.

## Pagination

Collections use `limit` and `offset`:

- Default `limit`: 20.
- Maximum `limit`: 100.
- Default `offset`: 0.
- `pagination.total`: number of records matching the authorized query.

Results must use stable ordering. Main will define each endpoint's ordering when it is implemented. The count must not expose records outside the caller's principal scope.

## Error envelope

```json
{
  "error": {
    "code": "validation_error",
    "message": "Request validation failed.",
    "details": [
      {
        "field": "body.email",
        "code": "value_error",
        "message": "Invalid or missing value."
      }
    ],
    "request_id": "40000000-0000-4000-8000-000000000001"
  }
}
```

The server also sends `X-Request-ID`. It does not trust a caller-provided request ID.

Common status codes:

| HTTP status | Error code |
| --- | --- |
| 401 | `unauthenticated` |
| 403 | `forbidden` |
| 404 | `not_found` |
| 405 | `method_not_allowed` |
| 409 | `conflict` |
| 422 | `validation_error` |
| 429 | `rate_limited` |
| 500 | `internal_error` |
| 503 | `service_unavailable` |

Do not echo passwords, rejected input values, signing secrets, database exceptions or hidden business data in error responses.

## Authentication decision for Phase 1

P0 uses email and password authentication. Mobile login is deferred; the PRD permits either flow.

- Passwords use Argon2id hashing.
- Registration does not automatically authenticate the user.
- Login creates a server-side opaque session and returns `SessionResponse`.
- The session expires after eight hours; no refresh token is planned for P0.
- Store only a hash of the session token in the database.
- Logout revokes the session immediately.
- The browser receives the session in an HttpOnly cookie named `vanik_session`.
- Production cookies use `Secure` and `SameSite=Lax`.
- Use same-site HTTPS hosting for the production web, API and Mini App.
- Browser requests use `credentials: "include"`.
- Login, logout and registration require an allowed Origin for browser access.
- Authenticated state-changing requests also require `X-CSRF-Token` bound to the current session.
- Never store the session token in JavaScript storage.

Proposed identity routes:

| Route | Request contract | Success response |
| --- | --- | --- |
| `POST /v1/auth/register` | `RegisterRequest` | `201 UserResponse` |
| `POST /v1/auth/login` | `LoginRequest` | `200 SessionResponse` and cookie |
| `GET /v1/auth/session` | None | `200 SessionResponse` |
| `POST /v1/auth/logout` | CSRF header | `204` |
| `POST /v1/principals` | `PrincipalCreateRequest` | `201 PrincipalResponse` |
| `GET /v1/principals/{principal_id}` | None | `200 PrincipalResponse` for an authorized member |
| `POST /v1/principals/{principal_id}/agents` | `AgentCreateRequest` | `201 AgentPassportResponse` |
| `GET /v1/principals/{principal_id}/agents` | None | `200 AgentListResponse` |
| `GET /v1/agents/{agent_id}/passport` | None | `200 AgentPassportResponse` with the approved public subset |

Agent capabilities and tools are requests, not grants of authority. The backend validates them against principal policy.

Telegram identity is linked to a human user by a server-validated one-time token. The Bot must not accept a Telegram username as ownership proof. Main will publish the Bot service authentication and linking wire contracts before B integrates commands.

## Remaining contract work

The following remain proposed and must not be treated as implemented or frozen schemas:

- Verification and business-identifier requests.
- Telegram linking and notifications.
- Seller discovery, inventory and ranking results.
- Mandates, signed messages, offers and negotiation action responses.
- Deal versions, approval challenges and mock receipts.

Main will publish each pack before B wires its dependent screens.
