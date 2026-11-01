import base64
import hashlib
import secrets
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.contracts.workflow import (
    ApprovalChallengeResponse,
    ApproveRequest,
    DealResponse,
    OfferTerms,
    ReceiptResponse,
)
from app.core.config import Settings
from app.core.security import digest_token, token_matches
from app.db.models import Agent, Inventory, Principal, PrincipalMember
from app.db.task_models import Task
from app.db.workflow_models import (
    AgentMessage,
    Approval,
    Deal,
    MockPayment,
    Negotiation,
    Offer,
    Reservation,
)
from app.services.agents import verify_agent_payload
from app.services.auth import AuthContext, as_utc
from app.services.events import notify_members, record_event
from app.services.negotiation import transition
from app.services.protocol import canonical, send_message


class DealNotFoundError(Exception):
    pass


class DealForbiddenError(Exception):
    pass


class DealConflictError(Exception):
    pass


def _hash(value: object) -> str:
    return hashlib.sha256(canonical(value)).hexdigest()


def _membership(db: Session, context: AuthContext, principal_id: UUID, *, approve: bool) -> None:
    member = db.get(PrincipalMember, (principal_id, context.user.id))
    if member is None or member.status != "active":
        raise DealNotFoundError
    allowed = {"owner", "admin"} if approve else {"owner", "admin", "operator"}
    if member.role not in allowed:
        raise DealForbiddenError


def deal_response(deal: Deal) -> DealResponse:
    return DealResponse(
        id=deal.id,
        task_id=deal.task_id,
        version=deal.version,
        status=deal.status,
        buyer_principal_id=deal.buyer_principal_id,
        seller_principal_id=deal.seller_principal_id,
        amount=deal.amount,
        snapshot=deal.snapshot,
        terms_hash=deal.terms_hash,
        expires_at=as_utc(deal.expires_at),
    )


def _active_participants(db: Session, deal: Deal) -> None:
    task = db.get(Task, deal.task_id)
    if task is None:
        raise DealConflictError
    for principal_id, agent_id in (
        (deal.buyer_principal_id, task.agent_id),
        (deal.seller_principal_id, UUID(str(deal.snapshot["seller_agent_id"]))),
    ):
        principal = db.get(Principal, principal_id)
        agent = db.get(Agent, agent_id)
        if (
            principal is None
            or principal.status != "active"
            or principal.verification_status != "demo_verified"
            or agent is None
            or agent.status != "active"
        ):
            raise DealConflictError
    if _hash(deal.snapshot) != deal.terms_hash:
        raise DealConflictError


def accept_offer(
    db: Session,
    context: AuthContext,
    negotiation_id: UUID,
    offer_id: UUID,
    settings: Settings,
) -> DealResponse:
    negotiation = db.scalar(
        select(Negotiation).where(Negotiation.id == negotiation_id).with_for_update()
    )
    offer = db.get(Offer, offer_id)
    if negotiation is None or offer is None or offer.negotiation_id != negotiation.id:
        raise DealNotFoundError
    task = db.scalar(select(Task).where(Task.id == negotiation.task_id).with_for_update())
    if task is None:
        raise DealNotFoundError
    _membership(db, context, task.principal_id, approve=False)
    now = datetime.now(UTC)
    if (
        not offer.valid
        or negotiation.state != "evaluating"
        or as_utc(offer.expires_at) <= now
        or as_utc(task.expires_at) <= now
        or task.status != "running"
    ):
        raise DealConflictError
    latest = db.scalar(
        select(Offer)
        .where(Offer.negotiation_id == negotiation.id)
        .order_by(Offer.version.desc())
        .limit(1)
    )
    if _hash(offer.terms) != offer.terms_hash:
        raise DealConflictError
    final_message = db.scalar(
        select(AgentMessage)
        .where(
            AgentMessage.negotiation_id == negotiation.id,
            AgentMessage.message_type == "FINAL_OFFER",
            AgentMessage.sender_agent_id == negotiation.seller_agent_id,
        )
        .order_by(AgentMessage.created_at.desc())
        .limit(1)
    )
    if latest is None or latest.id != offer.id or final_message is None:
        raise DealConflictError
    from app.contracts.workflow import AgentEnvelope

    envelope = AgentEnvelope.model_validate(final_message.envelope)
    if (
        envelope.payload_hash != offer.terms_hash
        or _hash(envelope.payload) != offer.terms_hash
        or not verify_agent_payload(
            db,
            negotiation.seller_agent_id,
            envelope.key_version,
            base64.b64decode(envelope.signature),
            canonical(envelope.model_dump(mode="json", exclude={"signature"})),
        )
    ):
        raise DealConflictError
    send_message(
        db,
        negotiation,
        negotiation.buyer_agent_id,
        negotiation.seller_agent_id,
        "ACCEPT",
        {"offer_id": str(offer.id), "terms_hash": offer.terms_hash},
        settings,
    )
    existing = db.scalar(select(Deal).where(Deal.task_id == task.id))
    if existing is not None:
        return deal_response(existing)
    terms = OfferTerms.model_validate(offer.terms)
    for line in terms.lines:
        inventory = db.scalar(
            select(Inventory)
            .where(
                Inventory.principal_id == negotiation.seller_principal_id,
                Inventory.agent_id == negotiation.seller_agent_id,
                Inventory.product_id == line.product_id,
            )
            .with_for_update()
        )
        if inventory is None or inventory.available_qty - inventory.reserved_qty < line.quantity:
            raise DealConflictError
        inventory.reserved_qty += line.quantity
    snapshot = {
        "buyer_principal_id": str(task.principal_id),
        "seller_principal_id": str(negotiation.seller_principal_id),
        "seller_agent_id": str(negotiation.seller_agent_id),
        "offer_id": str(offer.id),
        "line_items": [line.model_dump(mode="json") for line in terms.lines],
        "amount": str(terms.total),
        "currency": "INR",
        "delivery_at": terms.delivery_at.isoformat(),
        "payment_terms": terms.payment_terms.model_dump(mode="json"),
        "payment_destination": f"mock-upi://principal/{negotiation.seller_principal_id}",
        "simulation": True,
    }
    deal = Deal(
        task_id=task.id,
        final_offer_id=offer.id,
        buyer_principal_id=task.principal_id,
        seller_principal_id=negotiation.seller_principal_id,
        amount=terms.total,
        snapshot=snapshot,
        terms_hash=_hash(snapshot),
        expires_at=min(as_utc(task.expires_at), as_utc(offer.expires_at)),
    )
    db.add(deal)
    db.flush()
    for line in terms.lines:
        db.add(
            Reservation(
                deal_id=deal.id,
                principal_id=negotiation.seller_principal_id,
                agent_id=negotiation.seller_agent_id,
                product_id=line.product_id,
                quantity=line.quantity,
                active=True,
            )
        )
    transition(negotiation, "accepted")
    transition(negotiation, "deal_locked")
    task.status = "awaiting_approval"
    event = record_event(
        db,
        task.principal_id,
        context.user.id,
        "deal.locked",
        "deal",
        deal.id,
        {"version": 1, "terms_hash": deal.terms_hash, "amount": str(deal.amount)},
    )
    notify_members(
        db, task.principal_id, event, "VANIK: exact deal terms locked; human approval required."
    )
    db.commit()
    db.refresh(deal)
    return deal_response(deal)


def list_deals(db: Session, context: AuthContext) -> list[DealResponse]:
    rows = db.execute(
        select(Deal)
        .join(PrincipalMember, PrincipalMember.principal_id == Deal.buyer_principal_id)
        .where(PrincipalMember.user_id == context.user.id, PrincipalMember.status == "active")
        .order_by(Deal.created_at.desc())
    )
    return [deal_response(deal) for deal in rows.scalars()]


def get_deal(db: Session, context: AuthContext, deal_id: UUID) -> Deal:
    deal = db.get(Deal, deal_id)
    if deal is None:
        raise DealNotFoundError
    _membership(db, context, deal.buyer_principal_id, approve=False)
    return deal


def approval_challenge(
    db: Session, context: AuthContext, deal_id: UUID
) -> ApprovalChallengeResponse:
    deal = get_deal(db, context, deal_id)
    _membership(db, context, deal.buyer_principal_id, approve=True)
    _active_participants(db, deal)
    now = datetime.now(UTC)
    if deal.status != "locked" or as_utc(deal.expires_at) <= now:
        raise DealConflictError
    nonce = secrets.token_urlsafe(32)
    approval = Approval(
        deal_id=deal.id,
        deal_version=deal.version,
        user_id=context.user.id,
        nonce_hash=digest_token(nonce),
        terms_hash=deal.terms_hash,
        expires_at=min(as_utc(deal.expires_at), now + timedelta(minutes=10)),
    )
    db.add(approval)
    db.commit()
    db.refresh(approval)
    return ApprovalChallengeResponse(
        challenge_id=approval.id,
        deal_id=deal.id,
        deal_version=deal.version,
        terms_hash=deal.terms_hash,
        nonce=nonce,
        expires_at=as_utc(approval.expires_at),
    )


def approve(
    db: Session, context: AuthContext, deal_id: UUID, payload: ApproveRequest
) -> DealResponse:
    deal = db.scalar(select(Deal).where(Deal.id == deal_id).with_for_update())
    approval = db.scalar(
        select(Approval).where(Approval.id == payload.challenge_id).with_for_update()
    )
    if deal is None or approval is None or approval.deal_id != deal_id:
        raise DealNotFoundError
    _membership(db, context, deal.buyer_principal_id, approve=True)
    _active_participants(db, deal)
    now = datetime.now(UTC)
    if (
        as_utc(deal.expires_at) <= now
        or deal.status != "locked"
        or deal.version != payload.deal_version
        or deal.terms_hash != payload.terms_hash
        or approval.deal_version != deal.version
        or approval.terms_hash != deal.terms_hash
        or approval.user_id != context.user.id
        or approval.used_at is not None
        or as_utc(approval.expires_at) <= now
        or not token_matches(payload.nonce, approval.nonce_hash)
    ):
        raise DealConflictError
    approval.used_at = now
    deal.status = "approved"
    deal.approved_hash = deal.terms_hash
    record_event(
        db,
        deal.buyer_principal_id,
        context.user.id,
        "deal.approved",
        "deal",
        deal.id,
        {"version": deal.version, "terms_hash": deal.terms_hash},
    )
    db.commit()
    return deal_response(deal)


def _release(db: Session, deal: Deal, *, consume: bool) -> None:
    reservations = db.scalars(
        select(Reservation)
        .where(Reservation.deal_id == deal.id, Reservation.active.is_(True))
        .with_for_update()
    )
    for reservation in reservations:
        inventory = db.scalar(
            select(Inventory)
            .where(
                Inventory.principal_id == reservation.principal_id,
                Inventory.agent_id == reservation.agent_id,
                Inventory.product_id == reservation.product_id,
            )
            .with_for_update()
        )
        if inventory is None or inventory.reserved_qty < reservation.quantity:
            raise DealConflictError
        inventory.reserved_qty -= reservation.quantity
        if consume:
            inventory.available_qty -= reservation.quantity
        reservation.active = False


def reject(db: Session, context: AuthContext, deal_id: UUID) -> DealResponse:
    deal = db.scalar(select(Deal).where(Deal.id == deal_id).with_for_update())
    if deal is None:
        raise DealNotFoundError
    _membership(db, context, deal.buyer_principal_id, approve=True)
    if deal.status not in {"locked", "approved"}:
        raise DealConflictError
    _release(db, deal, consume=False)
    deal.status = "rejected"
    task = db.get(Task, deal.task_id)
    if task is not None:
        task.status = "cancelled"
    record_event(
        db,
        deal.buyer_principal_id,
        context.user.id,
        "deal.rejected",
        "deal",
        deal.id,
        {"version": deal.version},
    )
    db.commit()
    return deal_response(deal)


def settle(
    db: Session,
    context: AuthContext,
    deal_id: UUID,
    idempotency_key: str,
) -> ReceiptResponse:
    deal = db.scalar(select(Deal).where(Deal.id == deal_id).with_for_update())
    if deal is None:
        raise DealNotFoundError
    _membership(db, context, deal.buyer_principal_id, approve=True)
    existing = db.scalar(select(MockPayment).where(MockPayment.idempotency_key == idempotency_key))
    if existing is not None:
        if existing.deal_id != deal_id:
            raise DealConflictError
        return receipt(existing, deal)
    _active_participants(db, deal)
    now = datetime.now(UTC)
    approval = db.scalar(
        select(Approval).where(
            Approval.deal_id == deal.id,
            Approval.deal_version == deal.version,
            Approval.terms_hash == deal.terms_hash,
            Approval.used_at.is_not(None),
        )
    )
    if (
        deal.status != "approved"
        or deal.approved_hash != deal.terms_hash
        or as_utc(deal.expires_at) <= now
        or approval is None
    ):
        raise DealConflictError
    terms = OfferTerms.model_validate(
        {
            "currency": deal.snapshot["currency"],
            "total": deal.snapshot["amount"],
            "lines": deal.snapshot["line_items"],
            "delivery_at": deal.snapshot["delivery_at"],
            "payment_terms": deal.snapshot["payment_terms"],
            "tax_representation": "not_modeled",
            "expires_at": as_utc(deal.expires_at),
            "seller_note": "",
        }
    )
    upfront = (deal.amount * terms.payment_terms.upfront_pct / Decimal(100)).quantize(
        Decimal("0.01")
    )
    payment = MockPayment(
        deal_id=deal.id,
        amount=upfront,
        currency="INR",
        idempotency_key=idempotency_key,
        reference=f"MOCK-UPI-{deal.id.hex[:16].upper()}",
        status="succeeded",
    )
    db.add(payment)
    db.flush()
    _release(db, deal, consume=True)
    deal.status = "settled"
    task = db.get(Task, deal.task_id)
    if task is not None:
        task.status = "completed"
    event = record_event(
        db,
        deal.buyer_principal_id,
        context.user.id,
        "payment.simulated",
        "deal",
        deal.id,
        {
            "payment_id": str(payment.id),
            "mock_reference": payment.reference,
            "amount": str(payment.amount),
            "no_real_funds": True,
        },
    )
    notify_members(
        db,
        deal.buyer_principal_id,
        event,
        f"VANIK: mock UPI succeeded for {payment.amount} INR. No real funds moved.",
    )
    db.commit()
    db.refresh(payment)
    return receipt(payment, deal)


def expire_deals(db: Session, now: datetime | None = None) -> int:
    now = now or datetime.now(UTC)
    expired = list(
        db.scalars(
            select(Deal)
            .where(
                Deal.status.in_(["locked", "approved"]),
                Deal.expires_at <= now,
            )
            .order_by(Deal.id)
            .with_for_update(skip_locked=True)
        )
    )
    for deal in expired:
        _release(db, deal, consume=False)
        deal.status = "expired"
        task = db.get(Task, deal.task_id)
        if task is not None:
            task.status = "expired"
        record_event(
            db,
            deal.buyer_principal_id,
            deal.buyer_principal_id,
            "deal.expired",
            "deal",
            deal.id,
            {"version": deal.version},
            actor_type="system",
        )
    db.commit()
    return len(expired)


def get_receipt(db: Session, context: AuthContext, deal_id: UUID) -> ReceiptResponse:
    deal = get_deal(db, context, deal_id)
    payment = db.scalar(select(MockPayment).where(MockPayment.deal_id == deal.id))
    if payment is None:
        raise DealNotFoundError
    return receipt(payment, deal)


def receipt(payment: MockPayment, deal: Deal | None) -> ReceiptResponse:
    if deal is None:
        raise DealNotFoundError
    return ReceiptResponse(
        id=payment.id,
        deal_id=deal.id,
        amount=payment.amount,
        contracted_total=deal.amount,
        balance_due=deal.amount - payment.amount,
        status="succeeded",
        reference=payment.reference,
        created_at=as_utc(payment.created_at),
    )
