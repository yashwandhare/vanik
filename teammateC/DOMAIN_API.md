# DevC Domain Integration API

DevC owns pure deterministic functions only. These modules do not read or write the database, call
routes, send messages, or depend on an LLM. DevA should adapt trusted persistence and wire-schema
data into the typed models below.

## Import

```python
from app.domain import (
    OfferDraft,
    OfferValidationContext,
    RankingCandidate,
    RankingRequest,
    SellerStrategyContext,
    classify_seller_note,
    detect_collusion_signals,
    detect_fake_discount,
    generate_offer,
    rank_offers,
    validate_offer,
)
```

All models are frozen, reject extra fields, and strip string whitespace.

## Seller strategies

```python
decision = generate_offer(context: SellerStrategyContext)  # OfferDraft | SellerFailure
```

`SellerStrategyContext` contains only:

- sanitized `Rfq` lines, trusted reference prices, stock, seller policy/private floors
- synthetic `BuyerRiskCredential`
- `round_index`, `max_rounds`, `now`
- optional explicit `FailureSimulation`

It intentionally rejects buyer maximum budget, database sessions, secrets, action tools, and
competitor identity. Expected business failures return `SellerFailure` (`timeout`, `error`,
`malformed_offer`, `declined`); they are not exceptions.

## Offer validation

```python
result = validate_offer(offer: OfferDraft, context: OfferValidationContext)
```

`OfferValidationContext` supplies the RFQ, mandate budget/payment limits, trusted stock, seller
policy/private floors, synthetic buyer risk, and `now`. Validation recomputes every line and the
offer total, then checks exact SKU/quantity/unit coverage, stock, delivery window, expiry, seller
floor, payment consistency, and mandate/buyer-risk limits. The result contains machine-readable
`issues`, `checked_rules`, `recomputed_total`, and per-line `line_computations`.

## Ranking

```python
result = rank_offers(request: RankingRequest)
```

`RankingRequest` supplies the RFQ, budget/payment mandate, reference prices, candidates, weights,
and `now`. A `RankingCandidate` pairs an offer with trusted policy, stock, buyer risk, and
`ReliabilityEvidence`.

Ranking guarantees:

- invalid or security-blocked offers are rejected before scoring
- only one offer per seller principal is selected; additional agents are rejected as
  `duplicate_principal`
- factors are `price`, `reliability`, `delivery`, `credit`, `availability`, each with weight,
  normalized value, contribution, evidence count, source event IDs, and an explanation
- unrated sellers are reported as `unrated`/`limited_evidence`; ranking never invents a rating
- output ordering is deterministic, including ties

## Security review evidence

```python
note = classify_seller_note(text)  # commercial | irrelevant | suspicious_instruction
discount = detect_fake_discount(offer, reference_prices)
collusion = detect_collusion_signals(observations)
```

Seller notes are untrusted. Suspicious instructions are quarantined with rule/span evidence and
blocked actions. Fake-discount and collusion outputs are review evidence only; they are explicitly
not fraud findings. Collusion signals require distinct seller principals, so multiple agents of one
principal do not create a signal.

## Demo validator

```bash
uv --directory apps/api run --locked python scripts/validate_demo.py
```

The validator uses the read-only 40-SKU Diwali fixture and checks:

- exactly 40 unique SKUs, required categories, supported units, positive benchmarks
- a feasible basket, stock/floor coverage, and three legitimate plus one adversarial seller
- deterministic offers, validation, ranking, security evidence, and monotonic concessions

It prints `Status: PASS` and exits zero on success.

## Error semantics

- Pydantic `ValidationError` for malformed or inconsistent typed input.
- `ValueError` for invalid non-model parameters such as negative windows or out-of-range tolerance.
- `validate_offer` returns issues rather than raising for business rule failures.
- `generate_offer` returns `SellerFailure` for expected seller-side failures.

## Integration rules

- Map persisted trusted data into the typed context; never pass ORM sessions or raw secrets.
- Keep private floors, benchmarks, and source event IDs out of seller-visible strategy input.
- Persist `offer_id`, `negotiation_id`, principal/agent IDs, and evidence source IDs as returned.
- Treat all security signals as review evidence for humans, not automated fraud conclusions.
- Run `ruff`, strict `mypy`, and `pytest tests/domain` before integrating changes.
