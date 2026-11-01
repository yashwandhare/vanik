from datetime import timedelta
from decimal import Decimal
from uuid import UUID

from pydantic import AwareDatetime, Field, field_validator

from app.domain.common import DomainModel, money, ratio
from app.domain.models import (
    BuyerRiskCredential,
    Rfq,
    SellerPolicy,
    StockLine,
)
from app.domain.offers import OfferDraft, OfferLine, PaymentTerms
from app.domain.types import CREDIT_PAYMENT_DAYS, PaymentType

ValidationCode = str


class OfferValidationContext(DomainModel):
    rfq: Rfq
    budget_inr: Decimal = Field(gt=0, max_digits=18, decimal_places=2)
    max_credit_days: int = Field(ge=0, le=90)
    allowed_payment_types: tuple[PaymentType, ...] = Field(min_length=1, max_length=5)
    stock: tuple[StockLine, ...] = Field(min_length=1, max_length=100)
    policy: SellerPolicy
    buyer_risk: BuyerRiskCredential
    now: AwareDatetime

    @field_validator("allowed_payment_types")
    @classmethod
    def unique_payment_types(cls, values: tuple[PaymentType, ...]) -> tuple[PaymentType, ...]:
        if len(set(values)) != len(values):
            raise ValueError("Allowed payment types must be distinct")
        return values

    @field_validator("stock")
    @classmethod
    def unique_stock_skus(cls, values: tuple[StockLine, ...]) -> tuple[StockLine, ...]:
        if len({value.sku for value in values}) != len(values):
            raise ValueError("Stock SKUs must be distinct")
        return values


class ValidationIssue(DomainModel):
    code: ValidationCode
    message: str = Field(min_length=1, max_length=500)
    sku: str | None = None
    field: str | None = None


class LineComputation(DomainModel):
    sku: str
    declared_line_total: Decimal
    recomputed_line_total: Decimal
    net_unit_price: Decimal
    arithmetic_matches: bool


class OfferValidationResult(DomainModel):
    offer_id: UUID
    seller_principal_id: UUID
    valid: bool
    issues: tuple[ValidationIssue, ...]
    checked_rules: tuple[ValidationCode, ...]
    recomputed_total: Decimal = Field(ge=0, max_digits=18, decimal_places=2)
    line_computations: tuple[LineComputation, ...]


def _issue(
    issues: list[ValidationIssue],
    code: str,
    message: str,
    *,
    sku: str | None = None,
    field: str | None = None,
) -> None:
    issues.append(ValidationIssue(code=code, message=message, sku=sku, field=field))


def _payment_consistency_issues(payment: PaymentTerms) -> list[tuple[str, str]]:
    issues: list[tuple[str, str]] = []
    if payment.type in CREDIT_PAYMENT_DAYS:
        expected_days = CREDIT_PAYMENT_DAYS[payment.type]
        if payment.credit_days != expected_days:
            issues.append(
                (
                    "payment.credit_days_mismatch",
                    f"{payment.type} requires {expected_days} credit days",
                )
            )
        if payment.balance_due_days != payment.credit_days:
            issues.append(
                (
                    "payment.balance_due_mismatch",
                    "Balance due days must equal credit days for credit terms",
                )
            )
        if payment.upfront_pct >= Decimal(100):
            issues.append(
                (
                    "payment.credit_with_full_upfront",
                    "Credit terms cannot require 100 percent upfront payment",
                )
            )
    elif payment.type == "advance_upi":
        if payment.credit_days != 0 or payment.balance_due_days != 0:
            issues.append(
                (
                    "payment.advance_credit_mismatch",
                    "Advance payment cannot include credit days",
                )
            )
        if payment.upfront_pct != Decimal(100):
            issues.append(
                (
                    "payment.advance_upfront_mismatch",
                    "Advance payment requires 100 percent upfront",
                )
            )
    else:
        if payment.credit_days != 0 or payment.balance_due_days != 0:
            issues.append(
                (
                    "payment.partial_credit_mismatch",
                    "Partial advance cannot include credit days",
                )
            )
        if not Decimal(0) < payment.upfront_pct < Decimal(100):
            issues.append(
                (
                    "payment.partial_upfront_bounds",
                    "Partial advance requires upfront between 0 and 100 percent",
                )
            )
    return issues


def _line_expected_total(line: OfferLine) -> Decimal:
    return money(line.quantity * line.unit_price - line.discount)


def validate_offer(offer: OfferDraft, context: OfferValidationContext) -> OfferValidationResult:
    issues: list[ValidationIssue] = []
    checked_rules: list[str] = []

    checked_rules.append("offer.negotiation_match")
    if offer.negotiation_id != context.rfq.negotiation_id:
        _issue(
            issues,
            "offer.negotiation_mismatch",
            "Offer negotiation ID does not match the RFQ",
            field="negotiation_id",
        )

    checked_rules.append("offer.seller_match")
    if offer.seller_principal_id != context.policy.seller_principal_id:
        _issue(
            issues,
            "offer.seller_principal_mismatch",
            "Offer seller principal does not match the trusted seller policy",
            field="seller_principal_id",
        )
    if offer.seller_agent_id != context.policy.seller_agent_id:
        _issue(
            issues,
            "offer.seller_agent_mismatch",
            "Offer seller agent does not match the trusted seller policy",
            field="seller_agent_id",
        )

    checked_rules.append("offer.currency_match")
    if offer.currency != context.rfq.currency:
        _issue(issues, "offer.currency_mismatch", "Offer currency does not match the RFQ")

    checked_rules.append("offer.exact_sku_coverage")
    offer_by_sku: dict[str, list[OfferLine]] = {}
    for line in offer.lines:
        offer_by_sku.setdefault(line.sku, []).append(line)
    rfq_skus = {line.sku for line in context.rfq.lines}
    for sku, lines in offer_by_sku.items():
        if len(lines) > 1:
            _issue(
                issues,
                "offer.duplicate_sku",
                "Offer contains the same SKU more than once",
                sku=sku,
            )
        if sku not in rfq_skus:
            _issue(
                issues,
                "offer.unexpected_sku",
                "Offer contains a SKU that the RFQ did not request",
                sku=sku,
            )

    checked_rules.extend(["offer.quantity_match", "offer.unit_match"])
    for rfq_line in context.rfq.lines:
        lines = offer_by_sku.get(rfq_line.sku, [])
        if not lines:
            _issue(
                issues,
                "offer.missing_sku",
                "Offer is missing a requested SKU",
                sku=rfq_line.sku,
            )
            continue
        line = lines[0]
        if line.quantity != rfq_line.quantity:
            _issue(
                issues,
                "offer.quantity_mismatch",
                "Offer quantity does not exactly match the requested quantity",
                sku=rfq_line.sku,
                field="quantity",
            )
        if line.unit != rfq_line.unit:
            _issue(
                issues,
                "offer.unit_mismatch",
                "Offer unit does not match the requested unit",
                sku=rfq_line.sku,
                field="unit",
            )

    checked_rules.extend(["offer.line_arithmetic", "offer.total_arithmetic", "offer.budget_limit"])
    line_computations: list[LineComputation] = []
    recomputed_total = Decimal(0)
    for line in offer.lines:
        expected_total = _line_expected_total(line)
        if expected_total < 0:
            _issue(
                issues,
                "offer.line_total_negative",
                "Discount exceeds the line gross value",
                sku=line.sku,
            )
        net_unit_price = ratio(expected_total / line.quantity)
        matches = expected_total == line.line_total
        if not matches:
            _issue(
                issues,
                "offer.line_arithmetic_mismatch",
                "Declared line total does not match quantity, unit price and discount",
                sku=line.sku,
                field="line_total",
            )
        line_computations.append(
            LineComputation(
                sku=line.sku,
                declared_line_total=line.line_total,
                recomputed_line_total=expected_total,
                net_unit_price=net_unit_price,
                arithmetic_matches=matches,
            )
        )
        recomputed_total += expected_total
    recomputed_total = money(recomputed_total)
    if recomputed_total != offer.total:
        _issue(
            issues,
            "offer.total_arithmetic_mismatch",
            "Declared offer total does not match the sum of line totals",
            field="total",
        )
    if recomputed_total > context.budget_inr:
        _issue(
            issues,
            "offer.budget_exceeded",
            "Recomputed offer total exceeds the buyer mandate budget",
            field="total",
        )

    checked_rules.extend(["offer.stock_available", "offer.delivery_window", "offer.expiry"])
    stock_by_sku = {item.sku: item for item in context.stock}
    for line in offer.lines:
        stock_line = stock_by_sku.get(line.sku)
        if stock_line is None:
            _issue(
                issues,
                "offer.stock_missing",
                "No trusted stock record exists for the offered SKU",
                sku=line.sku,
            )
            continue
        if stock_line.unit != line.unit:
            _issue(
                issues,
                "offer.stock_unit_mismatch",
                "Stock unit does not match the offered unit",
                sku=line.sku,
                field="unit",
            )
        if stock_line.available_qty < line.quantity:
            _issue(
                issues,
                "offer.insufficient_stock",
                "Offered quantity exceeds available stock",
                sku=line.sku,
                field="quantity",
            )

    earliest_delivery = context.now.date() + timedelta(days=context.policy.delivery_days)
    if offer.delivery_date < earliest_delivery:
        _issue(
            issues,
            "offer.delivery_before_lead_time",
            "Delivery date is earlier than the seller lead time allows",
            field="delivery_date",
        )
    if offer.delivery_date > context.rfq.delivery_deadline.date():
        _issue(
            issues,
            "offer.delivery_after_deadline",
            "Delivery date is after the buyer delivery deadline",
            field="delivery_date",
        )
    if offer.expires_at <= context.now:
        _issue(issues, "offer.expired", "Offer has already expired", field="expires_at")
    if offer.expires_at > context.rfq.expires_at:
        _issue(
            issues,
            "offer.expiry_after_rfq",
            "Offer expiry is later than the RFQ expiry",
            field="expires_at",
        )

    checked_rules.extend(["offer.seller_floor", "offer.payment_terms"])
    floor_by_sku = {item.sku: item for item in context.policy.floor_prices}
    for line in offer.lines:
        floor = floor_by_sku.get(line.sku)
        if floor is None:
            _issue(
                issues,
                "offer.floor_missing",
                "No private seller floor exists for the offered SKU",
                sku=line.sku,
            )
            continue
        if floor.unit != line.unit:
            _issue(
                issues,
                "offer.floor_unit_mismatch",
                "Seller floor unit does not match the offered unit",
                sku=line.sku,
                field="unit",
            )
        net_line_total = _line_expected_total(line)
        floor_total = money(floor.min_unit_price * line.quantity)
        if net_line_total < floor_total:
            _issue(
                issues,
                "offer.below_seller_floor",
                "Offered net price is below the private seller floor",
                sku=line.sku,
                field="unit_price",
            )

    payment = offer.payment_terms
    for code, message in _payment_consistency_issues(payment):
        _issue(issues, code, message, field="payment_terms")
    if payment.type not in context.policy.allowed_payment_types:
        _issue(
            issues,
            "offer.payment_type_not_allowed_by_seller",
            "Seller policy does not allow the offered payment type",
            field="payment_terms.type",
        )
    if payment.type not in context.allowed_payment_types:
        _issue(
            issues,
            "offer.payment_type_not_permitted_by_mandate",
            "Buyer mandate does not permit the offered payment type",
            field="payment_terms.type",
        )
    if payment.credit_days > context.policy.max_credit_days:
        _issue(
            issues,
            "offer.credit_exceeds_seller_policy",
            "Credit days exceed the seller policy limit",
            field="payment_terms.credit_days",
        )
    if payment.credit_days > context.max_credit_days:
        _issue(
            issues,
            "offer.credit_exceeds_mandate",
            "Credit days exceed the buyer mandate limit",
            field="payment_terms.credit_days",
        )
    if payment.credit_days > context.buyer_risk.max_credit_days:
        _issue(
            issues,
            "offer.credit_exceeds_buyer_risk",
            "Credit days exceed the synthetic buyer risk credential limit",
            field="payment_terms.credit_days",
        )
    if payment.upfront_pct < context.policy.min_upfront_pct:
        _issue(
            issues,
            "offer.upfront_below_seller_policy",
            "Upfront percentage is below the seller policy minimum",
            field="payment_terms.upfront_pct",
        )
    if payment.upfront_pct < context.buyer_risk.required_upfront_pct:
        _issue(
            issues,
            "offer.upfront_below_buyer_risk",
            "Upfront percentage is below the synthetic buyer risk requirement",
            field="payment_terms.upfront_pct",
        )

    return OfferValidationResult(
        offer_id=offer.offer_id,
        seller_principal_id=offer.seller_principal_id,
        valid=not issues,
        issues=tuple(issues),
        checked_rules=tuple(dict.fromkeys(checked_rules)),
        recomputed_total=max(recomputed_total, Decimal(0)),
        line_computations=tuple(line_computations),
    )
