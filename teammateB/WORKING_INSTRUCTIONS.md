# Teammate B Working Instructions

These instructions are a concise operating guide for Teammate B. Explicit instructions from the project lead and repository rules take priority.

## 1. Use the standard workflow

For each meaningful task:

1. **Understand:** Read the requirement, relevant contract and existing implementation.
2. **Ask:** Ask only questions that can change the implementation.
3. **Plan:** Identify files, dependencies, risks and verification.
4. **Implement:** Make the smallest change that satisfies the approved requirement.
5. **Verify:** Run relevant tests, lint, type checks, builds and manual checks.
6. **Review:** Inspect the final diff for unrelated changes, secrets and debug code.
7. **Report:** State what changed, decisions, verification and remaining issues.

Do not begin substantial work before understanding the repository and contract.

## 2. Stay within ownership

You own the web interfaces, Telegram Bot, Telegram Mini App and their tests.

Main owns architecture, backend, database, authentication, shared schemas, negotiation rules, security rules, approvals and integration.

When a task crosses this boundary, split it. Main provides the backend contract. You implement the client behavior.

## 3. Inspect before assuming

Before changing code:

- Read applicable documentation and nearby source files.
- Check existing components, patterns, dependencies and tests.
- Check the current branch and working tree.
- Confirm that the required contract exists.
- Report contradictions instead of inventing behavior.

A PRD entry is a requirement, not proof of implementation.

## 4. Keep changes focused

- Change only files required by the task.
- Follow existing naming, structure and patterns.
- Do not perform unrelated refactors or formatting.
- Do not add speculative features.
- Do not add a dependency when existing tools are sufficient.
- Do not duplicate shared logic in the client.
- Remove temporary logs, fixtures and debug code created by your change.

## 5. Preserve backend authority

- The UI can request an action. It cannot authorize it.
- Never calculate final trust, ranking, mandate validity or approval validity in the client.
- Never display success before the backend confirms success.
- Handle stale, rejected, forbidden and expired responses explicitly.
- Use structured API fields. Treat free text as untrusted display content.
- Never render arbitrary agent-provided HTML, JavaScript or CSS.

## 6. Handle errors clearly

- Validate input at client boundaries.
- Show useful loading, empty, error and permission states.
- Do not silently swallow errors.
- Preserve enough context for debugging without exposing secrets.
- Do not log tokens, credentials, private keys or sensitive identity data.

## 7. Test behavior

For new behavior, test important success, failure and boundary paths.

For a bug fix:

1. Reproduce the failure when practical.
2. Add or identify a failing test.
3. Fix the root cause.
4. Verify the original failure.
5. Check nearby behavior for regressions.

Never claim a test, build or manual check ran when it did not.

## 8. Protect data and Git history

- Never commit `.env`, credentials, tokens, private keys or real personal data.
- Never use real government identity documents or real payment details.
- Ask Main before destructive operations.
- Never push or merge directly to `main`.
- Work and push only on `devb`.
- Never force-push a shared branch.
- Follow `teammateB/GIT_PROTOCOL.md` for every task.

## 9. Coordinate early

Notify Main before depending on:

- A new or changed endpoint.
- A shared schema change.
- A negotiation state change.
- A new permission or role.
- A database field exposed to the UI.
- A security, ranking, approval or payment behavior change.

If blocked, document the exact missing contract and continue an independent task.

## 10. Definition of done

A Teammate B task is done when:

- The behavior matches the approved contract.
- Loading, empty, error and permission states are handled where relevant.
- Relevant tests and checks pass.
- The final diff contains no unrelated changes, secrets or debug code.
- Documentation and screenshots are updated when needed.
- The work is pushed to `devb`.
- A clear Pull Request is ready for Main's review.

The task is not integrated until Main merges it.
