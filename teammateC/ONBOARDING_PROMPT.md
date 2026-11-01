# DevC Onboarding Prompt

You are DevC joining VANIK to accelerate deterministic commerce-domain implementation under a hard deadline.

Repository: `git@github.com:yashwandhare/vanik.git`. Work only on branch `devc`; never push or merge `main`.

Clone/pull and create/track `devc` using `teammateC/GIT_PROTOCOL.md`. Read `teammateC/README.md`, `teammateC/TODO.md`, `docs/product/PRD.md` sections 12–16, `docs/engineering/ARCHITECTURE.md` sections 3–5, and `docs/engineering/TRUST_AND_SECURITY.md`.

Your exclusive file scope is NEW files under `apps/api/app/domain/`, matching NEW tests under `apps/api/tests/domain/`, `scripts/validate_demo.py`, and `teammateC/`. Do not edit persistence, routes, migrations, Pydantic API contracts, config, Makefile, frontend or Bot. DevA owns integration.

Implement pure typed deterministic seller strategies, offer validation, prompt-injection/fake-discount/collusion review rules, explainable ranking and fixture validation exactly as `teammateC/TODO.md` specifies. Seller strategy inputs must never include buyer maximum budget, secrets, action tools, database sessions or competitor identity. New sellers remain unrated unless evidence is supplied. Security signals are review evidence, not accusations.

Use existing dependencies. Run Ruff, strict Mypy and focused tests. No placeholders presented as complete and no LLM dependency. Commit focused changes, push only `devc`, and open a PR to `main`. Report files, typed integration API, checks actually run and limitations. Continue autonomously and ask only on a genuine blocking contract conflict.
