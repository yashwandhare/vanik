from datetime import timedelta
from decimal import Decimal
from uuid import UUID

import pytest  # type: ignore[import-not-found, unused-ignore]
from pydantic import ValidationError
from support import (
    NOW,
    OTHER_AGENT_ID,
    OTHER_PRINCIPAL_ID,
    default_lines,
    make_buyer_risk,
    make_line,
    make_offer,
    make_policy,
    make_stock,
    make_validation_context,
)

from app.domain.models import FloorPrice
from app.domain.offers import OfferLine, PaymentTerms
from app.domain.validation import OfferValidationResult, validate_offer


def codes(result: OfferValidationResult) -> set[str]:
    return {issue.code for issue in result.issues}


def test_valid_offer_passes_all_rules() -> None:
    offer = make_offer()
    result = validate_offer(offer, make_validation_context())
    assert result.valid
    assert result.issues == ()
    assert result.recomputed_total == offer.total
    assert all(item.arithmetic_matches for item in result.line_computations)
    assert {
        "offer.exact_sku_coverage",
        "offer.budget_limit",
        "offer.seller_floor",
        "offer.payment_terms",
    } <= set(result.checked_rules)


def test_missing_sku_is_rejected() -> None:
    lines = (make_line("RICE-1", Decimal("10"), "bag", Decimal("90.00")),)
    result = validate_offer(make_offer(lines), make_validation_context())
    assert "offer.missing_sku" in codes(result)


def test_unexpected_sku_is_rejected() -> None:
    lines = default_lines() + (make_line("SUGAR-1", Decimal("1"), "pack", Decimal("40.00")),)
    result = validate_offer(make_offer(lines), make_validation_context())
    assert "offer.unexpected_sku" in codes(result)


def test_duplicate_sku_is_rejected() -> None:
    lines = default_lines() + (make_line("RICE-1", Decimal("10"), "bag", Decimal("90.00")),)
    result = validate_offer(make_offer(lines), make_validation_context())
    assert "offer.duplicate_sku" in codes(result)


def test_quantity_mismatch_is_rejected() -> None:
    lines = (
        make_line("RICE-1", Decimal("9"), "bag", Decimal("90.00")),
        make_line("OIL-1", Decimal("5"), "bottle", Decimal("180.00")),
    )
    result = validate_offer(make_offer(lines), make_validation_context())
    assert "offer.quantity_mismatch" in codes(result)


def test_unit_mismatch_is_rejected() -> None:
    lines = (
        make_line("RICE-1", Decimal("10"), "kg", Decimal("90.00")),
        make_line("OIL-1", Decimal("5"), "bottle", Decimal("180.00")),
    )
    result = validate_offer(make_offer(lines), make_validation_context())
    assert "offer.unit_mismatch" in codes(result)


def test_line_arithmetic_mismatch_is_rejected() -> None:
    lines = default_lines()
    bad_line = lines[0].model_copy(update={"line_total": Decimal("1.00")})
    offer = make_offer((bad_line, lines[1]))
    result = validate_offer(offer, make_validation_context())
    assert "offer.line_arithmetic_mismatch" in codes(result)


def test_negative_line_total_is_rejected() -> None:
    lines = default_lines()
    bad_line = lines[0].model_copy(
        update={"discount": Decimal("1000.00"), "line_total": Decimal("0.00")}
    )
    offer = make_offer((bad_line, lines[1]))
    result = validate_offer(offer, make_validation_context())
    assert "offer.line_total_negative" in codes(result)


def test_total_arithmetic_mismatch_is_rejected() -> None:
    result = validate_offer(make_offer(total=Decimal("1.00")), make_validation_context())
    assert "offer.total_arithmetic_mismatch" in codes(result)


def test_budget_exceeded_is_rejected() -> None:
    result = validate_offer(make_offer(), make_validation_context(budget_inr=Decimal("100.00")))
    assert "offer.budget_exceeded" in codes(result)


def test_missing_stock_is_rejected() -> None:
    stock = (make_stock()[0],)
    result = validate_offer(make_offer(), make_validation_context(stock=stock))
    assert "offer.stock_missing" in codes(result)


def test_insufficient_stock_is_rejected() -> None:
    stock = make_stock(rice=Decimal("1.000"))
    result = validate_offer(make_offer(), make_validation_context(stock=stock))
    assert "offer.insufficient_stock" in codes(result)


def test_stock_unit_mismatch_is_rejected() -> None:
    stock = (
        make_stock()[0].model_copy(update={"unit": "kg"}),
        make_stock()[1],
    )
    result = validate_offer(make_offer(), make_validation_context(stock=stock))
    assert "offer.stock_unit_mismatch" in codes(result)


def test_delivery_before_lead_time_is_rejected() -> None:
    offer = make_offer(delivery_date=NOW.date() + timedelta(days=1))
    result = validate_offer(offer, make_validation_context())
    assert "offer.delivery_before_lead_time" in codes(result)


def test_delivery_after_deadline_is_rejected() -> None:
    offer = make_offer(delivery_date=NOW.date() + timedelta(days=10))
    result = validate_offer(offer, make_validation_context())
    assert "offer.delivery_after_deadline" in codes(result)


def test_expired_offer_is_rejected() -> None:
    offer = make_offer(expires_at=NOW - timedelta(hours=1))
    result = validate_offer(offer, make_validation_context())
    assert "offer.expired" in codes(result)


def test_expiry_after_rfq_is_rejected() -> None:
    offer = make_offer(expires_at=NOW + timedelta(days=2))
    result = validate_offer(offer, make_validation_context())
    assert "offer.expiry_after_rfq" in codes(result)


def test_below_seller_floor_is_rejected() -> None:
    policy = make_policy(
        floor_prices=(
            FloorPrice(sku="RICE-1", unit="bag", min_unit_price=Decimal("95.00")),
            FloorPrice(sku="OIL-1", unit="bottle", min_unit_price=Decimal("140.00")),
        )
    )
    result = validate_offer(make_offer(), make_validation_context(policy=policy))
    assert "offer.below_seller_floor" in codes(result)


def test_missing_floor_is_rejected() -> None:
    policy = make_policy(floor_prices=(make_policy().floor_prices[0],))
    result = validate_offer(make_offer(), make_validation_context(policy=policy))
    assert "offer.floor_missing" in codes(result)


def test_floor_unit_mismatch_is_rejected() -> None:
    floors = (
        make_policy().floor_prices[0].model_copy(update={"unit": "kg"}),
        make_policy().floor_prices[1],
    )
    policy = make_policy(floor_prices=floors)
    result = validate_offer(make_offer(), make_validation_context(policy=policy))
    assert "offer.floor_unit_mismatch" in codes(result)


def test_payment_type_not_allowed_by_seller_is_rejected() -> None:
    policy = make_policy(allowed_payment_types=("advance_upi",), max_credit_days=0)
    result = validate_offer(make_offer(), make_validation_context(policy=policy))
    assert "offer.payment_type_not_allowed_by_seller" in codes(result)


def test_payment_type_not_permitted_by_mandate_is_rejected() -> None:
    context = make_validation_context(allowed_payment_types=("advance_upi",))
    result = validate_offer(make_offer(), context)
    assert "offer.payment_type_not_permitted_by_mandate" in codes(result)


def test_credit_exceeding_seller_policy_is_rejected() -> None:
    policy = make_policy(max_credit_days=7)
    result = validate_offer(make_offer(), make_validation_context(policy=policy))
    assert "offer.credit_exceeds_seller_policy" in codes(result)


def test_credit_exceeding_mandate_is_rejected() -> None:
    result = validate_offer(make_offer(), make_validation_context(max_credit_days=7))
    assert "offer.credit_exceeds_mandate" in codes(result)


def test_credit_exceeding_buyer_risk_is_rejected() -> None:
    risk = make_buyer_risk(max_credit_days=7)
    result = validate_offer(make_offer(), make_validation_context(buyer_risk=risk))
    assert "offer.credit_exceeds_buyer_risk" in codes(result)


def test_upfront_below_seller_policy_is_rejected() -> None:
    policy = make_policy(min_upfront_pct=Decimal("50.00"))
    result = validate_offer(make_offer(), make_validation_context(policy=policy))
    assert "offer.upfront_below_seller_policy" in codes(result)


def test_upfront_below_buyer_risk_is_rejected() -> None:
    risk = make_buyer_risk(required_upfront_pct=Decimal("50.00"))
    result = validate_offer(make_offer(), make_validation_context(buyer_risk=risk))
    assert "offer.upfront_below_buyer_risk" in codes(result)


def test_advance_payment_with_credit_days_is_rejected() -> None:
    payment = PaymentTerms(
        type="advance_upi",
        credit_days=7,
        upfront_pct=Decimal("100.00"),
        balance_due_days=7,
    )
    result = validate_offer(make_offer(payment_terms=payment), make_validation_context())
    assert "payment.advance_credit_mismatch" in codes(result)


def test_advance_payment_requires_full_upfront() -> None:
    payment = PaymentTerms(
        type="advance_upi",
        credit_days=0,
        upfront_pct=Decimal("50.00"),
        balance_due_days=0,
    )
    result = validate_offer(make_offer(payment_terms=payment), make_validation_context())
    assert "payment.advance_upfront_mismatch" in codes(result)


def test_partial_advance_upfront_bounds_are_enforced() -> None:
    payment = PaymentTerms(
        type="partial_advance",
        credit_days=0,
        upfront_pct=Decimal("0.00"),
        balance_due_days=0,
    )
    result = validate_offer(make_offer(payment_terms=payment), make_validation_context())
    assert "payment.partial_upfront_bounds" in codes(result)


def test_credit_payment_with_full_upfront_is_rejected() -> None:
    payment = PaymentTerms(
        type="credit_net_15",
        credit_days=15,
        upfront_pct=Decimal("100.00"),
        balance_due_days=15,
    )
    result = validate_offer(make_offer(payment_terms=payment), make_validation_context())
    assert "payment.credit_with_full_upfront" in codes(result)


def test_credit_balance_due_mismatch_is_rejected() -> None:
    payment = PaymentTerms(
        type="credit_net_15",
        credit_days=15,
        upfront_pct=Decimal("20.00"),
        balance_due_days=7,
    )
    result = validate_offer(make_offer(payment_terms=payment), make_validation_context())
    assert "payment.balance_due_mismatch" in codes(result)


def test_credit_days_mismatch_is_rejected() -> None:
    payment = PaymentTerms(
        type="credit_net_15",
        credit_days=7,
        upfront_pct=Decimal("20.00"),
        balance_due_days=7,
    )
    result = validate_offer(make_offer(payment_terms=payment), make_validation_context())
    assert "payment.credit_days_mismatch" in codes(result)


def test_negotiation_mismatch_is_rejected() -> None:
    offer = make_offer(negotiation_id=UUID("60000000-0000-4000-8000-000000000099"))
    result = validate_offer(offer, make_validation_context())
    assert "offer.negotiation_mismatch" in codes(result)


def test_seller_principal_mismatch_is_rejected() -> None:
    offer = make_offer(seller_principal_id=OTHER_PRINCIPAL_ID)
    result = validate_offer(offer, make_validation_context())
    assert "offer.seller_principal_mismatch" in codes(result)


def test_seller_agent_mismatch_is_rejected() -> None:
    offer = make_offer(seller_agent_id=OTHER_AGENT_ID)
    result = validate_offer(offer, make_validation_context())
    assert "offer.seller_agent_mismatch" in codes(result)


def test_validation_result_exposes_recomputed_line_totals() -> None:
    offer = make_offer()
    result = validate_offer(offer, make_validation_context())
    assert len(result.line_computations) == len(offer.lines)
    for computation, line in zip(result.line_computations, offer.lines, strict=True):
        assert computation.sku == line.sku
        assert computation.recomputed_line_total == line.line_total
        assert computation.net_unit_price > 0


def test_offer_line_model_rejects_negative_totals() -> None:
    with pytest.raises(ValidationError):
        OfferLine(
            sku="RICE-1",
            quantity=Decimal("1"),
            unit="bag",
            unit_price=Decimal("10.00"),
            discount=Decimal("20.00"),
            line_total=Decimal("-10.00"),
        )


def test_offer_draft_is_frozen() -> None:
    offer = make_offer()
    with pytest.raises(ValidationError):
        offer.total = Decimal("1.00")  # type: ignore[misc]
