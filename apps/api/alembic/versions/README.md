# Database revisions

- `20261031_0001_identity.py` creates users, opaque sessions, principals, memberships and hashed business-identifier storage.
- `20261031_0002_verification.py` adds verification timestamps and one identifier per type.
- `20261031_0003_telegram.py` adds single-use link tokens and revocable Telegram links.
- `20261031_0004_agents.py` adds agents, encrypted signing keys, permission ceilings and append-only lifecycle events.

Main owns revision order and migration review. Do not rewrite a revision after it reaches `main`; add a new revision instead.
