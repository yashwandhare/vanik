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

## Verification endpoints

These routes are now implemented:

- `POST /v1/principals/{id}/identifiers`
- `POST /v1/principals/{id}/verification/demo`

Use `BusinessIdentifierCreateRequest`, `BusinessIdentifierResponse` and `DemoVerificationResponse`. The identifier request must set `is_synthetic` to `true`. The UI must display the returned `SIMULATED / DEMO` label and must never request a real identity document.

The backend stores a keyed digest and a display-safe mask, not the raw identifier. One identifier of each type is allowed per principal.

## Telegram linking endpoints

These routes are now implemented:

- `POST /v1/telegram/link/start`
- `POST /v1/telegram/link/complete`
- `DELETE /v1/telegram/link`

The web start/unlink calls require the session cookie, Origin and CSRF token. Only the Bot worker can complete a link; it sends `X-Telegram-Bot-Secret`. Never use a Telegram username as ownership evidence. Link codes expire after ten minutes, are single-use and are stored only as digests.

## Still mock-only

- Telegram commands and notifications.
- Agent creation and Agent Passport persistence.
- Marketplace, negotiation, approval and payment.

Do not connect those screens to fabricated routes. Report any contract mismatch to Main before changing shared schemas.
