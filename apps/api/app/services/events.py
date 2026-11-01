from datetime import UTC, datetime, timedelta
from decimal import Decimal
from uuid import UUID

from sqlalchemy import and_, or_, select
from sqlalchemy.orm import Session

from app.contracts.workflow import (
    EventResponse,
    MemoryCorrectionRequest,
    MemoryDisputeRequest,
    NotificationListResponse,
    NotificationResponse,
    ReplayResponse,
    SecurityIncidentListResponse,
    SecurityIncidentResponse,
    SupplierMemoryListResponse,
    SupplierMemoryResponse,
)
from app.db.models import AuditEvent, PrincipalMember, SellerProfile, TelegramLink, User
from app.db.workflow_models import (
    Deal,
    Negotiation,
    Notification,
    Offer,
    ProactiveTrigger,
    SecurityIncident,
    SupplierMemory,
)
from app.services.auth import AuthContext, as_utc


def _require_member(db: Session, principal_id: UUID, user_id: UUID) -> PrincipalMember:
    member = db.get(PrincipalMember, (principal_id, user_id))
    if member is None or member.status != "active":
        raise LookupError("Principal not found")
    return member


def _refresh_reliability(db: Session, seller_id: UUID) -> None:
    profile = db.get(SellerProfile, seller_id)
    if profile is None:
        return
    facts = list(
        db.scalars(
            select(SupplierMemory).where(
                SupplierMemory.seller_principal_id == seller_id,
                SupplierMemory.status.in_(["verified", "corrected"]),
                SupplierMemory.memory_type == "delivery",
                SupplierMemory.confidence > 0,
            )
        )
    )
    weight = sum((item.confidence for item in facts), Decimal(0))
    profile.reliability_score = (
        sum((item.score * item.confidence for item in facts), Decimal(0)) / weight
        if weight
        else None
    )
    profile.reliability_evidence_count = len(facts)


def record_event(
    db: Session,
    principal_id: UUID,
    actor_id: UUID,
    event_type: str,
    entity_type: str,
    entity_id: UUID,
    payload: dict[str, object],
    *,
    actor_type: str = "human",
) -> AuditEvent:
    event = AuditEvent(
        principal_id=principal_id,
        actor_type=actor_type,
        actor_id=actor_id,
        event_type=event_type,
        entity_type=entity_type,
        entity_id=entity_id,
        payload=payload,
    )
    db.add(event)
    db.flush()
    return event


def notify_members(db: Session, principal_id: UUID, event: AuditEvent, text: str) -> None:
    members = db.scalars(
        select(PrincipalMember).where(
            PrincipalMember.principal_id == principal_id, PrincipalMember.status == "active"
        )
    )
    for member in members:
        if (
            db.scalar(
                select(Notification.id).where(
                    Notification.user_id == member.user_id, Notification.event_id == event.id
                )
            )
            is None
        ):
            db.add(Notification(user_id=member.user_id, event_id=event.id, text=text))


def reliability(db: Session, buyer_id: UUID, seller_id: UUID) -> tuple[Decimal, int, list[str]]:
    facts = list(
        db.scalars(
            select(SupplierMemory).where(
                SupplierMemory.buyer_principal_id == buyer_id,
                SupplierMemory.seller_principal_id == seller_id,
                SupplierMemory.status.in_(["verified", "corrected"]),
                SupplierMemory.memory_type == "delivery",
                SupplierMemory.confidence > 0,
            )
        )
    )
    if not facts:
        return Decimal("0.5"), 0, []
    confidence = sum((item.confidence for item in facts), Decimal(0))
    score = sum((item.score * item.confidence for item in facts), Decimal(0)) / confidence
    return score, len(facts), [str(item.event_id) for item in facts]


def record_delivery_memory(
    db: Session,
    buyer_id: UUID,
    seller_id: UUID,
    actor_id: UUID,
    late_days: int,
    *,
    synthetic: bool,
) -> SupplierMemory:
    score = max(Decimal(0), Decimal(1) - Decimal(late_days) / Decimal(5))
    event = record_event(
        db,
        buyer_id,
        actor_id,
        "supplier.delivery_recorded",
        "principal",
        seller_id,
        {"late_days": late_days, "synthetic": synthetic},
        actor_type="system",
    )
    memory = SupplierMemory(
        buyer_principal_id=buyer_id,
        seller_principal_id=seller_id,
        event_id=event.id,
        memory_type="delivery",
        score=score,
        confidence=Decimal("0.8"),
        evidence={
            "late_days": late_days,
            "synthetic": synthetic,
            "source": "seeded_demo_delivery" if synthetic else "verified_delivery",
        },
    )
    db.add(memory)
    db.flush()
    _refresh_reliability(db, seller_id)
    return memory


def process_proactive(db: Session, now: datetime | None = None) -> int:
    now = now or datetime.now(UTC)
    triggers = list(
        db.scalars(
            select(ProactiveTrigger)
            .where(
                ProactiveTrigger.processed_at.is_(None),
                ProactiveTrigger.due_at <= now,
            )
            .with_for_update(skip_locked=True)
        )
    )
    for trigger in triggers:
        event = record_event(
            db,
            trigger.principal_id,
            trigger.principal_id,
            "proactive.deadline_alert",
            "principal",
            trigger.principal_id,
            {"reason": trigger.reason, "scheduled": True},
            actor_type="system",
        )
        notify_members(db, trigger.principal_id, event, f"VANIK proactive alert: {trigger.reason}")
        trigger.processed_at = now
    db.commit()
    return len(triggers)


def replay(db: Session, context: AuthContext, task_id: UUID) -> ReplayResponse:
    from app.db.task_models import Task

    task = db.get(Task, task_id)
    if task is None:
        raise LookupError("Task not found")
    _require_member(db, task.principal_id, context.user.id)
    negotiation_ids = set(db.scalars(select(Negotiation.id).where(Negotiation.task_id == task.id)))
    offer_ids = (
        set(db.scalars(select(Offer.id).where(Offer.negotiation_id.in_(negotiation_ids))))
        if negotiation_ids
        else set()
    )
    deal_ids = set(db.scalars(select(Deal.id).where(Deal.task_id == task.id)))
    candidates = db.scalars(
        select(AuditEvent)
        .where(AuditEvent.principal_id == task.principal_id)
        .order_by(AuditEvent.created_at, AuditEvent.id)
    )
    events = [
        event
        for event in candidates
        if event.entity_id == task.id
        or str(event.payload.get("task_id", "")) == str(task.id)
        or (event.entity_type == "negotiation" and event.entity_id in negotiation_ids)
        or (event.entity_type == "offer" and event.entity_id in offer_ids)
        or (event.entity_type == "deal" and event.entity_id in deal_ids)
    ]
    return ReplayResponse(
        task_id=task.id,
        events=[
            EventResponse(
                id=event.id,
                event_type=event.event_type,
                actor_type=event.actor_type,
                entity_type=event.entity_type,
                entity_id=event.entity_id,
                payload=event.payload,
                created_at=as_utc(event.created_at),
            )
            for event in events
        ],
    )


def security_for_task(
    db: Session, context: AuthContext, task_id: UUID
) -> SecurityIncidentListResponse:
    from app.db.task_models import Task

    task = db.get(Task, task_id)
    if task is None:
        raise LookupError("Task not found")
    _require_member(db, task.principal_id, context.user.id)
    rows = db.scalars(
        select(SecurityIncident)
        .where(SecurityIncident.task_id == task_id)
        .order_by(SecurityIncident.created_at, SecurityIncident.id)
    )
    return SecurityIncidentListResponse(
        items=[
            SecurityIncidentResponse(
                id=item.id,
                incident_type=item.incident_type,
                agent_id=item.agent_id,
                principal_id=item.principal_id,
                evidence=item.evidence,
                action=item.action,
                status=item.status,
                created_at=as_utc(item.created_at),
            )
            for item in rows
        ]
    )


def memories(db: Session, context: AuthContext, principal_id: UUID) -> SupplierMemoryListResponse:
    _require_member(db, principal_id, context.user.id)
    rows = db.scalars(
        select(SupplierMemory)
        .where(SupplierMemory.buyer_principal_id == principal_id)
        .order_by(SupplierMemory.created_at.desc())
    )
    return SupplierMemoryListResponse(
        items=[
            SupplierMemoryResponse(
                id=item.id,
                seller_principal_id=item.seller_principal_id,
                event_id=item.event_id,
                memory_type=item.memory_type,
                score=item.score,
                confidence=item.confidence,
                evidence=item.evidence,
                status=item.status,
                created_at=as_utc(item.created_at),
            )
            for item in rows
        ]
    )


def dispute_memory(
    db: Session, context: AuthContext, memory_id: UUID, payload: MemoryDisputeRequest
) -> SupplierMemoryResponse:
    item = db.scalar(select(SupplierMemory).where(SupplierMemory.id == memory_id).with_for_update())
    if item is None:
        raise LookupError("Memory not found")
    member = _require_member(db, item.buyer_principal_id, context.user.id)
    if member.role not in {"owner", "admin", "operator"}:
        raise PermissionError("Memory dispute forbidden")
    item.status = "disputed"
    item.evidence = item.evidence | {"dispute_reason": payload.reason}
    record_event(
        db,
        item.buyer_principal_id,
        context.user.id,
        "memory.disputed",
        "memory",
        item.id,
        {"reason": payload.reason},
    )
    _refresh_reliability(db, item.seller_principal_id)
    db.commit()
    return SupplierMemoryResponse(
        id=item.id,
        seller_principal_id=item.seller_principal_id,
        event_id=item.event_id,
        memory_type=item.memory_type,
        score=item.score,
        confidence=item.confidence,
        evidence=item.evidence,
        status=item.status,
        created_at=as_utc(item.created_at),
    )


def correct_memory(
    db: Session, context: AuthContext, memory_id: UUID, payload: MemoryCorrectionRequest
) -> SupplierMemoryResponse:
    item = db.scalar(select(SupplierMemory).where(SupplierMemory.id == memory_id).with_for_update())
    if item is None:
        raise LookupError("Memory not found")
    member = db.get(PrincipalMember, (item.buyer_principal_id, context.user.id))
    if member is None or member.status != "active" or member.role not in {"owner", "admin"}:
        raise PermissionError("Memory correction forbidden")
    item.score = payload.score
    item.confidence = payload.confidence
    item.status = "corrected"
    item.evidence = item.evidence | {"correction_reason": payload.reason}
    original_event_id = item.event_id
    event = record_event(
        db,
        item.buyer_principal_id,
        context.user.id,
        "memory.corrected",
        "memory",
        item.id,
        {
            "reason": payload.reason,
            "score": str(payload.score),
            "confidence": str(payload.confidence),
            "source_event_id": str(original_event_id),
        },
    )
    item.evidence = item.evidence | {"source_event_id": str(original_event_id)}
    item.event_id = event.id
    _refresh_reliability(db, item.seller_principal_id)
    db.commit()
    return SupplierMemoryResponse(
        id=item.id,
        seller_principal_id=item.seller_principal_id,
        event_id=item.event_id,
        memory_type=item.memory_type,
        score=item.score,
        confidence=item.confidence,
        evidence=item.evidence,
        status=item.status,
        created_at=as_utc(item.created_at),
    )


def notification_list(db: Session, context: AuthContext) -> NotificationListResponse:
    rows = db.scalars(
        select(Notification)
        .where(Notification.user_id == context.user.id)
        .order_by(Notification.created_at.desc())
        .limit(100)
    )
    return NotificationListResponse(
        items=[
            NotificationResponse(
                id=item.id,
                text=item.text,
                status=item.status,
                created_at=as_utc(item.created_at),
            )
            for item in rows
        ]
    )


def claim_notifications(db: Session) -> list[dict[str, object]]:
    now = datetime.now(UTC)
    rows = list(
        db.scalars(
            select(Notification)
            .where(
                or_(
                    Notification.status.in_(["pending", "failed"]),
                    and_(
                        Notification.status == "sending",
                        or_(
                            Notification.claimed_at.is_(None),
                            Notification.claimed_at <= now - timedelta(minutes=5),
                        ),
                    ),
                )
            )
            .order_by(Notification.created_at)
            .limit(100)
            .with_for_update(skip_locked=True)
        )
    )
    result: list[dict[str, object]] = []
    for note in rows:
        event = db.get(AuditEvent, note.event_id)
        user = db.get(User, note.user_id)
        member = (
            db.get(PrincipalMember, (event.principal_id, note.user_id))
            if event is not None
            else None
        )
        if user is None or user.status != "active" or member is None or member.status != "active":
            continue
        link = db.scalar(
            select(TelegramLink).where(
                TelegramLink.user_id == note.user_id, TelegramLink.revoked_at.is_(None)
            )
        )
        if link is None:
            continue
        note.status = "sending"
        note.claimed_at = now
        result.append(
            {"id": str(note.id), "telegram_user_id": link.telegram_user_id, "text": note.text}
        )
    db.commit()
    return result


def ack_notification(db: Session, notification_id: UUID, delivered: bool) -> None:
    note = db.scalar(
        select(Notification).where(Notification.id == notification_id).with_for_update()
    )
    if note is None:
        raise LookupError("Notification not found")
    if note.status == "delivered":
        # A worker can lose the ACK response; never regress a delivered record.
        return
    if note.status not in {"sending", "failed"}:
        raise LookupError("Notification not found")
    note.status = "delivered" if delivered else "failed"
    note.delivered_at = datetime.now(UTC) if delivered else None
    db.commit()


def pending_notifications(db: Session) -> list[dict[str, object]]:
    rows = db.execute(
        select(Notification, TelegramLink)
        .join(
            TelegramLink,
            TelegramLink.user_id == Notification.user_id,
        )
        .where(Notification.status == "pending", TelegramLink.revoked_at.is_(None))
        .limit(100)
    )
    return [
        {"id": str(note.id), "telegram_user_id": link.telegram_user_id, "text": note.text}
        for note, link in rows
    ]


def user_notifications(db: Session, context: AuthContext) -> list[dict[str, object]]:
    notes = db.scalars(
        select(Notification)
        .where(Notification.user_id == context.user.id)
        .order_by(Notification.created_at.desc())
        .limit(100)
    )
    return [
        {
            "id": str(note.id),
            "text": note.text,
            "status": note.status,
            "created_at": as_utc(note.created_at).isoformat(),
        }
        for note in notes
    ]
