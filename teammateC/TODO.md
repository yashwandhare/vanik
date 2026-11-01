# DevC TODO — Deterministic Commerce Domain

Own only new files under `apps/api/app/domain/`, matching tests under `apps/api/tests/domain/`, `scripts/validate_demo.py` and `teammateC/`.

## Seller strategies

- [ ] Pure typed input/output models containing sanitized RFQ lines, trusted reference prices, stock, delivery/credit policy and synthetic buyer risk credential.
- [ ] Margin, clearance, payment-risk and adversarial strategies with deterministic round concessions and private floors.
- [ ] Never accept buyer budget, database sessions, secrets, tools or competitor identity in seller strategy input.
- [ ] Timeout/failure simulation must be explicit and testable.

## Validation and security

- [ ] Recompute line/offer totals; verify exact SKU/quantity/unit coverage.
- [ ] Validate budget, delivery, expiry, stock, seller floor and payment/credit limits from typed trusted context.
- [ ] Tool-less seller-note classifier: commercial, irrelevant or suspicious instruction.
- [ ] Fake-discount evidence using trusted benchmark/original/offer values; review signal, not fraud accusation.
- [ ] Basic collusion review signals grouped by distinct principal, never multiple agents of one principal.

## Ranking and demo validation

- [ ] Reject hard failures before scoring.
- [ ] Explainable weighted price/reliability/delivery/credit/availability contributions.
- [ ] Reliability uses supplied evidence count/source IDs; new sellers remain unrated/limited, not given invented ratings.
- [ ] Validate fixture has exactly 40 unique SKUs, required categories, positive prices and internally feasible basket totals.
- [ ] Comprehensive pure unit tests including adversarial/boundary cases.

## Delivery

- [ ] Run Ruff, strict Mypy and focused tests.
- [ ] Push only `devc`; open PR to `main`; include concise integration API for DevA.
