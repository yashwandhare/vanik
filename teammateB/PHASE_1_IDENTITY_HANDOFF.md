# Phase 1 Identity Endpoint Handoff

Main implemented the first real identity endpoints. B can replace identity mocks incrementally after this branch reaches `main`.

## Implemented routes

| Route | Client requirements |
| --- | --- |
| `POST /v1/auth/register` | Send `RegisterRequest`, `Origin`, and no credentials cookie |
| `POST /v1/auth/login` | Send `LoginRequest`, `Origin`, and `credentials: "include"` |
| `GET /v1/auth/session` | Send `credentials: "include"` |
| `POST /v1/auth/logout` | Send `Origin`, `X-CSRF-Token`, and credentials |
| `POST /v1/principals` | Send `PrincipalCreateRequest`, Origin, CSRF token, and credentials |
| `GET /v1/principals/{id}` | Send credentials; only active members can read it |

Use the existing version 1 schemas. The server returns the common error envelope and `X-Request-ID`.

## Browser rules

- Keep the session token in the HttpOnly cookie. Never copy it to client storage.
- Keep the returned CSRF token in memory. Send it on authenticated mutations.
- Use `credentials: "include"` for session and protected requests.
- Treat `401` as signed out, `403` as origin/CSRF/permission failure, `409` as registration conflict, and `429` as rate limited.
- Do not infer that a hidden principal exists when its read returns `404`.
- All versioned API responses use `Cache-Control: no-store`.

## Still mock-only

- Simulated verification actions and identifiers.
- Telegram linking.
- Agent creation and Agent Passport persistence.
- Marketplace, negotiation, approval and payment.

Do not connect those screens to fabricated routes. Report any contract mismatch to Main before changing shared schemas.
