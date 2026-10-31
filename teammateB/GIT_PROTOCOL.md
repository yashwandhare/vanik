# Git Protocol for Main and Teammate B

This protocol applies after Main initializes the repository and publishes the GitHub URL.

## Branch ownership

| Branch pattern | Owner | Purpose |
| --- | --- | --- |
| `main` | Main | Stable integration branch |
| `feat/main-*` | Main | Main feature work |
| `fix/main-*` | Main | Main fixes |
| `feat/b-*` | Teammate B | B feature work |
| `fix/b-*` | Teammate B | B fixes |

## Mandatory rules

1. Only Main can merge into `main`.
2. Teammate B must never push directly to `main`.
3. Teammate B works only on B-owned feature or fix branches.
4. Every B change reaches `main` through a Pull Request.
5. Never commit secrets, `.env`, private keys, tokens or real identity data.
6. Never rewrite or force-push `main` or a shared branch.
7. Do not force-push a B branch unless Main explicitly approves `--force-with-lease`.
8. Do not silently change an API, schema, route or state name.
9. Stage only files that belong to the current task.
10. Run relevant checks before every PR update.

## Start a task

Update the local integration branch:

```bash
git switch main
git pull --ff-only origin main
```

Create a B-owned branch:

```bash
git switch -c feat/b-<short-task>
```

Use `fix/b-<short-task>` for a focused bug fix.

## Commit work

Inspect the change first:

```bash
git status
git diff
```

Run the relevant tests, lint, type checks and build. Stage specific files:

```bash
git add <specific-files>
git commit -m "<type>: <short description>"
```

Use these commit types:

- `feat:` new behavior.
- `fix:` bug fix.
- `test:` tests.
- `docs:` documentation.
- `refactor:` behavior-preserving restructuring.
- `chore:` tooling or configuration.
- `style:` formatting only.

Keep each commit focused. Do not combine unrelated web, bot and documentation work.

## Push the branch

```bash
git push -u origin feat/b-<short-task>
```

Never run:

```bash
git push origin main
```

## Update a B branch from `main`

Commit or stash local changes first. Then run:

```bash
git fetch origin
git switch feat/b-<short-task>
git merge origin/main
```

Resolve conflicts only in files you understand. Ask Main before resolving a conflict in shared contracts or Main-owned files.

Run checks again, then push:

```bash
git push origin feat/b-<short-task>
```

Merge `origin/main` into the B branch. Do not rebase a branch that another person uses.

## Open a Pull Request

Use:

- **Base:** `main`
- **Compare:** the B-owned branch
- **Title:** Conventional Commit style

Include:

```text
## What
-

## Why
-

## Files or modules changed
-

## API or schema changes
- None / approved change reference

## Verification
- [ ] Unit tests
- [ ] UI or integration tests
- [ ] Lint and type checks
- [ ] Build
- [ ] Manual UI or bot check

## Screenshots
-

## Risks or limitations
-

## Dependencies on Main
-
```

Do not mark a check as complete unless it ran successfully.

## Review and merge

Main reviews ownership, contracts, security boundaries, tests and integration risk. Teammate B responds on the same branch.

Only Main merges the PR. The preferred merge method is squash and merge. After Main confirms the merge, update local `main` and delete obsolete local branches.

## Contract-change protocol

When a client needs a contract change:

1. Stop work that depends on the uncertain field or behavior.
2. Send Main the endpoint, current contract, requested change and reason.
3. Continue another unblocked task.
4. Wait for Main to publish or approve the contract.
5. Update mocks, types, tests and UI together after approval.
