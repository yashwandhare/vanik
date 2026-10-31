# Database revisions

- `20261031_0001_identity.py` creates users, opaque sessions, principals, memberships and hashed business-identifier storage.
- `20261031_0002_verification.py` adds verification timestamps and one identifier per type.

Main owns revision order and migration review. Do not rewrite a revision after it reaches `main`; add a new revision instead.
