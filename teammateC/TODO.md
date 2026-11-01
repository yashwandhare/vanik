# DevC TODO — Deterministic Commerce Domain

Own only new files under `apps/api/app/domain/`, matching tests under `apps/api/tests/domain/`, `apps/api/scripts/validate_demo.py` and `teammateC/`.

## Seller strategies

- [x] Pure typed input/output models containing sanitized RFQ lines, trusted reference prices, stock, delivery/credit policy and synthetic buyer risk credential.
- [x] Margin, clearance, payment-risk and adversarial strategies with deterministic round concessions and private floors.
- [x] Never accept buyer budget, database sessions, secrets, tools or competitor identity in seller strategy input.
- [x] Timeout/failure simulation must be explicit and testable.

## Validation and security

- [x] Recompute line/offer totals; verify exact SKU/quantity/unit coverage.
- [x] Validate budget, delivery, expiry, stock, seller floor and payment/credit limits from typed trusted context.
- [x] Tool-less seller-note classifier: commercial, irrelevant or suspicious instruction.
- [x] Fake-discount evidence using trusted benchmark/original/offer values; review signal, not fraud accusation.
- [x] Basic collusion review signals grouped by distinct principal, never multiple agents of one principal.

## Ranking and demo validation

- [x] Reject hard failures before scoring.
- [x] Explainable weighted price/reliability/delivery/credit/availability contributions.
- [x] Reliability uses supplied evidence count/source IDs; new sellers remain unrated/limited, not given invented ratings.
- [x] Validate fixture has exactly 40 unique SKUs, required categories, positive prices and internally feasible basket totals.
- [x] Comprehensive pure unit tests including adversarial/boundary cases.

## Delivery

- [x] Run Ruff, strict Mypy and focused tests.
- [x] Push only `devc`; open PR to `main`; include concise integration API for DevA.

PR: https://github.com/yashwandhare/vanik/pull/15

Integration API: `teammateC/DOMAIN_API.md`.
