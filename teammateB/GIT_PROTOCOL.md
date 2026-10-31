# Git Protocol for Main and Teammate B

Repository: `git@github.com:yashwandhare/vanik.git`.

## Branch ownership

| Branch | Owner | Purpose |
| --- | --- | --- |
| `main` | Main | Stable integration branch |
| `feat/main-*` | Main | Main feature work |
| `fix/main-*` | Main | Main fixes |
| `devb` | Teammate B | All B implementation and fixes |

`devb` is B's only working and push branch. This rule replaces the earlier per-task B branch convention.

## Mandatory rules

1. Only Main can merge into `main`.
2. B must never push directly to `main`.
3. B works and pushes only on `devb`.
4. B opens Pull Requests from `devb` to `main`.
5. Never commit secrets, `.env`, private keys, tokens or real identity data.
6. Never force-push or rewrite a shared branch.
7. Do not silently change an API, schema, route or state name.
8. Stage only files that belong to the current task.
9. Run relevant checks before every PR update.
10. Keep `devb` after a merge. Do not delete it as a disposable feature branch.

## Initial setup

Clone the repository if needed:

```bash
git clone git@github.com:yashwandhare/vanik.git
cd vanik
```

Inspect the current state:

```bash
git status
git branch --show-current
git remote -v
```

Do not discard uncommitted changes. Resolve or report them before switching branches.

With a clean working tree, update `main` and select or create `devb`:

```bash
git fetch origin
git switch main
git pull --ff-only origin main

if git show-ref --verify --quiet refs/heads/devb; then
    git switch devb
elif git show-ref --verify --quiet refs/remotes/origin/devb; then
    git switch --track -c devb origin/devb
else
    git switch -c devb main
fi

if git show-ref --verify --quiet refs/remotes/origin/devb; then
    git merge origin/devb
fi
git merge origin/main
```

If `devb` already exists remotely, preserve its history. Do not recreate or reset it from `main`.

## Commit work

Inspect the change first:

```bash
git status
git diff
git branch --show-current
```

The branch must be `devb`. Run relevant tests, lint, type checks and builds. Stage specific files:

```bash
git add <specific-files>
git commit -m "<type>: <short description>"
```

Use Conventional Commit types such as `feat:`, `fix:`, `test:`, `docs:` and `chore:`. Keep each commit focused.

## Push only to devb

```bash
git push -u origin devb
```

Never push to `main` or another branch.

## Keep devb current

Commit your local work first. Then run:

```bash
git fetch origin
git switch devb
git merge origin/devb
git merge origin/main
```

Ask Main before resolving conflicts in shared contracts or Main-owned files. Run checks again, then push:

```bash
git push origin devb
```

Merge `origin/main` into `devb`. Do not force-push or rebase shared history.

## Open a Pull Request

Use:

- **Base:** `main`
- **Compare:** `devb`
- **Reviewer:** Main
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
- [ ] Tests
- [ ] Lint and type checks
- [ ] Build
- [ ] Manual UI or Bot check

## Screenshots
-

## Risks or limitations
-

## Dependencies on Main
-
```

Do not mark a check complete unless it ran successfully.

## Review and merge

Main reviews ownership, contracts, security boundaries, tests and integration risk. B responds on `devb`.

Only Main merges the PR. After a merge, update `devb` from `origin/main` using the workflow above. Keep the branch for the next task.

## Contract changes

When the client needs a contract change:

1. Stop work that depends on the uncertain behavior.
2. Send Main the endpoint, current contract, requested change and reason.
3. Continue another unblocked task.
4. Wait for Main to publish or approve the contract.
5. Update mocks, types, tests and UI together after approval.
