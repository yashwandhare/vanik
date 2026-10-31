# Shared Schemas

Main owns shared contracts. Teammate B consumes published versions and proposes changes before relying on new fields.

## Version 1 identity contract pack

The Pydantic sources live in `apps/api/app/contracts/`. The exported JSON Schema files and synthetic examples live in `v1/` and `v1/fixtures/`.

The initial pack includes:

- Health and readiness responses.
- Standard error envelope.
- Registration and login requests.
- User and session responses.
- Principal creation and principal response.
- Agent creation, Agent Passport and agent-list responses.
- Synthetic business-identifier requests and responses.
- Clearly labeled demo-verification responses.
- Telegram link start, completion and response contracts.

The `v1` directory is a contract namespace, not an implemented negotiation protocol. Mandate, offer, deal and signed-message wire contracts remain proposed until Main publishes their complete schemas.

## Export and verify

From the repository root:

```bash
make contracts
make test
```

Tests verify that committed schemas match the Python definitions and that fixtures validate against those definitions.

Use `.schema.json` files for client validation or type generation. Use fixtures for clearly labeled mock views. Never use their synthetic passwords, CSRF tokens or public test-vector keys as live credentials.

Response schemas describe JSON serialization. Decimal response values use strings to avoid JavaScript precision loss. Validation schemas describe request bodies. Unknown object fields are rejected.

See [API conventions](../../docs/engineering/API_CONVENTIONS.md), [protocol and API](../../docs/engineering/PROTOCOL_AND_API.md) and [B handoff](../../teammateB/PHASE_0_HANDOFF.md).
