from datetime import timedelta
from decimal import Decimal
from uuid import UUID

import pytest  # type: ignore[import-not-found, unused-ignore]
from pydantic import ValidationError
from support import (
    NOW,
    OTHER_AGENT_ID,
    OTHER_PRINCIPAL_ID,
    SELLER_AGENT_ID,
    SELLER_PRINCIPAL_ID,
    THIRD_AGENT_ID,
    THIRD_PRINCIPAL_ID,
    make_candidate,
    make_floors,
    make_line,
    make_offer,
    make_policy,
    make_ranking_request,
    make_reliability,
)

from app.domain.common import ratio
from app.domain.offers import OfferDraft, PaymentTerms
from app.domain.ranking import (
    RankingWeights,
    ReliabilityEvidence,
    rank_offers,
)


def lower_offer(*, delivery_days: int = 2, payment: PaymentTerms | None = None) -> OfferDraft:
    return make_offer(
        (
            make_line("RICE-1", Decimal("10"), "bag", Decimal("50.00")),
            make_line("OIL-1", Decimal("5"), "bottle", Decimal("100.00")),
        ),
        delivery_date=NOW.date() + timedelta(days=delivery_days),
        payment_terms=payment,
    )


def higher_offer(*, delivery_days: int = 2, payment: PaymentTerms | None = None) -> OfferDraft:
    return make_offer(
        (
            make_line("RICE-1", Decimal("10"), "bag", Decimal("60.00")),
            make_line("OIL-1", Decimal("5"), "bottle", Decimal("120.00")),
        ),
        delivery_date=NOW.date() + timedelta(days=delivery_days),
        payment_terms=payment,
    )


def credit(days: int) -> PaymentTerms:
    return PaymentTerms(
        type=f"credit_net_{days}",  # type: ignore[arg-type]
        credit_days=days,
        upfront_pct=Decimal("20.00"),
        balance_due_days=days,
    )


def advance() -> PaymentTerms:
    return PaymentTerms(
        type="advance_upi",
        credit_days=0,
        upfront_pct=Decimal("100.00"),
        balance_due_days=0,
    )


def test_hard_failures_are_rejected_before_scoring() -> None:
    floors = make_floors(rice=Decimal("40.00"), oil=Decimal("80.00"))
    policy = make_policy(floor_prices=floors)
    valid = make_candidate(lower_offer(), policy=policy)
    invalid = make_candidate(higher_offer(), policy=policy)
    result = rank_offers(make_ranking_request((valid, invalid), budget_inr=Decimal("1100.00")))
    assert len(result.ranked) == 1
    assert len(result.rejected) == 1
    assert result.rejected[0].reasons == ("validation_failed",)
    assert any(issue.code == "offer.budget_exceeded" for issue in result.rejected[0].issues)


def test_weights_and_factor_contributions_are_explained() -> None:
    floors = make_floors(rice=Decimal("40.00"), oil=Decimal("80.00"))
    policy = make_policy(floor_prices=floors)
    first = make_candidate(
        lower_offer(delivery_days=2, payment=credit(15)),
        policy=policy,
        reliability=make_reliability("0.90", 2),
    )
    second = make_candidate(
        make_offer(
            (
                make_line("RICE-1", Decimal("10"), "bag", Decimal("60.00")),
                make_line("OIL-1", Decimal("5"), "bottle", Decimal("120.00")),
            ),
            seller_principal_id=OTHER_PRINCIPAL_ID,
            seller_agent_id=OTHER_AGENT_ID,
            delivery_date=NOW.date() + timedelta(days=3),
            payment_terms=credit(7),
        ),
        policy=make_policy(
            floor_prices=floors,
            seller_principal_id=OTHER_PRINCIPAL_ID,
            seller_agent_id=OTHER_AGENT_ID,
        ),
        reliability=make_reliability("0.80", 2),
    )
    third = make_candidate(
        make_offer(
            (
                make_line("RICE-1", Decimal("10"), "bag", Decimal("70.00")),
                make_line("OIL-1", Decimal("5"), "bottle", Decimal("140.00")),
            ),
            seller_principal_id=THIRD_PRINCIPAL_ID,
            seller_agent_id=THIRD_AGENT_ID,
            delivery_date=NOW.date() + timedelta(days=4),
            payment_terms=advance(),
        ),
        policy=make_policy(
            floor_prices=floors,
            seller_principal_id=THIRD_PRINCIPAL_ID,
            seller_agent_id=THIRD_AGENT_ID,
        ),
        reliability=make_reliability("0.70", 2),
    )
    request = make_ranking_request((first, second, third))
    result = rank_offers(request)
    assert [item.seller_principal_id for item in result.ranked] == [
        first.offer.seller_principal_id,
        second.offer.seller_principal_id,
        third.offer.seller_principal_id,
    ]
    top = result.ranked[0]
    assert [factor.factor for factor in top.factors] == [
        "price",
        "reliability",
        "delivery",
        "credit",
        "availability",
    ]
    assert all(factor.weight == getattr(request.weights, factor.factor) for factor in top.factors)
    for factor in top.factors:
        assert factor.normalized is not None
        assert Decimal(0) <= factor.normalized <= Decimal(1)
        assert factor.contribution == ratio(factor.weight * factor.normalized)
    assert top.factors[0].normalized == Decimal("1.000000")
    assert top.factors[0].evidence_count == 2
    assert len(top.factors[0].source_event_ids) == 2
    assert top.factors[1].evidence_count == 2
    assert len(top.factors[1].source_event_ids) == 2
    assert top.factors[2].evidence_count == 1
    assert top.factors[3].evidence_count == 1
    assert top.factors[4].evidence_count == 1
    contribution_sum = sum((factor.contribution for factor in top.factors), Decimal(0))
    assert top.score == ratio(contribution_sum / top.effective_weight_sum)


def test_unrated_seller_is_limited_without_invented_rating() -> None:
    candidate = make_candidate(reliability=make_reliability(None, 0))
    result = rank_offers(make_ranking_request((candidate,)))
    ranked = result.ranked[0]
    assert ranked.rating_status == "unrated"
    assert ranked.limited_evidence is True
    reliability = next(factor for factor in ranked.factors if factor.factor == "reliability")
    assert reliability.normalized is None
    assert reliability.contribution == Decimal(0)
    assert reliability.evidence_count == 0
    assert ranked.effective_weight_sum == Decimal("0.800000")
    assert ranked.score == Decimal("1.000000")


def test_reliability_source_event_ids_are_returned() -> None:
    candidate = make_candidate(reliability=make_reliability("0.90", 3))
    result = rank_offers(make_ranking_request((candidate,)))
    reliability = next(
        factor for factor in result.ranked[0].factors if factor.factor == "reliability"
    )
    assert reliability.evidence_count == 3
    assert len(reliability.source_event_ids) == 3


def test_duplicate_principal_agents_are_grouped_and_ranked_once() -> None:
    lower = make_offer(
        (
            make_line("RICE-1", Decimal("10"), "bag", Decimal("50.00")),
            make_line("OIL-1", Decimal("5"), "bottle", Decimal("100.00")),
        )
    )
    higher = make_offer(
        (
            make_line("RICE-1", Decimal("10"), "bag", Decimal("60.00")),
            make_line("OIL-1", Decimal("5"), "bottle", Decimal("120.00")),
        ),
        seller_agent_id=OTHER_AGENT_ID,
    )
    policy_lower = make_policy(
        floor_prices=make_floors(rice=Decimal("40.00"), oil=Decimal("80.00")),
        seller_principal_id=SELLER_PRINCIPAL_ID,
        seller_agent_id=SELLER_AGENT_ID,
    )
    policy_higher = make_policy(
        floor_prices=make_floors(rice=Decimal("40.00"), oil=Decimal("80.00")),
        seller_principal_id=SELLER_PRINCIPAL_ID,
        seller_agent_id=OTHER_AGENT_ID,
    )
    result = rank_offers(
        make_ranking_request(
            (
                make_candidate(lower, policy=policy_lower),
                make_candidate(higher, policy=policy_higher),
            )
        )
    )
    assert len(result.ranked) == 1
    assert result.ranked[0].offer_id == lower.offer_id
    assert result.rejected[0].reasons == ("duplicate_principal",)


def test_security_blocked_candidate_is_rejected() -> None:
    candidate = make_candidate(security_blocked=True)
    result = rank_offers(make_ranking_request((candidate,)))
    assert result.ranked == ()
    assert result.rejected[0].reasons == ("security_action_blocked",)


def test_ranking_is_deterministic_for_equal_scores() -> None:
    first = make_candidate(
        lower_offer(),
        policy=make_policy(floor_prices=make_floors(rice=Decimal("40.00"), oil=Decimal("80.00"))),
    )
    second_offer = make_offer(
        (
            make_line("RICE-1", Decimal("10"), "bag", Decimal("50.00")),
            make_line("OIL-1", Decimal("5"), "bottle", Decimal("100.00")),
        ),
        seller_principal_id=OTHER_PRINCIPAL_ID,
        seller_agent_id=OTHER_AGENT_ID,
    )
    second = make_candidate(
        second_offer,
        policy=make_policy(
            floor_prices=make_floors(rice=Decimal("40.00"), oil=Decimal("80.00")),
            seller_principal_id=OTHER_PRINCIPAL_ID,
            seller_agent_id=OTHER_AGENT_ID,
        ),
    )
    request = make_ranking_request((first, second))
    first_result = rank_offers(request)
    second_result = rank_offers(request)
    assert first_result == second_result
    assert [item.seller_principal_id for item in first_result.ranked] == [
        SELLER_PRINCIPAL_ID,
        OTHER_PRINCIPAL_ID,
    ]


def test_price_weight_prefers_lower_total() -> None:
    floors = make_floors(rice=Decimal("40.00"), oil=Decimal("80.00"))
    policy = make_policy(floor_prices=floors)
    weights = RankingWeights(
        price=Decimal("1.00"),
        reliability=Decimal("0.00"),
        delivery=Decimal("0.00"),
        credit=Decimal("0.00"),
        availability=Decimal("0.00"),
    )
    lower = make_candidate(lower_offer(), policy=policy, reliability=make_reliability(None, 0))
    higher = make_candidate(higher_offer(), policy=policy, reliability=make_reliability(None, 0))
    result = rank_offers(make_ranking_request((higher, lower), weights=weights))
    assert result.ranked[0].offer_id == lower.offer.offer_id


def test_delivery_and_credit_weights_rank_best_terms_first() -> None:
    floors = make_floors(rice=Decimal("40.00"), oil=Decimal("80.00"))
    policy = make_policy(floor_prices=floors)
    weights = RankingWeights(
        price=Decimal("0.00"),
        reliability=Decimal("0.00"),
        delivery=Decimal("0.50"),
        credit=Decimal("0.50"),
        availability=Decimal("0.00"),
    )
    best = make_candidate(
        lower_offer(delivery_days=2, payment=credit(15)),
        policy=policy,
        reliability=make_reliability(None, 0),
    )
    worst = make_candidate(
        make_offer(
            (
                make_line("RICE-1", Decimal("10"), "bag", Decimal("50.00")),
                make_line("OIL-1", Decimal("5"), "bottle", Decimal("100.00")),
            ),
            seller_principal_id=OTHER_PRINCIPAL_ID,
            seller_agent_id=OTHER_AGENT_ID,
            delivery_date=NOW.date() + timedelta(days=4),
            payment_terms=credit(7),
        ),
        policy=make_policy(
            floor_prices=floors,
            seller_principal_id=OTHER_PRINCIPAL_ID,
            seller_agent_id=OTHER_AGENT_ID,
        ),
        reliability=make_reliability(None, 0),
    )
    result = rank_offers(make_ranking_request((worst, best), weights=weights))
    assert result.ranked[0].offer_id == best.offer.offer_id


def test_weights_must_sum_to_one() -> None:
    with pytest.raises(ValidationError, match="sum exactly to one"):
        RankingWeights(
            price=Decimal("0.50"),
            reliability=Decimal("0.50"),
            delivery=Decimal("0.50"),
            credit=Decimal("0.00"),
            availability=Decimal("0.00"),
        )


def test_reliability_requires_evidence() -> None:
    with pytest.raises(ValidationError, match="verified outcome evidence"):
        ReliabilityEvidence(score=Decimal("0.90"), evidence_count=0)
    with pytest.raises(ValidationError, match="Unrated sellers"):
        ReliabilityEvidence(
            score=None,
            evidence_count=1,
            source_event_ids=(UUID("90000000-0000-4000-8000-000000000001"),),
        )
    with pytest.raises(ValidationError, match="must match source event IDs"):
        ReliabilityEvidence(
            score=Decimal("0.90"),
            evidence_count=2,
            source_event_ids=(UUID("90000000-0000-4000-8000-000000000001"),),
        )


def test_empty_candidates_return_empty_ranking() -> None:
    result = rank_offers(make_ranking_request(()))
    assert result.ranked == ()
    assert result.rejected == ()
