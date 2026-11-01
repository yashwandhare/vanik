from datetime import timedelta
from decimal import Decimal
from uuid import NAMESPACE_URL, uuid5

from app.domain.common import clamp, money, ratio
from app.domain.models import (
    AdversarialConfig,
    ClearanceConfig,
    MarginConfig,
    PaymentRiskConfig,
    RfqLine,
    SellerFailure,
    SellerStrategyContext,
)
from app.domain.offers import OfferDraft, OfferLine, PaymentTerms
from app.domain.types import CREDIT_PAYMENT_DAYS, FailureKind, PaymentType

OFFER_NAMESPACE = uuid5(NAMESPACE_URL, "https://vanik.invalid/domain/offers")
ADVERSARIAL_NET_DISCOUNT = Decimal("0.02")


def _failure(
    context: SellerStrategyContext,
    kind: FailureKind,
    detail: str,
) -> SellerFailure:
    return SellerFailure(
        kind=kind,
        negotiation_id=context.rfq.negotiation_id,
        seller_agent_id=context.policy.seller_agent_id,
        seller_principal_id=context.policy.seller_principal_id,
        round_index=context.round_index,
        detail=detail,
    )


def _simulated_failure(context: SellerStrategyContext) -> SellerFailure | None:
    simulation = context.failure_simulation
    if simulation is None:
        return None
    if simulation.round_index is not None and simulation.round_index != context.round_index:
        return None
    return _failure(context, simulation.kind, simulation.detail)


def _preflight(context: SellerStrategyContext) -> SellerFailure | None:
    simulated = _simulated_failure(context)
    if simulated is not None:
        return simulated
    if context.round_index > context.max_rounds:
        return _failure(context, "declined", "Round limit exhausted")
    if context.now >= context.rfq.expires_at:
        return _failure(context, "error", "RFQ has expired")

    reference_prices = {item.sku: item for item in context.reference_prices}
    stock = {item.sku: item for item in context.stock}
    floors = {item.sku: item for item in context.policy.floor_prices}
    for line in context.rfq.lines:
        reference = reference_prices.get(line.sku)
        if reference is None:
            return _failure(context, "declined", f"Missing trusted reference price for {line.sku}")
        if reference.unit != line.unit:
            return _failure(context, "declined", f"Reference unit mismatch for {line.sku}")
        stock_line = stock.get(line.sku)
        if stock_line is None:
            return _failure(context, "declined", f"Missing stock record for {line.sku}")
        if stock_line.unit != line.unit:
            return _failure(context, "declined", f"Stock unit mismatch for {line.sku}")
        if stock_line.available_qty < line.quantity:
            return _failure(context, "declined", f"Insufficient stock for {line.sku}")
        floor = floors.get(line.sku)
        if floor is None:
            return _failure(context, "declined", f"Missing private floor for {line.sku}")
        if floor.unit != line.unit:
            return _failure(context, "declined", f"Floor unit mismatch for {line.sku}")

    earliest_delivery = context.now.date() + timedelta(days=context.policy.delivery_days)
    if earliest_delivery > context.rfq.delivery_deadline.date():
        return _failure(context, "declined", "Cannot meet the requested delivery deadline")
    return None


def _concession(context: SellerStrategyContext, maximum: Decimal) -> Decimal:
    if context.round_index <= 1 or context.max_rounds <= 1:
        return Decimal(0)
    span = Decimal(context.max_rounds - 1)
    step = Decimal(context.round_index - 1) / span
    return clamp(ratio(maximum * step), Decimal(0), maximum)


def _pick_credit_type(allowed: tuple[PaymentType, ...], max_days: int) -> PaymentType | None:
    eligible = [
        payment_type
        for payment_type in allowed
        if payment_type in CREDIT_PAYMENT_DAYS and CREDIT_PAYMENT_DAYS[payment_type] <= max_days
    ]
    if not eligible:
        return None
    return max(eligible, key=lambda item: (CREDIT_PAYMENT_DAYS[item], item))


def _advance_terms(upfront_pct: Decimal) -> PaymentTerms:
    return PaymentTerms(
        type="advance_upi",
        credit_days=0,
        upfront_pct=clamp(upfront_pct, Decimal(0), Decimal(100)),
        balance_due_days=0,
    )


def _partial_terms(upfront_pct: Decimal) -> PaymentTerms:
    return PaymentTerms(
        type="partial_advance",
        credit_days=0,
        upfront_pct=clamp(upfront_pct, Decimal(1), Decimal(99)),
        balance_due_days=0,
    )


def _partial_if_feasible(
    required_upfront: Decimal, *, minimum: Decimal = Decimal(25)
) -> PaymentTerms | None:
    upfront = max(required_upfront, minimum)
    if upfront >= Decimal(100):
        return None
    return _partial_terms(upfront)


def _credit_terms(payment_type: PaymentType, upfront_pct: Decimal) -> PaymentTerms:
    credit_days = CREDIT_PAYMENT_DAYS[payment_type]
    return PaymentTerms(
        type=payment_type,
        credit_days=credit_days,
        upfront_pct=clamp(upfront_pct, Decimal(0), Decimal(99)),
        balance_due_days=credit_days,
    )


def _select_payment_terms(
    context: SellerStrategyContext, *, risk_sensitive: bool
) -> PaymentTerms | None:
    policy = context.policy
    allowed = policy.allowed_payment_types
    risk = context.buyer_risk
    required_upfront = max(policy.min_upfront_pct, risk.required_upfront_pct)
    max_credit = min(policy.max_credit_days, risk.max_credit_days)

    if risk_sensitive and risk.risk_tier == "high":
        if "advance_upi" in allowed:
            return _advance_terms(Decimal(100))
        if "partial_advance" in allowed:
            return _partial_if_feasible(required_upfront, minimum=Decimal(75))
        return None

    credit_type = _pick_credit_type(allowed, max_credit)
    if credit_type is not None and required_upfront < Decimal(100):
        return _credit_terms(credit_type, required_upfront)

    if risk_sensitive and risk.risk_tier == "medium" and "partial_advance" in allowed:
        return _partial_if_feasible(required_upfront)

    if "advance_upi" in allowed:
        return _advance_terms(Decimal(100))
    if "partial_advance" in allowed:
        return _partial_if_feasible(required_upfront)
    return None


def _normal_line(rfq_line: RfqLine, price: Decimal, floor: Decimal) -> OfferLine:
    effective_price = money(max(price, floor))
    return OfferLine(
        sku=rfq_line.sku,
        quantity=rfq_line.quantity,
        unit=rfq_line.unit,
        unit_price=effective_price,
        discount=Decimal("0.00"),
        line_total=money(effective_price * rfq_line.quantity),
    )


def _adversarial_line(
    rfq_line: RfqLine, benchmark: Decimal, floor: Decimal, multiplier: Decimal
) -> OfferLine:
    net_unit_price = money(max(benchmark * (Decimal(1) - ADVERSARIAL_NET_DISCOUNT), floor))
    claimed_original = money(max(benchmark * multiplier, net_unit_price))
    gross = money(claimed_original * rfq_line.quantity)
    net_total = money(net_unit_price * rfq_line.quantity)
    discount = money(gross - net_total)
    return OfferLine(
        sku=rfq_line.sku,
        quantity=rfq_line.quantity,
        unit=rfq_line.unit,
        unit_price=claimed_original,
        discount=discount,
        claimed_original_unit_price=claimed_original,
        line_total=money(gross - discount),
    )


def _offer(
    context: SellerStrategyContext,
    lines: tuple[OfferLine, ...],
    payment_terms: PaymentTerms,
    seller_note: str,
) -> OfferDraft:
    expires_at = min(
        context.now + timedelta(minutes=context.policy.offer_validity_minutes),
        context.rfq.expires_at,
    )
    return OfferDraft(
        offer_id=uuid5(
            OFFER_NAMESPACE,
            (
                f"{context.rfq.negotiation_id}:"
                f"{context.policy.seller_agent_id}:{context.round_index}"
            ),
        ),
        negotiation_id=context.rfq.negotiation_id,
        seller_agent_id=context.policy.seller_agent_id,
        seller_principal_id=context.policy.seller_principal_id,
        round_index=context.round_index,
        lines=lines,
        delivery_date=context.now.date() + timedelta(days=context.policy.delivery_days),
        delivery_terms=context.policy.delivery_terms,
        payment_terms=payment_terms,
        expires_at=expires_at,
        seller_note=seller_note,
        total=money(sum((line.line_total for line in lines), Decimal(0))),
    )


def _benchmark_and_floor(context: SellerStrategyContext, line: RfqLine) -> tuple[Decimal, Decimal]:
    reference = next(item for item in context.reference_prices if item.sku == line.sku)
    floor = next(item for item in context.policy.floor_prices if item.sku == line.sku)
    return reference.benchmark_price, floor.min_unit_price


def _margin_offer(
    context: SellerStrategyContext, config: MarginConfig, payment_terms: PaymentTerms
) -> OfferDraft:
    concession = _concession(context, config.max_concession_pct)
    lines: list[OfferLine] = []
    for line in context.rfq.lines:
        benchmark, floor = _benchmark_and_floor(context, line)
        target = benchmark * (Decimal(1) + config.target_margin_pct)
        price = target * (Decimal(1) - concession)
        lines.append(_normal_line(line, price, floor))
    return _offer(context, tuple(lines), payment_terms, "")


def _clearance_offer(
    context: SellerStrategyContext, config: ClearanceConfig, payment_terms: PaymentTerms
) -> OfferDraft:
    concession = _concession(context, config.max_concession_pct)
    lines: list[OfferLine] = []
    for line in context.rfq.lines:
        benchmark, floor = _benchmark_and_floor(context, line)
        target = benchmark * (Decimal(1) - config.initial_discount_pct)
        price = target * (Decimal(1) - concession)
        lines.append(_normal_line(line, price, floor))
    return _offer(context, tuple(lines), payment_terms, "")


def _payment_risk_offer(
    context: SellerStrategyContext, config: PaymentRiskConfig, payment_terms: PaymentTerms
) -> OfferDraft:
    concession = _concession(context, config.max_concession_pct)
    if context.buyer_risk.risk_tier == "low":
        margin = config.low_risk_margin_pct
    elif context.buyer_risk.risk_tier == "medium":
        margin = config.medium_risk_surcharge_pct
    else:
        margin = config.high_risk_surcharge_pct
    lines: list[OfferLine] = []
    for line in context.rfq.lines:
        benchmark, floor = _benchmark_and_floor(context, line)
        target = benchmark * (Decimal(1) + margin)
        price = target * (Decimal(1) - concession)
        lines.append(_normal_line(line, price, floor))
    return _offer(context, tuple(lines), payment_terms, "")


def _adversarial_offer(
    context: SellerStrategyContext, config: AdversarialConfig, payment_terms: PaymentTerms
) -> OfferDraft:
    lines: list[OfferLine] = []
    for line in context.rfq.lines:
        benchmark, floor = _benchmark_and_floor(context, line)
        lines.append(_adversarial_line(line, benchmark, floor, config.fake_original_multiplier))
    return _offer(context, tuple(lines), payment_terms, config.injection_note)


def generate_offer(context: SellerStrategyContext) -> OfferDraft | SellerFailure:
    failure = _preflight(context)
    if failure is not None:
        return failure
    config = context.policy.config
    if isinstance(config, AdversarialConfig):
        payment_terms = _select_payment_terms(context, risk_sensitive=False)
    elif isinstance(config, PaymentRiskConfig):
        payment_terms = _select_payment_terms(context, risk_sensitive=True)
    else:
        payment_terms = _select_payment_terms(context, risk_sensitive=False)
    if payment_terms is None:
        return _failure(context, "declined", "No feasible payment terms for buyer risk")
    if isinstance(config, MarginConfig):
        return _margin_offer(context, config, payment_terms)
    if isinstance(config, ClearanceConfig):
        return _clearance_offer(context, config, payment_terms)
    if isinstance(config, PaymentRiskConfig):
        return _payment_risk_offer(context, config, payment_terms)
    return _adversarial_offer(context, config, payment_terms)
