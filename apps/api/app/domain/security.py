import re
from collections import defaultdict
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import AwareDatetime, Field

from app.domain.common import DomainModel, money, ratio
from app.domain.models import TrustedReferencePrice
from app.domain.offers import OfferDraft, OfferLine
from app.domain.types import ReviewClassification

NoteCategory = Literal["commercial", "irrelevant", "suspicious_instruction"]
BlockedAction = Literal[
    "override_instructions",
    "disclose_budget",
    "reveal_secret",
    "invoke_tool",
    "change_authority",
    "execute_payment",
]

INJECTION_RULES: tuple[tuple[str, str, BlockedAction], ...] = (
    (
        "instruction_override",
        r"\bignore\s+(?:all\s+|any\s+)?(?:previous|prior|above|system|developer)\s+instructions?\b",
        "override_instructions",
    ),
    (
        "instruction_disregard",
        r"\bdisregard\s+(?:all\s+|any\s+)?(?:previous|prior|above|system|developer)\s+instructions?\b",
        "override_instructions",
    ),
    (
        "role_override",
        r"\b(?:you\s+are\s+now|from\s+now\s+on\s+you\s+are|act\s+as\s+the\s+system)\b",
        "override_instructions",
    ),
    (
        "system_prompt_probe",
        r"\b(?:system|developer|hidden)\s+(?:prompt|message|instructions?)\b",
        "override_instructions",
    ),
    (
        "new_instructions",
        r"\b(?:new|updated|replacement)\s+instructions?\b",
        "override_instructions",
    ),
    (
        "jailbreak_marker",
        r"\b(?:jailbreak|prompt\s+injection)\b",
        "override_instructions",
    ),
    (
        "budget_probe",
        r"\b(?:reveal|show|print|share|disclose|tell\s+me)\s+(?:the\s+)?(?:buyer'?s?\s+)?(?:maximum\s+|max\s+)?budget\b",
        "disclose_budget",
    ),
    (
        "budget_reference",
        r"\bbuyer'?s?\s+(?:maximum\s+|max\s+)?budget\b",
        "disclose_budget",
    ),
    (
        "secret_probe",
        r"\b(?:reveal|show|print|share|disclose|tell\s+me)\s+(?:the\s+)?(?:secret|api\s+key|private\s+key|password|credentials?)\b",
        "reveal_secret",
    ),
    (
        "tool_invocation",
        r"\b(?:call|invoke|use|run)\s+(?:the\s+)?(?:tool|function|api|database|sql)\b",
        "invoke_tool",
    ),
    (
        "sql_probe",
        r"\b(?:drop\s+table|delete\s+from|insert\s+into|select\s+.*\s+from)\b",
        "invoke_tool",
    ),
    (
        "authority_change",
        r"\b(?:set|change|override|raise|increase)\s+(?:the\s+)?(?:budget|mandate|authority|credit\s+limit|floor\s+price|price)\b",
        "change_authority",
    ),
    (
        "approval_instruction",
        r"\b(?:approve|lock|settle|confirm)\s+(?:the\s+)?(?:deal|payment|settlement)\b",
        "change_authority",
    ),
    (
        "payment_instruction",
        r"\b(?:send|transfer|pay)\s+(?:the\s+)?(?:funds|money|upi|payment)\b",
        "execute_payment",
    ),
)

COMMERCIAL_KEYWORDS = re.compile(
    r"\b(?:price|quote|discount|delivery|credit|stock|availability|quality|invoice|gst|"
    r"bulk|order|payment\s+terms|dispatch|warehouse|margin|quantity|unit|supply|lead\s+time)\b",
    re.IGNORECASE,
)

_COMPILED_INJECTION_RULES: tuple[tuple[str, re.Pattern[str], BlockedAction], ...] = tuple(
    (rule, re.compile(pattern, re.IGNORECASE), action) for rule, pattern, action in INJECTION_RULES
)


class TextEvidence(DomainModel):
    rule: str
    matched_text: str
    start: int = Field(ge=0)
    end: int = Field(ge=0)
    blocked_action: BlockedAction


class SellerNoteClassification(DomainModel):
    category: NoteCategory
    evidence: tuple[TextEvidence, ...]
    blocked_actions: tuple[BlockedAction, ...]
    action: Literal["allow_note", "quarantine_note"]
    classification_mode: Literal["tool_less_rules"] = "tool_less_rules"
    note_is_untrusted: Literal[True] = True


def classify_seller_note(note: str) -> SellerNoteClassification:
    evidence: list[TextEvidence] = []
    seen: set[tuple[str, int, int]] = set()
    for rule, pattern, blocked_action in _COMPILED_INJECTION_RULES:
        for match in pattern.finditer(note):
            key = (rule, match.start(), match.end())
            if key in seen:
                continue
            seen.add(key)
            evidence.append(
                TextEvidence(
                    rule=rule,
                    matched_text=match.group(0),
                    start=match.start(),
                    end=match.end(),
                    blocked_action=blocked_action,
                )
            )
    evidence.sort(key=lambda item: (item.start, item.end, item.rule))
    blocked_actions = tuple(dict.fromkeys(item.blocked_action for item in evidence))
    if evidence:
        return SellerNoteClassification(
            category="suspicious_instruction",
            evidence=tuple(evidence),
            blocked_actions=blocked_actions,
            action="quarantine_note",
        )
    if COMMERCIAL_KEYWORDS.search(note):
        return SellerNoteClassification(
            category="commercial",
            evidence=(),
            blocked_actions=(),
            action="allow_note",
        )
    return SellerNoteClassification(
        category="irrelevant",
        evidence=(),
        blocked_actions=(),
        action="allow_note",
    )


FakeDiscountRule = Literal[
    "inflated_original_price",
    "discount_above_benchmark",
    "claimed_original_below_offer",
]


class FakeDiscountSignal(DomainModel):
    offer_id: UUID
    seller_principal_id: UUID
    sku: str
    rule: FakeDiscountRule
    benchmark_unit_price: Decimal
    claimed_original_unit_price: Decimal
    observed_net_unit_price: Decimal
    claimed_discount_pct: Decimal
    benchmark_discount_pct: Decimal
    tolerance_pct: Decimal
    benchmark_source_event_id: UUID | None
    message: str = Field(min_length=1, max_length=500)
    classification: ReviewClassification = "review_evidence_only"
    is_fraud_accusation: Literal[False] = False


class FakeDiscountReport(DomainModel):
    offer_id: UUID
    seller_principal_id: UUID
    signals: tuple[FakeDiscountSignal, ...]
    review_required: bool
    label: Literal["review evidence only; not a fraud finding"] = (
        "review evidence only; not a fraud finding"
    )


def _fake_discount_signal(
    *,
    offer: OfferDraft,
    line: OfferLine,
    rule: FakeDiscountRule,
    message: str,
    benchmark: Decimal,
    claimed_original: Decimal,
    observed_net: Decimal,
    claimed_discount: Decimal,
    benchmark_discount: Decimal,
    tolerance_pct: Decimal,
    reference: TrustedReferencePrice,
) -> FakeDiscountSignal:
    return FakeDiscountSignal(
        offer_id=offer.offer_id,
        seller_principal_id=offer.seller_principal_id,
        sku=line.sku,
        rule=rule,
        benchmark_unit_price=benchmark,
        claimed_original_unit_price=claimed_original,
        observed_net_unit_price=observed_net,
        claimed_discount_pct=claimed_discount,
        benchmark_discount_pct=benchmark_discount,
        tolerance_pct=tolerance_pct,
        benchmark_source_event_id=reference.source_event_id,
        message=message,
    )


def detect_fake_discount(
    offer: OfferDraft,
    reference_prices: tuple[TrustedReferencePrice, ...],
    *,
    tolerance_pct: Decimal = Decimal("0.10"),
) -> FakeDiscountReport:
    if not Decimal(0) <= tolerance_pct <= Decimal(1):
        raise ValueError("tolerance_pct must be between zero and one")
    references = {(item.sku, item.unit): item for item in reference_prices}
    signals: list[FakeDiscountSignal] = []
    for line in offer.lines:
        reference = references.get((line.sku, line.unit))
        if reference is None:
            continue
        benchmark = reference.benchmark_price
        claimed_original = line.claimed_original_unit_price or line.unit_price
        observed_net = ratio(line.line_total / line.quantity)
        claimed_discount = (
            ratio((claimed_original - observed_net) / claimed_original)
            if claimed_original > observed_net
            else Decimal(0)
        )
        benchmark_discount = ratio(max(Decimal(0), (benchmark - observed_net) / benchmark))

        claims_discount = line.claimed_original_unit_price is not None or line.discount > 0
        if (
            claims_discount
            and claimed_original > observed_net
            and claimed_original > benchmark * (Decimal(1) + tolerance_pct)
        ):
            signals.append(
                _fake_discount_signal(
                    offer=offer,
                    line=line,
                    rule="inflated_original_price",
                    message=(
                        "Claimed original price exceeds the trusted benchmark by more than "
                        "the configured tolerance"
                    ),
                    benchmark=benchmark,
                    claimed_original=claimed_original,
                    observed_net=observed_net,
                    claimed_discount=claimed_discount,
                    benchmark_discount=benchmark_discount,
                    tolerance_pct=tolerance_pct,
                    reference=reference,
                )
            )
        if claimed_original > observed_net and observed_net >= benchmark:
            signals.append(
                _fake_discount_signal(
                    offer=offer,
                    line=line,
                    rule="discount_above_benchmark",
                    message=(
                        "Offer claims a discount but the observed price remains at or above "
                        "the trusted benchmark"
                    ),
                    benchmark=benchmark,
                    claimed_original=claimed_original,
                    observed_net=observed_net,
                    claimed_discount=claimed_discount,
                    benchmark_discount=benchmark_discount,
                    tolerance_pct=tolerance_pct,
                    reference=reference,
                )
            )
        if claimed_original < observed_net:
            signals.append(
                _fake_discount_signal(
                    offer=offer,
                    line=line,
                    rule="claimed_original_below_offer",
                    message="Claimed original price is below the observed offer price",
                    benchmark=benchmark,
                    claimed_original=claimed_original,
                    observed_net=observed_net,
                    claimed_discount=claimed_discount,
                    benchmark_discount=benchmark_discount,
                    tolerance_pct=tolerance_pct,
                    reference=reference,
                )
            )
    signals.sort(key=lambda item: (item.sku, item.rule))
    return FakeDiscountReport(
        offer_id=offer.offer_id,
        seller_principal_id=offer.seller_principal_id,
        signals=tuple(signals),
        review_required=bool(signals),
    )


CollusionRule = Literal["identical_offer_price", "identical_floor_price"]


class CollusionObservation(DomainModel):
    seller_principal_id: UUID
    seller_agent_id: UUID
    sku: str = Field(min_length=1, max_length=40)
    round_index: int = Field(ge=1)
    net_unit_price: Decimal = Field(gt=0, max_digits=14, decimal_places=2)
    floor_unit_price: Decimal | None = Field(default=None, gt=0, max_digits=14, decimal_places=2)
    submitted_at: AwareDatetime


class CollusionSignal(DomainModel):
    code: CollusionRule
    sku: str
    round_index: int
    principal_ids: tuple[UUID, ...] = Field(min_length=2)
    agent_ids: tuple[UUID, ...] = Field(min_length=2)
    observation_count: int = Field(ge=2)
    observed_value: Decimal
    synchronized: bool
    timing_span_seconds: int = Field(ge=0)
    synchronization_window_seconds: int = Field(ge=0)
    message: str = Field(min_length=1, max_length=500)
    classification: ReviewClassification = "review_evidence_only"
    is_fraud_accusation: Literal[False] = False


class CollusionReport(DomainModel):
    signals: tuple[CollusionSignal, ...]
    review_required: bool
    distinct_principals_reviewed: int = Field(ge=0)
    label: Literal["review evidence only; not a fraud finding"] = (
        "review evidence only; not a fraud finding"
    )


def _group_by_principal(
    observations: list[CollusionObservation],
) -> dict[UUID, list[CollusionObservation]]:
    grouped: dict[UUID, list[CollusionObservation]] = defaultdict(list)
    for observation in observations:
        grouped[observation.seller_principal_id].append(observation)
    return grouped


def detect_collusion_signals(
    observations: tuple[CollusionObservation, ...],
    *,
    synchronization_window_seconds: int = 120,
) -> CollusionReport:
    if synchronization_window_seconds < 0:
        raise ValueError("synchronization_window_seconds cannot be negative")
    distinct_principals = {item.seller_principal_id for item in observations}
    signals: list[CollusionSignal] = []

    offer_groups: dict[tuple[str, int, Decimal], list[CollusionObservation]] = defaultdict(list)
    for observation in observations:
        offer_groups[
            (observation.sku, observation.round_index, money(observation.net_unit_price))
        ].append(observation)
    for (sku, round_index, price), group in offer_groups.items():
        grouped = _group_by_principal(group)
        if len(grouped) < 2:
            continue
        representatives = [
            min(items, key=lambda item: (item.submitted_at, str(item.seller_agent_id)))
            for items in grouped.values()
        ]
        timestamps = [item.submitted_at for item in representatives]
        span = int((max(timestamps) - min(timestamps)).total_seconds())
        synchronized = span <= synchronization_window_seconds
        principal_ids = tuple(sorted(grouped, key=str))
        agent_ids = tuple(sorted({item.seller_agent_id for item in group}, key=str))
        signals.append(
            CollusionSignal(
                code="identical_offer_price",
                sku=sku,
                round_index=round_index,
                principal_ids=principal_ids,
                agent_ids=agent_ids,
                observation_count=len(group),
                observed_value=price,
                synchronized=synchronized,
                timing_span_seconds=span,
                synchronization_window_seconds=synchronization_window_seconds,
                message=(
                    f"{len(principal_ids)} distinct principals submitted the same net price "
                    f"for {sku} in round {round_index}"
                ),
            )
        )

    floor_groups: dict[tuple[str, int, Decimal], list[CollusionObservation]] = defaultdict(list)
    for observation in observations:
        if observation.floor_unit_price is None:
            continue
        floor_groups[
            (
                observation.sku,
                observation.round_index,
                money(observation.floor_unit_price),
            )
        ].append(observation)
    for (sku, round_index, floor), group in floor_groups.items():
        grouped = _group_by_principal(group)
        if len(grouped) < 2:
            continue
        principal_ids = tuple(sorted(grouped, key=str))
        agent_ids = tuple(sorted({item.seller_agent_id for item in group}, key=str))
        signals.append(
            CollusionSignal(
                code="identical_floor_price",
                sku=sku,
                round_index=round_index,
                principal_ids=principal_ids,
                agent_ids=agent_ids,
                observation_count=len(group),
                observed_value=floor,
                synchronized=False,
                timing_span_seconds=0,
                synchronization_window_seconds=synchronization_window_seconds,
                message=(
                    f"{len(principal_ids)} distinct principals reported the same private "
                    f"floor price for {sku} in round {round_index}"
                ),
            )
        )

    signals.sort(key=lambda item: (item.code, item.sku, item.round_index, item.observed_value))
    return CollusionReport(
        signals=tuple(signals),
        review_required=bool(signals),
        distinct_principals_reviewed=len(distinct_principals),
    )
