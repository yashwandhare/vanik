from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from uuid import NAMESPACE_URL, UUID, uuid5

from app.domain.common import money
from app.domain.models import (
    BuyerRiskCredential,
    FloorPrice,
    MarginConfig,
    Rfq,
    RfqLine,
    SellerPolicy,
    SellerStrategyConfig,
    SellerStrategyContext,
    StockLine,
    TrustedReferencePrice,
)
from app.domain.offers import OfferDraft, OfferLine, PaymentTerms
from app.domain.ranking import (
    RankingCandidate,
    RankingRequest,
    RankingWeights,
    ReliabilityEvidence,
)
from app.domain.types import PaymentType, RiskTier
from app.domain.validation import OfferValidationContext

NOW = datetime(2026, 10, 20, 10, 0, tzinfo=UTC)
NEGOTIATION_ID = UUID("60000000-0000-4000-8000-000000000001")
OFFER_ID = UUID("80000000-0000-4000-8000-000000000001")
SELLER_PRINCIPAL_ID = UUID("20000000-0000-4000-8000-000000000002")
SELLER_AGENT_ID = UUID("30000000-0000-4000-8000-000000000002")
OTHER_PRINCIPAL_ID = UUID("20000000-0000-4000-8000-000000000003")
OTHER_AGENT_ID = UUID("30000000-0000-4000-8000-000000000003")
THIRD_PRINCIPAL_ID = UUID("20000000-0000-4000-8000-000000000004")
THIRD_AGENT_ID = UUID("30000000-0000-4000-8000-000000000004")
REFERENCE_EVENT_1 = UUID("90000000-0000-4000-8000-000000000001")
REFERENCE_EVENT_2 = UUID("90000000-0000-4000-8000-000000000002")
POLICY_EVENT_ID = UUID("90000000-0000-4000-8000-000000000003")
STOCK_EVENT_ID = UUID("90000000-0000-4000-8000-000000000004")
ALL_PAYMENT_TYPES: tuple[PaymentType, ...] = (
    "advance_upi",
    "partial_advance",
    "credit_net_7",
    "credit_net_15",
    "credit_net_30",
)


def make_rfq(
    lines: tuple[RfqLine, ...] | None = None,
    *,
    delivery_deadline: datetime | None = None,
    expires_at: datetime | None = None,
) -> Rfq:
    return Rfq(
        negotiation_id=NEGOTIATION_ID,
        lines=lines
        or (
            RfqLine(sku="RICE-1", quantity=Decimal("10"), unit="bag"),
            RfqLine(sku="OIL-1", quantity=Decimal("5"), unit="bottle"),
        ),
        delivery_deadline=delivery_deadline or NOW + timedelta(days=7),
        expires_at=expires_at or NOW + timedelta(days=1),
    )


def make_references() -> tuple[TrustedReferencePrice, ...]:
    return (
        TrustedReferencePrice(
            sku="RICE-1",
            unit="bag",
            benchmark_price=Decimal("100.00"),
            source_event_id=REFERENCE_EVENT_1,
        ),
        TrustedReferencePrice(
            sku="OIL-1",
            unit="bottle",
            benchmark_price=Decimal("200.00"),
            source_event_id=REFERENCE_EVENT_2,
        ),
    )


def make_stock(
    *, rice: Decimal = Decimal("100.000"), oil: Decimal = Decimal("100.000")
) -> tuple[StockLine, ...]:
    return (
        StockLine(sku="RICE-1", unit="bag", available_qty=rice),
        StockLine(sku="OIL-1", unit="bottle", available_qty=oil),
    )


def make_floors(
    *, rice: Decimal = Decimal("70.00"), oil: Decimal = Decimal("140.00")
) -> tuple[FloorPrice, ...]:
    return (
        FloorPrice(sku="RICE-1", unit="bag", min_unit_price=rice),
        FloorPrice(sku="OIL-1", unit="bottle", min_unit_price=oil),
    )


def make_policy(
    config: SellerStrategyConfig | None = None,
    *,
    delivery_days: int = 2,
    allowed_payment_types: tuple[PaymentType, ...] = ALL_PAYMENT_TYPES,
    max_credit_days: int = 30,
    min_upfront_pct: Decimal = Decimal("10.00"),
    floor_prices: tuple[FloorPrice, ...] | None = None,
    seller_principal_id: UUID = SELLER_PRINCIPAL_ID,
    seller_agent_id: UUID = SELLER_AGENT_ID,
) -> SellerPolicy:
    return SellerPolicy(
        seller_principal_id=seller_principal_id,
        seller_agent_id=seller_agent_id,
        delivery_days=delivery_days,
        allowed_payment_types=allowed_payment_types,
        max_credit_days=max_credit_days,
        min_upfront_pct=min_upfront_pct,
        offer_validity_minutes=30,
        floor_prices=floor_prices or make_floors(),
        config=config
        or MarginConfig(
            target_margin_pct=Decimal("0.10"),
            max_concession_pct=Decimal("0.10"),
        ),
    )


def make_buyer_risk(
    *,
    risk_tier: RiskTier = "medium",
    max_credit_days: int = 15,
    required_upfront_pct: Decimal = Decimal("20.00"),
) -> BuyerRiskCredential:
    return BuyerRiskCredential(
        risk_tier=risk_tier,
        max_credit_days=max_credit_days,
        required_upfront_pct=required_upfront_pct,
    )


def make_context(
    policy: SellerPolicy | None = None,
    *,
    rfq: Rfq | None = None,
    references: tuple[TrustedReferencePrice, ...] | None = None,
    stock: tuple[StockLine, ...] | None = None,
    buyer_risk: BuyerRiskCredential | None = None,
    round_index: int = 1,
    max_rounds: int = 3,
    now: datetime = NOW,
) -> SellerStrategyContext:
    return SellerStrategyContext(
        rfq=rfq or make_rfq(),
        reference_prices=references or make_references(),
        stock=stock or make_stock(),
        policy=policy or make_policy(),
        buyer_risk=buyer_risk or make_buyer_risk(),
        round_index=round_index,
        max_rounds=max_rounds,
        now=now,
    )


def make_line(
    sku: str,
    quantity: Decimal,
    unit: str,
    unit_price: Decimal,
    *,
    discount: Decimal = Decimal("0.00"),
    claimed_original_unit_price: Decimal | None = None,
) -> OfferLine:
    return OfferLine(
        sku=sku,
        quantity=quantity,
        unit=unit,
        unit_price=unit_price,
        discount=discount,
        claimed_original_unit_price=claimed_original_unit_price,
        line_total=money(quantity * unit_price - discount),
    )


def default_lines() -> tuple[OfferLine, ...]:
    return (
        make_line("RICE-1", Decimal("10"), "bag", Decimal("90.00")),
        make_line("OIL-1", Decimal("5"), "bottle", Decimal("180.00")),
    )


def make_offer(
    lines: tuple[OfferLine, ...] | None = None,
    *,
    payment_terms: PaymentTerms | None = None,
    total: Decimal | None = None,
    offer_id: UUID = OFFER_ID,
    negotiation_id: UUID = NEGOTIATION_ID,
    seller_principal_id: UUID = SELLER_PRINCIPAL_ID,
    seller_agent_id: UUID = SELLER_AGENT_ID,
    delivery_date: date | None = None,
    expires_at: datetime | None = None,
    seller_note: str = "",
    round_index: int = 1,
) -> OfferDraft:
    chosen_lines = lines or default_lines()
    chosen_total = (
        total
        if total is not None
        else money(sum((line.line_total for line in chosen_lines), Decimal(0)))
    )
    return OfferDraft(
        offer_id=offer_id,
        negotiation_id=negotiation_id,
        seller_agent_id=seller_agent_id,
        seller_principal_id=seller_principal_id,
        round_index=round_index,
        lines=chosen_lines,
        delivery_date=delivery_date or NOW.date() + timedelta(days=2),
        delivery_terms="Delivered to buyer address",
        payment_terms=payment_terms
        or PaymentTerms(
            type="credit_net_15",
            credit_days=15,
            upfront_pct=Decimal("20.00"),
            balance_due_days=15,
        ),
        expires_at=expires_at or NOW + timedelta(hours=1),
        seller_note=seller_note,
        total=chosen_total,
    )


def make_validation_context(
    policy: SellerPolicy | None = None,
    *,
    rfq: Rfq | None = None,
    stock: tuple[StockLine, ...] | None = None,
    buyer_risk: BuyerRiskCredential | None = None,
    budget_inr: Decimal = Decimal("5000.00"),
    max_credit_days: int = 15,
    allowed_payment_types: tuple[PaymentType, ...] = ALL_PAYMENT_TYPES,
    now: datetime = NOW,
) -> OfferValidationContext:
    return OfferValidationContext(
        rfq=rfq or make_rfq(),
        budget_inr=budget_inr,
        max_credit_days=max_credit_days,
        allowed_payment_types=allowed_payment_types,
        stock=stock or make_stock(),
        policy=policy or make_policy(),
        buyer_risk=buyer_risk or make_buyer_risk(),
        now=now,
    )


def make_reliability(score: str | None = None, count: int = 0) -> ReliabilityEvidence:
    if score is None:
        return ReliabilityEvidence()
    return ReliabilityEvidence(
        score=Decimal(score),
        evidence_count=count,
        source_event_ids=tuple(
            uuid5(NAMESPACE_URL, f"https://vanik.invalid/test/reliability/{index}")
            for index in range(count)
        ),
    )


def make_candidate(
    offer: OfferDraft | None = None,
    *,
    policy: SellerPolicy | None = None,
    stock: tuple[StockLine, ...] | None = None,
    buyer_risk: BuyerRiskCredential | None = None,
    reliability: ReliabilityEvidence | None = None,
    security_blocked: bool = False,
) -> RankingCandidate:
    chosen_offer = offer or make_offer()
    return RankingCandidate(
        offer=chosen_offer,
        policy=policy
        or make_policy(
            seller_principal_id=chosen_offer.seller_principal_id,
            seller_agent_id=chosen_offer.seller_agent_id,
        ),
        stock=stock or make_stock(),
        buyer_risk=buyer_risk or make_buyer_risk(),
        reliability=reliability or make_reliability("0.90", 2),
        policy_source_event_ids=(POLICY_EVENT_ID,),
        stock_source_event_ids=(STOCK_EVENT_ID,),
        security_blocked=security_blocked,
    )


def default_weights() -> RankingWeights:
    return RankingWeights(
        price=Decimal("0.40"),
        reliability=Decimal("0.20"),
        delivery=Decimal("0.15"),
        credit=Decimal("0.15"),
        availability=Decimal("0.10"),
    )


def make_ranking_request(
    candidates: tuple[RankingCandidate, ...],
    *,
    weights: RankingWeights | None = None,
    references: tuple[TrustedReferencePrice, ...] | None = None,
    rfq: Rfq | None = None,
    budget_inr: Decimal = Decimal("5000.00"),
    max_credit_days: int = 15,
    allowed_payment_types: tuple[PaymentType, ...] = ALL_PAYMENT_TYPES,
    now: datetime = NOW,
) -> RankingRequest:
    return RankingRequest(
        rfq=rfq or make_rfq(),
        budget_inr=budget_inr,
        max_credit_days=max_credit_days,
        allowed_payment_types=allowed_payment_types,
        reference_prices=references or make_references(),
        candidates=candidates,
        weights=weights or default_weights(),
        now=now,
    )
