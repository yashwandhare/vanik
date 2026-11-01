from collections import defaultdict
from decimal import Decimal
from typing import Literal, Self
from uuid import UUID

from pydantic import AwareDatetime, Field, field_validator, model_validator

from app.domain.common import DomainModel, ratio
from app.domain.models import (
    BuyerRiskCredential,
    Rfq,
    SellerPolicy,
    StockLine,
    TrustedReferencePrice,
)
from app.domain.offers import OfferDraft
from app.domain.types import PaymentType, RankingFactorName, RatingStatus
from app.domain.validation import (
    OfferValidationContext,
    OfferValidationResult,
    ValidationIssue,
    validate_offer,
)

RejectionReason = Literal["validation_failed", "security_action_blocked", "duplicate_principal"]


class ReliabilityEvidence(DomainModel):
    score: Decimal | None = Field(default=None, ge=0, le=1, max_digits=5, decimal_places=4)
    evidence_count: int = Field(default=0, ge=0)
    source_event_ids: tuple[UUID, ...] = ()
    evidence_is_simulated: bool = True

    @model_validator(mode="after")
    def evidence_is_consistent(self) -> Self:
        if self.score is None:
            if self.evidence_count != 0 or self.source_event_ids:
                raise ValueError("Unrated sellers cannot carry reliability evidence")
            return self
        if self.evidence_count < 1:
            raise ValueError("A reliability score requires verified outcome evidence")
        if len(self.source_event_ids) != self.evidence_count:
            raise ValueError("Reliability evidence count must match source event IDs")
        return self


class RankingWeights(DomainModel):
    price: Decimal = Field(ge=0, le=1, max_digits=6, decimal_places=4)
    reliability: Decimal = Field(ge=0, le=1, max_digits=6, decimal_places=4)
    delivery: Decimal = Field(ge=0, le=1, max_digits=6, decimal_places=4)
    credit: Decimal = Field(ge=0, le=1, max_digits=6, decimal_places=4)
    availability: Decimal = Field(ge=0, le=1, max_digits=6, decimal_places=4)

    @model_validator(mode="after")
    def weights_sum_to_one(self) -> Self:
        if sum(
            (
                self.price,
                self.reliability,
                self.delivery,
                self.credit,
                self.availability,
            ),
            Decimal(0),
        ) != Decimal(1):
            raise ValueError("Ranking weights must sum exactly to one")
        return self


class RankingCandidate(DomainModel):
    offer: OfferDraft
    policy: SellerPolicy
    stock: tuple[StockLine, ...] = Field(min_length=1, max_length=100)
    buyer_risk: BuyerRiskCredential
    reliability: ReliabilityEvidence
    policy_source_event_ids: tuple[UUID, ...] = ()
    stock_source_event_ids: tuple[UUID, ...] = ()
    security_blocked: bool = False

    @field_validator("stock")
    @classmethod
    def unique_stock_skus(cls, values: tuple[StockLine, ...]) -> tuple[StockLine, ...]:
        if len({value.sku for value in values}) != len(values):
            raise ValueError("Stock SKUs must be distinct")
        return values


class RankingRequest(DomainModel):
    rfq: Rfq
    budget_inr: Decimal = Field(gt=0, max_digits=18, decimal_places=2)
    max_credit_days: int = Field(ge=0, le=90)
    allowed_payment_types: tuple[PaymentType, ...] = Field(min_length=1, max_length=5)
    reference_prices: tuple[TrustedReferencePrice, ...] = ()
    candidates: tuple[RankingCandidate, ...] = ()
    weights: RankingWeights
    now: AwareDatetime

    @field_validator("allowed_payment_types")
    @classmethod
    def unique_payment_types(cls, values: tuple[PaymentType, ...]) -> tuple[PaymentType, ...]:
        if len(set(values)) != len(values):
            raise ValueError("Allowed payment types must be distinct")
        return values

    @field_validator("reference_prices")
    @classmethod
    def unique_reference_skus(
        cls, values: tuple[TrustedReferencePrice, ...]
    ) -> tuple[TrustedReferencePrice, ...]:
        if len({value.sku for value in values}) != len(values):
            raise ValueError("Reference price SKUs must be distinct")
        return values


class RankingFactor(DomainModel):
    factor: RankingFactorName
    weight: Decimal
    normalized: Decimal | None
    contribution: Decimal
    evidence_count: int = Field(ge=0)
    source_event_ids: tuple[UUID, ...]
    explanation: str = Field(min_length=1, max_length=500)


class RankedCandidate(DomainModel):
    rank: int = Field(ge=1)
    seller_principal_id: UUID
    seller_agent_id: UUID
    offer_id: UUID
    total: Decimal
    score: Decimal = Field(ge=0, le=1)
    effective_weight_sum: Decimal = Field(ge=0, le=1)
    rating_status: RatingStatus
    limited_evidence: bool
    factors: tuple[RankingFactor, ...]


class RejectedCandidate(DomainModel):
    seller_principal_id: UUID
    seller_agent_id: UUID
    offer_id: UUID
    reasons: tuple[RejectionReason, ...] = Field(min_length=1)
    issues: tuple[ValidationIssue, ...] = ()


class RankingResult(DomainModel):
    ranked: tuple[RankedCandidate, ...]
    rejected: tuple[RejectedCandidate, ...]
    weights: RankingWeights
    note: Literal["Deterministic ranking; hard failures rejected before scoring."] = (
        "Deterministic ranking; hard failures rejected before scoring."
    )


def _normalize(
    value: Decimal,
    minimum: Decimal,
    maximum: Decimal,
    *,
    higher_is_better: bool,
) -> Decimal:
    if maximum == minimum:
        return Decimal(1)
    if higher_is_better:
        return ratio((value - minimum) / (maximum - minimum))
    return ratio((maximum - value) / (maximum - minimum))


def _availability(candidate: RankingCandidate) -> Decimal:
    stock = {item.sku: item.available_qty for item in candidate.stock}
    coverages: list[Decimal] = []
    for line in candidate.offer.lines:
        available = stock.get(line.sku)
        if available is None:
            return Decimal(0)
        coverages.append(min(Decimal(1), available / line.quantity))
    return ratio(min(coverages)) if coverages else Decimal(0)


def _price_evidence(
    candidate: RankingCandidate, reference_prices: tuple[TrustedReferencePrice, ...]
) -> tuple[int, tuple[UUID, ...]]:
    references = {(item.sku, item.unit): item for item in reference_prices}
    source_ids: list[UUID] = []
    count = 0
    for line in candidate.offer.lines:
        reference = references.get((line.sku, line.unit))
        if reference is None:
            continue
        count += 1
        if reference.source_event_id is not None:
            source_ids.append(reference.source_event_id)
    return count, tuple(dict.fromkeys(source_ids))


def _factor(
    name: RankingFactorName,
    weight: Decimal,
    normalized: Decimal | None,
    *,
    evidence_count: int,
    source_event_ids: tuple[UUID, ...],
    explanation: str,
) -> RankingFactor:
    contribution = ratio(weight * normalized) if normalized is not None else Decimal(0)
    return RankingFactor(
        factor=name,
        weight=weight,
        normalized=normalized,
        contribution=contribution,
        evidence_count=evidence_count,
        source_event_ids=source_event_ids,
        explanation=explanation,
    )


def _validation_context(
    request: RankingRequest, candidate: RankingCandidate
) -> OfferValidationContext:
    return OfferValidationContext(
        rfq=request.rfq,
        budget_inr=request.budget_inr,
        max_credit_days=request.max_credit_days,
        allowed_payment_types=request.allowed_payment_types,
        stock=candidate.stock,
        policy=candidate.policy,
        buyer_risk=candidate.buyer_risk,
        now=request.now,
    )


def _score_candidate(
    request: RankingRequest,
    candidate: RankingCandidate,
    *,
    price_bounds: tuple[Decimal, Decimal],
    delivery_bounds: tuple[Decimal, Decimal],
    credit_bounds: tuple[Decimal, Decimal],
    availability_bounds: tuple[Decimal, Decimal],
) -> RankedCandidate:
    weights = request.weights
    total = candidate.offer.total
    delivery_value = Decimal(candidate.offer.delivery_date.toordinal())
    credit_value = Decimal(candidate.offer.payment_terms.credit_days)
    availability_value = _availability(candidate)
    price_count, price_source_ids = _price_evidence(candidate, request.reference_prices)

    factors: list[RankingFactor] = [
        _factor(
            "price",
            weights.price,
            _normalize(total, *price_bounds, higher_is_better=False),
            evidence_count=price_count,
            source_event_ids=price_source_ids,
            explanation=f"Lower total is better; this offer totals INR {total}.",
        ),
        _factor(
            "reliability",
            weights.reliability,
            candidate.reliability.score,
            evidence_count=candidate.reliability.evidence_count,
            source_event_ids=candidate.reliability.source_event_ids,
            explanation=(
                f"{candidate.reliability.evidence_count} verified reliability event(s)."
                if candidate.reliability.score is not None
                else "No verified reliability evidence; seller remains unrated."
            ),
        ),
        _factor(
            "delivery",
            weights.delivery,
            _normalize(
                delivery_value,
                *delivery_bounds,
                higher_is_better=False,
            ),
            evidence_count=len(candidate.policy_source_event_ids),
            source_event_ids=candidate.policy_source_event_ids,
            explanation=(
                f"Delivery on {candidate.offer.delivery_date.isoformat()}; earlier is better."
            ),
        ),
        _factor(
            "credit",
            weights.credit,
            _normalize(
                credit_value,
                *credit_bounds,
                higher_is_better=True,
            ),
            evidence_count=len(candidate.policy_source_event_ids),
            source_event_ids=candidate.policy_source_event_ids,
            explanation=(
                f"{candidate.offer.payment_terms.credit_days} credit day(s); higher is better."
            ),
        ),
        _factor(
            "availability",
            weights.availability,
            _normalize(
                availability_value,
                *availability_bounds,
                higher_is_better=True,
            ),
            evidence_count=len(candidate.stock_source_event_ids),
            source_event_ids=candidate.stock_source_event_ids,
            explanation=(
                f"Minimum stock coverage ratio is {availability_value}; higher is better."
            ),
        ),
    ]
    effective_weight_sum = sum(
        (factor.weight for factor in factors if factor.normalized is not None), Decimal(0)
    )
    contribution_sum = sum((factor.contribution for factor in factors), Decimal(0))
    score = (
        ratio(contribution_sum / effective_weight_sum) if effective_weight_sum > 0 else Decimal(0)
    )
    rated = candidate.reliability.score is not None
    return RankedCandidate(
        rank=1,
        seller_principal_id=candidate.offer.seller_principal_id,
        seller_agent_id=candidate.offer.seller_agent_id,
        offer_id=candidate.offer.offer_id,
        total=total,
        score=min(Decimal(1), max(Decimal(0), score)),
        effective_weight_sum=min(Decimal(1), effective_weight_sum),
        rating_status="rated" if rated else "unrated",
        limited_evidence=not rated,
        factors=tuple(factors),
    )


def rank_offers(request: RankingRequest) -> RankingResult:
    rejected: list[RejectedCandidate] = []
    valid: list[RankingCandidate] = []
    for candidate in request.candidates:
        validation = validate_offer(candidate.offer, _validation_context(request, candidate))
        reasons: list[RejectionReason] = []
        if not validation.valid:
            reasons.append("validation_failed")
        if candidate.security_blocked:
            reasons.append("security_action_blocked")
        if reasons:
            rejected.append(
                RejectedCandidate(
                    seller_principal_id=candidate.offer.seller_principal_id,
                    seller_agent_id=candidate.offer.seller_agent_id,
                    offer_id=candidate.offer.offer_id,
                    reasons=tuple(reasons),
                    issues=validation.issues,
                )
            )
        else:
            valid.append(candidate)

    grouped: dict[UUID, list[RankingCandidate]] = defaultdict(list)
    for candidate in valid:
        grouped[candidate.offer.seller_principal_id].append(candidate)
    selected: list[RankingCandidate] = []
    for principal_candidates in grouped.values():
        ranked_candidates = sorted(
            principal_candidates,
            key=lambda item: (
                item.offer.total,
                item.offer.delivery_date,
                str(item.offer.seller_agent_id),
            ),
        )
        selected.append(ranked_candidates[0])
        for duplicate in ranked_candidates[1:]:
            rejected.append(
                RejectedCandidate(
                    seller_principal_id=duplicate.offer.seller_principal_id,
                    seller_agent_id=duplicate.offer.seller_agent_id,
                    offer_id=duplicate.offer.offer_id,
                    reasons=("duplicate_principal",),
                )
            )

    if not selected:
        return RankingResult(
            ranked=(),
            rejected=tuple(rejected),
            weights=request.weights,
        )

    totals = [candidate.offer.total for candidate in selected]
    deliveries = [Decimal(candidate.offer.delivery_date.toordinal()) for candidate in selected]
    credits = [Decimal(candidate.offer.payment_terms.credit_days) for candidate in selected]
    availabilities = [_availability(candidate) for candidate in selected]
    price_bounds = (min(totals), max(totals))
    delivery_bounds = (min(deliveries), max(deliveries))
    credit_bounds = (min(credits), max(credits))
    availability_bounds = (min(availabilities), max(availabilities))

    scored = [
        _score_candidate(
            request,
            candidate,
            price_bounds=price_bounds,
            delivery_bounds=delivery_bounds,
            credit_bounds=credit_bounds,
            availability_bounds=availability_bounds,
        )
        for candidate in selected
    ]
    scored.sort(
        key=lambda item: (
            -item.score,
            item.total,
            item.seller_principal_id,
            item.seller_agent_id,
        )
    )
    ranked = tuple(
        item.model_copy(update={"rank": index}) for index, item in enumerate(scored, start=1)
    )
    rejected.sort(key=lambda item: (str(item.seller_principal_id), str(item.offer_id)))
    return RankingResult(
        ranked=ranked,
        rejected=tuple(rejected),
        weights=request.weights,
    )


def validate_and_rank_offer(
    request: RankingRequest, candidate: RankingCandidate
) -> tuple[OfferValidationResult, RankingResult]:
    validation = validate_offer(candidate.offer, _validation_context(request, candidate))
    ranking = rank_offers(request.model_copy(update={"candidates": (candidate,)}))
    return validation, ranking
