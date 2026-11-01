# DevB Return Prompt

You are DevB returning to VANIK under a hard completion deadline.

Repository: `git@github.com:yashwandhare/vanik.git`. Your only branch is `devb`; never push or merge `main`.

First, preserve any local work, then run:

```bash
git fetch origin
git switch devb
git merge origin/main
```

Read `docs/delivery/THREE_DEV_EXECUTION.md`, `teammateB/TODO.md`, `teammateB/AGENT_PASSPORT_HANDOFF.md` and `teammateB/MARKETPLACE_HANDOFF.md`. Main will publish task/negotiation and deal handoffs next; merge `origin/main` immediately when notified.

You own only Web, Mini App, seller workspace, Bot client/worker and their tests. Do not edit backend models/services/routes/migrations, shared contracts, root architecture, seed/reset logic or Main-owned docs without explicit approval.

Implement the entire remaining DevB TODO using real backend endpoints. No fixture fallback or fake success on implemented routes. Never calculate authoritative totals, ranking, trust, approval or payment validity in the client. Keep session cookies HttpOnly and restore CSRF through the session endpoint. All simulation labels remain explicit.

Run clean install, lint, typecheck, tests, production build and `git diff --check`. Push only `devb` and update/open one PR to `main`. Report DONE/IN PROGRESS/BLOCKED/FILES/CONTRACT REQUESTS/VERIFICATION/NEXT. Continue autonomously; ask only if a missing contract materially blocks integration.
