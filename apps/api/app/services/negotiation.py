import asyncio
from datetime import UTC, datetime
from decimal import Decimal
from typing import TypedDict
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.contracts.workflow import (
    AgentEnvelope,
    NegotiationListResponse,
    NegotiationResponse,
    OfferResponse,
    OfferTerms,
)
from app.core.agent_crypto import KeyDecryptionError
from app.core.config import Settings
from app.db.models import Agent, Inventory, Product, SellerProfile
from app.db.task_models import PrincipalProcurementPolicy, Task
from app.db.workflow_models import AgentMessage, Negotiation, Offer, SecurityIncident
from app.domain.security import classify_seller_note
from app.services import tasks
from app.services.agents import AgentNotFoundError, AgentStateError
from app.services.auth import AuthContext, as_utc
from app.services.events import notify_members, record_event, reliability
from app.services.marketplace import list_sellers
from app.services.protocol import ProtocolError, content_hash, send_message
from app.services.seller_strategies import QuoteLine, SellerContext, SellerRequest, draft_offer

MONEY = Decimal("0.01")


class ValidationResult(TypedDict):
    valid: bool
    checks: list[dict[str, object]]
    flags: list[dict[str, object]]
    note_classification: str


FLOORS = {
    "default": Decimal("0.94"),
    "margin": Decimal("0.94"),
    "clearance": Decimal("0.88"),
    "payment_risk": Decimal("0.94"),
    "adversarial": Decimal("0.80"),
}
TRANSITIONS = {
    "created": {"rfq_sent", "invalid", "cancelled"},
    "rfq_sent": {"offer_received", "expired", "invalid", "cancelled"},
    "offer_received": {"evaluating", "invalid"},
    "evaluating": {"counter_pending", "accepted", "rejected", "invalid", "cancelled"},
    "counter_pending": {"rfq_sent", "expired", "cancelled"},
    "accepted": {"deal_locked", "cancelled", "expired"},
    "deal_locked": set(),
    "invalid": set(),
    "expired": set(),
    "rejected": set(),
    "cancelled": set(),
}


def transition(negotiation: Negotiation, target: str) -> None:
    if target not in TRANSITIONS.get(negotiation.state, set()):
        raise tasks.TaskConflictError
    negotiation.state = target


def _rfq(task: Task) -> dict[str, object]:
    # No buyer budget, private policy or competitor identity is included.
    return {
        "lines": [
            {
                "product_id": line["product_id"],
                "sku": line["sku"],
                "quantity": line["quantity"],
                "unit": line["unit"],
            }
            for line in task.lines
        ],
        "delivery_deadline": as_utc(task.delivery_deadline).isoformat(),
        "currency": "INR",
        "buyer_credit": {"score": 65, "is_simulated": True},
        "requested_credit_days": task.min_credit_days,
    }


def _seller_inputs(
    db: Session,
    task: Task,
    agent: Agent,
    profile: SellerProfile,
    references: dict[str, Product],
) -> tuple[SellerRequest, SellerContext]:
    lines = tuple(
        QuoteLine(
            product_id=str(references[str(line["sku"])].id),
            sku=str(line["sku"]),
            quantity=Decimal(str(line["quantity"])),
            unit=str(line["unit"]),
            reference_price=references[str(line["sku"])].benchmark_price,
        )
        for line in task.lines
    )
    policy = db.get(PrincipalProcurementPolicy, task.principal_id)
    if policy is None:
        raise tasks.TaskConflictError
    stock = []
    for line in lines:
        item = db.get(Inventory, (agent.principal_id, agent.id, UUID(line.product_id)))
        stock.append(item.available_qty - item.reserved_qty if item is not None else Decimal(0))
    return (
        SellerRequest(
            lines, as_utc(task.delivery_deadline), as_utc(task.expires_at), policy.credit_score
        ),
        SellerContext(
            agent.strategy_profile,
            profile.delivery_days,
            tuple(profile.credit_days),
            tuple(stock),
            bool(profile.public_policies.get("simulate_timeout")),
        ),
    )


def validate_offer(
    db: Session,
    task: Task,
    negotiation: Negotiation,
    terms: OfferTerms,
    references: dict[str, Product],
) -> ValidationResult:
    checks: list[dict[str, object]] = []
    flags: list[dict[str, object]] = []

    def check(rule: str, passed: bool, explanation: str) -> None:
        checks.append({"rule": rule, "passed": passed, "explanation": explanation})

    requested = {str(line["sku"]): line for line in task.lines}
    check(
        "sku_coverage",
        len(terms.lines) == len(requested) and {line.sku for line in terms.lines} == set(requested),
        "Exact SKU coverage required",
    )
    arithmetic = sum((line.line_total for line in terms.lines), Decimal(0))
    check(
        "arithmetic",
        arithmetic == terms.total
        and all(
            (line.quantity * line.unit_price).quantize(MONEY) == line.line_total
            for line in terms.lines
        ),
        "Structured totals recomputed by backend",
    )
    check("budget", terms.total <= task.budget_inr, "Offer must fit the authorized buyer mandate")
    now = datetime.now(UTC)
    check(
        "delivery",
        now < terms.delivery_at <= as_utc(task.delivery_deadline),
        "Delivery must be future-dated and meet the task deadline",
    )
    check(
        "expiry",
        terms.expires_at > now
        and terms.expires_at <= as_utc(task.expires_at)
        and as_utc(task.expires_at) > now,
        "Offer and mandate must remain active",
    )
    policy = db.get(PrincipalProcurementPolicy, task.principal_id)
    expected_payment_type = {
        0: "advance_upi",
        7: "credit_net_7",
        15: "credit_net_15",
        30: "credit_net_30",
    }.get(terms.payment_terms.credit_days)
    check(
        "payment_terms",
        policy is not None
        and task.min_credit_days <= terms.payment_terms.credit_days <= policy.max_credit_days
        and terms.payment_terms.upfront_pct <= task.max_upfront_pct
        and terms.payment_terms.balance_due_days == terms.payment_terms.credit_days
        and terms.payment_terms.type == expected_payment_type
        and (terms.payment_terms.credit_days > 0 or terms.payment_terms.upfront_pct == 100),
        "Payment terms must fit principal and task limits",
    )
    agent = db.get(Agent, negotiation.seller_agent_id)
    floor = FLOORS.get(agent.strategy_profile if agent else "default", Decimal(1))
    stock_ok, floors_ok, quantities_ok, identity_ok, discount_ok = True, True, True, True, True
    for line in terms.lines:
        product = references.get(line.sku)
        requested_line = requested.get(line.sku)
        if product is None or requested_line is None:
            stock_ok = quantities_ok = floors_ok = identity_ok = discount_ok = False
            continue
        quantities_ok &= line.unit == product.unit and line.quantity == Decimal(
            str(requested_line["quantity"])
        )
        identity_ok &= line.product_id == product.id and product.active
        computed_discount = (
            (line.claimed_original_price - line.unit_price) / line.claimed_original_price * 100
        ).quantize(MONEY)
        discount_ok &= computed_discount == line.claimed_discount_pct
        stock = db.get(
            Inventory, (negotiation.seller_principal_id, negotiation.seller_agent_id, product.id)
        )
        stock_ok &= stock is not None and stock.available_qty - stock.reserved_qty >= line.quantity
        floors_ok &= line.unit_price >= (product.benchmark_price * floor).quantize(MONEY)
        if line.claimed_original_price > product.benchmark_price * Decimal("1.20") or (
            line.claimed_discount_pct > 0 and line.unit_price > product.benchmark_price
        ):
            flags.append(
                {
                    "type": "fake_discount",
                    "sku": line.sku,
                    "benchmark_price": str(product.benchmark_price),
                    "claimed_original_price": str(line.claimed_original_price),
                    "offer_price": str(line.unit_price),
                    "rule": "trusted_reference_price",
                    "action": "ignore_claimed_savings_review_signal",
                }
            )
    check(
        "product_identity",
        identity_ok,
        "Product IDs and active SKUs must match trusted catalogue",
    )
    check(
        "discount_math",
        discount_ok,
        "Claimed discount must match structured original and offer prices",
    )
    check("quantity_unit", quantities_ok, "Quantities and units must match the requested basket")
    check("stock", stock_ok, "Unreserved inventory must cover every line")
    check(
        "seller_floor",
        floors_ok,
        "Seller minimum policy enforced without disclosing its private floor",
    )
    classification = classify_seller_note(terms.seller_note)
    suspicious = classification.category == "suspicious_instruction"
    if suspicious:
        flags.append(
            {
                "type": "prompt_injection",
                "rule": "tool_less_untrusted_note_classifier",
                "evidence": terms.seller_note[:300],
                "blocked_actions": list(classification.blocked_actions),
                "matched_rules": [item.rule for item in classification.evidence],
                "action": "instructions_blocked_no_tools_or_secrets",
            }
        )
    check(
        "security_policy",
        not suspicious,
        "Seller notes cannot change tools, authority or payment permissions",
    )
    return {
        "valid": all(bool(item["passed"]) for item in checks),
        "checks": checks,
        "flags": flags,
        "note_classification": "suspicious_instruction" if suspicious else "commercial_note",
    }


def _incident(db: Session, task: Task, neg: Negotiation, flag: dict[str, object]) -> None:
    event = record_event(
        db,
        task.principal_id,
        task.agent_id,
        "security.detected",
        "negotiation",
        neg.id,
        {"seller_principal_id": str(neg.seller_principal_id), **flag},
        actor_type="agent",
    )
    db.add(
        SecurityIncident(
            principal_id=neg.seller_principal_id,
            agent_id=neg.seller_agent_id,
            task_id=task.id,
            event_id=event.id,
            incident_type=str(flag["type"]),
            evidence=flag,
            action=str(flag["action"]),
        )
    )


def rank_offers(db: Session, task: Task, offers: list[Offer]) -> None:
    valid = [offer for offer in offers if offer.valid]
    if not valid:
        return
    cheapest = min(offer.total for offer in valid)
    for offer in valid:
        neg = db.get(Negotiation, offer.negotiation_id)
        if neg is None:
            continue
        terms = OfferTerms.model_validate(offer.terms)
        reliability_score, count, sources = reliability(
            db, task.principal_id, neg.seller_principal_id
        )
        days = max(
            Decimal(0),
            Decimal(str((terms.delivery_at - datetime.now(UTC)).total_seconds() / 86400)),
        )
        factors = {
            "price": cheapest / offer.total,
            "reliability": reliability_score,
            "delivery": max(Decimal(0), Decimal(1) - days / Decimal(30)),
            "credit": (
                Decimal(terms.payment_terms.credit_days) / Decimal(30)
                + (Decimal(100) - terms.payment_terms.upfront_pct) / Decimal(100)
            )
            / Decimal(2),
            "availability": Decimal(1),
        }
        contributions = []
        score = Decimal(0)
        for factor, weight_text in task.priorities.items():
            weight = Decimal(weight_text)
            normalized = factors[factor]
            score += weight * normalized
            contributions.append(
                {
                    "factor": factor,
                    "weight": str(weight),
                    "normalized": str(normalized.quantize(Decimal("0.0001"))),
                    "contribution": str((weight * normalized).quantize(Decimal("0.0001"))),
                }
            )
        offer.ranking = {
            "score": str(score.quantize(Decimal("0.0001"))),
            "factors": contributions,
            "reliability_evidence_count": count,
            "source_event_ids": sources,
            "history_confidence": "limited" if count == 0 else "evidence_backed",
        }


async def launch_task(
    db: Session, context: AuthContext, task_id: UUID, settings: Settings
) -> NegotiationListResponse:
    task = tasks._get_task_record(db, context, task_id, lock=True)
    principal = tasks._member_principal(db, context, task.principal_id, manage=True)
    tasks._validate_agent(db, principal, task.agent_id)
    policy = db.get(PrincipalProcurementPolicy, task.principal_id)
    if (
        policy is None
        or task.budget_inr > policy.max_budget_inr
        or task.max_rounds > policy.max_rounds
        or task.min_credit_days > policy.max_credit_days
    ):
        raise tasks.TaskForbiddenError
    if task.status != "created" or as_utc(task.expires_at) <= datetime.now(UTC):
        raise tasks.TaskConflictError
    if (
        not {"request_quote", "evaluate_offers"} <= set(task.permitted_actions)
        or "marketplace_search" not in task.allowed_tools
    ):
        raise tasks.TaskForbiddenError
    sellers = list_sellers(db, 100, 0, None, None, None).items
    if len(sellers) < 3:
        raise tasks.TaskConflictError
    task.status = "running"
    references = {
        product.sku: product
        for product in db.scalars(select(Product).where(Product.active.is_(True)))
    }
    negotiations = []
    for seller in sellers:
        selected = seller.agents[0]
        neg = Negotiation(
            task_id=task.id,
            buyer_agent_id=task.agent_id,
            seller_agent_id=selected.agent_id,
            buyer_principal_id=task.principal_id,
            seller_principal_id=seller.principal_id,
            state="created",
            round_no=0,
        )
        db.add(neg)
        db.flush()
        negotiations.append(neg)
        record_event(
            db,
            task.principal_id,
            task.agent_id,
            "discovery.seller",
            "negotiation",
            neg.id,
            {"seller_principal_id": str(seller.principal_id)},
            actor_type="agent",
        )
    db.flush()
    for round_no in range(1, task.max_rounds + 1):
        jobs = []
        active = []
        for neg in negotiations:
            if neg.state not in {"created", "counter_pending"}:
                continue
            agent = db.get(Agent, neg.seller_agent_id)
            profile = db.get(SellerProfile, neg.seller_principal_id)
            if agent is None or profile is None:
                transition(neg, "invalid")
                continue
            transition(neg, "rfq_sent")
            neg.round_no = round_no
            try:
                send_message(
                    db,
                    neg,
                    task.agent_id,
                    agent.id,
                    "REQUEST_FOR_QUOTE",
                    _rfq(task),
                    settings,
                )
            except (ProtocolError, AgentNotFoundError, AgentStateError, KeyDecryptionError) as exc:
                # Isolate an unavailable/revoked seller; do not claim a successful RFQ.
                neg.state = "invalid"
                record_event(
                    db,
                    task.principal_id,
                    task.agent_id,
                    "negotiation.sender_unavailable",
                    "negotiation",
                    neg.id,
                    {"exception_type": type(exc).__name__},
                    actor_type="agent",
                )
                continue
            record_event(
                db,
                task.principal_id,
                task.agent_id,
                "rfq.sent",
                "negotiation",
                neg.id,
                {"round": round_no, "seller_principal_id": str(neg.seller_principal_id)},
                actor_type="agent",
            )
            seller_request, seller_context = _seller_inputs(db, task, agent, profile, references)
            active.append(neg)
            jobs.append(
                asyncio.wait_for(draft_offer(seller_request, seller_context, round_no), timeout=0.5)
            )
        results = await asyncio.gather(*jobs, return_exceptions=True)
        round_offers: list[Offer] = []
        for neg, result in zip(active, results, strict=True):
            if isinstance(result, BaseException):
                transition(neg, "expired")
                record_event(
                    db,
                    task.principal_id,
                    task.agent_id,
                    "seller.timeout_or_failure",
                    "negotiation",
                    neg.id,
                    {"exception_type": type(result).__name__},
                    actor_type="agent",
                )
                continue
            try:
                send_message(
                    db,
                    neg,
                    neg.seller_agent_id,
                    task.agent_id,
                    "FINAL_OFFER" if round_no == task.max_rounds else "OFFER",
                    result.model_dump(mode="json"),
                    settings,
                )
            except (ProtocolError, AgentNotFoundError, AgentStateError, KeyDecryptionError) as exc:
                neg.state = "invalid"
                record_event(
                    db,
                    task.principal_id,
                    task.agent_id,
                    "signature.rejected",
                    "negotiation",
                    neg.id,
                    {"exception_type": type(exc).__name__},
                    actor_type="agent",
                )
                continue
            transition(neg, "offer_received")
            transition(neg, "evaluating")
            validation = validate_offer(db, task, neg, result, references)
            offer = Offer(
                negotiation_id=neg.id,
                version=round_no,
                terms=result.model_dump(mode="json"),
                terms_hash=content_hash(result.model_dump(mode="json")),
                total=result.total,
                validation=validation,
                valid=bool(validation["valid"]),
                ranking={},
                expires_at=result.expires_at,
            )
            db.add(offer)
            db.flush()
            for flag in validation["flags"]:
                _incident(db, task, neg, flag)
            record_event(
                db,
                task.principal_id,
                task.agent_id,
                "offer.validated",
                "offer",
                offer.id,
                {
                    "valid": offer.valid,
                    "round": round_no,
                    "total": str(offer.total),
                    "checks": validation["checks"],
                },
                actor_type="agent",
            )
            round_offers.append(offer)
            if not offer.valid:
                transition(neg, "invalid")
        rank_offers(db, task, round_offers)
        price_vectors: dict[str, list[Negotiation]] = {}
        for offer in round_offers:
            if offer.valid:
                vector = content_hash(
                    [str(line.unit_price) for line in OfferTerms.model_validate(offer.terms).lines]
                )
                offer_neg = db.get(Negotiation, offer.negotiation_id)
                if offer_neg is not None:
                    price_vectors.setdefault(vector, []).append(offer_neg)
        for group in price_vectors.values():
            if len({neg.seller_principal_id for neg in group}) > 1:
                for neg in group:
                    _incident(
                        db,
                        task,
                        neg,
                        {
                            "type": "collusion_signal",
                            "rule": "identical_price_vectors_across_principals",
                            "evidence": "Matching quote vectors are a review signal, not proof",
                            "action": "review_only",
                        },
                    )
        if round_no < task.max_rounds:
            valid = sorted(
                (offer for offer in round_offers if offer.valid), key=lambda item: item.total
            )
            for neg in negotiations:
                if neg.state == "evaluating":
                    benchmark = {
                        "round": round_no + 1,
                        "request": "improve structured price/credit/delivery within your policy",
                    }
                    if valid and "benchmark_compare" in task.allowed_tools:
                        benchmark["anonymous_benchmark_total"] = str(valid[0].total)
                    try:
                        send_message(
                            db,
                            neg,
                            task.agent_id,
                            neg.seller_agent_id,
                            "COUNTER_OFFER",
                            benchmark,
                            settings,
                        )
                    except (
                        ProtocolError,
                        AgentNotFoundError,
                        AgentStateError,
                        KeyDecryptionError,
                    ) as exc:
                        neg.state = "invalid"
                        record_event(
                            db,
                            task.principal_id,
                            task.agent_id,
                            "counter.failed",
                            "negotiation",
                            neg.id,
                            {"exception_type": type(exc).__name__},
                            actor_type="agent",
                        )
                        continue
                    transition(neg, "counter_pending")
        db.flush()
    latest_offers: list[Offer] = []
    for neg in negotiations:
        latest = db.scalar(
            select(Offer)
            .where(Offer.negotiation_id == neg.id)
            .order_by(Offer.version.desc())
            .limit(1)
        )
        if latest is not None and latest.valid and neg.state == "evaluating":
            latest_offers.append(latest)
    rank_offers(db, task, latest_offers)
    eligible = latest_offers
    if not eligible:
        task.status = "failed"
    event = record_event(
        db,
        task.principal_id,
        task.agent_id,
        "task.negotiation_finished",
        "task",
        task.id,
        {"seller_count": len(negotiations), "valid_offer_count": len(eligible)},
        actor_type="agent",
    )
    notify_members(
        db,
        task.principal_id,
        event,
        f"VANIK: negotiation finished with {len(eligible)} valid offers. "
        "Human approval is required before mock settlement.",
    )
    db.commit()
    return task_negotiations(db, context, task.id)


def offer_response(offer: Offer, neg: Negotiation) -> OfferResponse:
    return OfferResponse(
        id=offer.id,
        negotiation_id=neg.id,
        seller_principal_id=neg.seller_principal_id,
        seller_agent_id=neg.seller_agent_id,
        version=offer.version,
        terms=OfferTerms.model_validate(offer.terms),
        terms_hash=offer.terms_hash,
        valid=offer.valid,
        validation=offer.validation,
        ranking=offer.ranking,
    )


def negotiation_response(db: Session, neg: Negotiation) -> NegotiationResponse:
    offers = list(
        db.scalars(select(Offer).where(Offer.negotiation_id == neg.id).order_by(Offer.version))
    )
    messages = db.scalars(
        select(AgentMessage)
        .where(AgentMessage.negotiation_id == neg.id)
        .order_by(AgentMessage.created_at)
    )
    return NegotiationResponse(
        id=neg.id,
        task_id=neg.task_id,
        seller_principal_id=neg.seller_principal_id,
        seller_agent_id=neg.seller_agent_id,
        state=neg.state,
        round_no=neg.round_no,
        offers=[offer_response(offer, neg) for offer in offers],
        messages=[AgentEnvelope.model_validate(message.envelope) for message in messages],
    )


def task_negotiations(db: Session, context: AuthContext, task_id: UUID) -> NegotiationListResponse:
    tasks.get_task(db, context, task_id)
    negotiations = list(
        db.scalars(
            select(Negotiation)
            .where(Negotiation.task_id == task_id)
            .order_by(Negotiation.created_at)
        )
    )
    responses = [negotiation_response(db, neg) for neg in negotiations]
    comparable = []
    now = datetime.now(UTC)
    for response in responses:
        latest = max(response.offers, key=lambda item: item.version, default=None)
        if (
            latest is not None
            and latest.valid
            and latest.ranking
            and response.state in {"evaluating", "deal_locked"}
            and latest.terms.expires_at > now
        ):
            comparable.append(latest)
    recommended = (
        max(
            comparable,
            key=lambda item: (Decimal(str(item.ranking["score"])), -item.version),
        )
        if comparable
        else None
    )
    return NegotiationListResponse(
        task_id=task_id,
        items=responses,
        recommendation_offer_id=recommended.id if recommended else None,
    )
