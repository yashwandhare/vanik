# Phase 0 Handoff to Teammate B

## Ready for client scaffolding

Main selected the [technology baseline](../docs/engineering/TECHNOLOGY_BASELINE.md) and published the initial [API conventions](../docs/engineering/API_CONVENTIONS.md).

After Main merges this foundation into `main`, B pulls `main`, switches to `devb` and follows [the Git protocol](GIT_PROTOCOL.md). All B implementation and pushes use `devb` only.

## Start these tasks

1. Set up Next.js, React, TypeScript and Tailwind using the selected baseline.
2. Add npm lockfile, lint, tests and build commands.
3. Establish navigation, layouts, design tokens and responsive page shells.
4. Add a typed API client that uses the documented error envelope.
5. Build registration, login, principal and Agent Passport mock views.
6. Use the versioned identity fixtures in `packages/shared-schemas/v1/fixtures/`.
7. Label mock-backed screens clearly until real endpoints are connected.

The Mini App belongs inside the web application. Do not create a separate business-state implementation.

## Available contracts

The pack contains 12 JSON schemas and matching synthetic fixtures:

- Common health and error responses.
- Registration and login requests.
- User and session responses.
- Principal creation and response.
- Agent creation, Passport and agent-list responses.

UUIDs, timestamp strings, decimal strings, verification states and public-key fingerprints are defined in these contracts. Do not invent replacements.

## What is not ready

- Authentication and identity persistence endpoints.
- Business verification action schemas.
- Telegram linking and service authentication.
- Seller discovery, inventory and ranking schemas.
- Task, negotiation, offer, approval and receipt schemas.

B can build layout shells for these areas. Do not fabricate their API fields or implement their backend decisions.

## Checkpoint

Before integration, report:

- Dependency installation and compatibility results.
- Lint, type checks, tests and production-build results.
- Any baseline version conflict.
- Any missing identity field required by the planned UI.

Main will provide the next contract pack during Phase 1.
