# Three-Developer Completion Plan

**Deadline:** 08:00 local time. **Integration owner:** DevA. **Stable branch:** `main`.

## Current baseline

Merged and CI-verified: identity, verification, Telegram linking, Agent Passports, encrypted Ed25519 keys, web/Bot foundations, 40-SKU catalogue, seller profiles, discovery and inventory.

Pending: task mandates, negotiation protocol/runtime, trust decisions, deals/approval/payment, complete events/replay/memory/proactivity, real workflow UI/Bot integration, demo/reset and rehearsal.

## Ownership

| Owner | Branch | Exclusive scope |
| --- | --- | --- |
| DevA | `feat/main-*` | Shared contracts, persistence/migrations, API routes, negotiation integration, deals/events, seed/reset/demo, final merges |
| DevB | `devb` only | Web, Mini App, seller workspace, Bot command/notification UI, client tests/build |
| DevC | `devc` only | Pure deterministic strategy/validation/security/ranking modules and tests; fixture/demo validator |

Do not edit another owner's files. Contract changes go through DevA. Only DevA merges to `main`.

## Integration order

1. DevC publishes pure domain modules and tests; DevA integrates them into negotiation services.
2. DevA publishes task/negotiation contracts/routes, then deals/events routes.
3. DevB merges `origin/main` after each Main backend PR and wires only published endpoints.
4. DevA integrates DevB/DevC PRs after clean checks.
5. Final seed/reset/demo/rehearsal starts only after all automated suites pass.

## Required handoff format

```text
DONE:
IN PROGRESS:
BLOCKED:
FILES OWNED/CHANGED:
CONTRACT CHANGES REQUESTED:
VERIFICATION ACTUALLY RUN:
NEXT:
```

## Non-negotiable rules

- No fake success, hidden fallback or placeholder presented as implemented.
- No real KYC/payment/data. Label every simulation.
- No LLM dependency on the deterministic demo path.
- Backend remains authoritative for authority, security, ranking, approval and settlement.
- Never commit or log secrets/private keys/session tokens.
- Never push directly to `main` or force-push.
- User-dependent manual Telegram/deployment checks can remain explicitly pending; automated work cannot.
