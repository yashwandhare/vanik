from datetime import datetime
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.models import utc_now
from app.db.session import Base


class Negotiation(Base):
    __tablename__ = "negotiations"
    __table_args__ = (
        UniqueConstraint("task_id", "seller_principal_id", name="uq_negotiations_task_seller"),
        ForeignKeyConstraint(
            ["buyer_principal_id", "buyer_agent_id"],
            ["agents.principal_id", "agents.id"],
            ondelete="RESTRICT",
        ),
        ForeignKeyConstraint(
            ["seller_principal_id", "seller_agent_id"],
            ["agents.principal_id", "agents.id"],
            ondelete="RESTRICT",
        ),
        CheckConstraint("round_no >= 0", name="round"),
        CheckConstraint(
            "state IN ('created','rfq_sent','offer_received','evaluating','counter_pending',"
            "'accepted','deal_locked','invalid','expired','rejected','cancelled')",
            name="state",
        ),
    )
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    task_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("tasks.id", ondelete="RESTRICT"), index=True
    )
    buyer_agent_id: Mapped[UUID] = mapped_column(Uuid, ForeignKey("agents.id", ondelete="RESTRICT"))
    seller_agent_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("agents.id", ondelete="RESTRICT")
    )
    buyer_principal_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("principals.id", ondelete="RESTRICT")
    )
    seller_principal_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("principals.id", ondelete="RESTRICT"), index=True
    )
    state: Mapped[str] = mapped_column(String(32), default="created")
    round_no: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, server_default=func.now()
    )


class AgentMessage(Base):
    __tablename__ = "agent_messages"
    __table_args__ = (
        UniqueConstraint("sender_agent_id", "nonce", name="uq_agent_messages_sender_nonce"),
    )
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    negotiation_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("negotiations.id", ondelete="RESTRICT"), index=True
    )
    sender_agent_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("agents.id", ondelete="RESTRICT")
    )
    nonce: Mapped[str] = mapped_column(String(64))
    message_type: Mapped[str] = mapped_column(String(32))
    envelope: Mapped[dict[str, object]] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, server_default=func.now()
    )


class Offer(Base):
    __tablename__ = "offers"
    __table_args__ = (
        UniqueConstraint("negotiation_id", "version", name="uq_offers_negotiation_version"),
        CheckConstraint("total >= 0", name="total"),
        CheckConstraint("version >= 1", name="version"),
        CheckConstraint("length(terms_hash) = 64", name="terms_hash"),
    )
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    negotiation_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("negotiations.id", ondelete="RESTRICT"), index=True
    )
    version: Mapped[int] = mapped_column(Integer)
    terms: Mapped[dict[str, object]] = mapped_column(JSON)
    terms_hash: Mapped[str] = mapped_column(String(64))
    total: Mapped[Decimal] = mapped_column(Numeric(18, 2))
    validation: Mapped[dict[str, object]] = mapped_column(JSON)
    ranking: Mapped[dict[str, object]] = mapped_column(JSON, default=dict)
    valid: Mapped[bool] = mapped_column(Boolean)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, server_default=func.now()
    )


class SecurityIncident(Base):
    __tablename__ = "security_incidents"
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    principal_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("principals.id", ondelete="RESTRICT"), index=True
    )
    agent_id: Mapped[UUID] = mapped_column(Uuid, ForeignKey("agents.id", ondelete="RESTRICT"))
    task_id: Mapped[UUID] = mapped_column(Uuid, ForeignKey("tasks.id", ondelete="RESTRICT"))
    event_id: Mapped[UUID] = mapped_column(Uuid, ForeignKey("events.id", ondelete="RESTRICT"))
    incident_type: Mapped[str] = mapped_column(String(40))
    evidence: Mapped[dict[str, object]] = mapped_column(JSON)
    action: Mapped[str] = mapped_column(String(80))
    status: Mapped[str] = mapped_column(String(20), default="review_needed")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, server_default=func.now()
    )


class Deal(Base):
    __tablename__ = "deals"
    __table_args__ = (
        UniqueConstraint("task_id", name="uq_deals_task"),
        CheckConstraint("amount > 0", name="amount"),
        CheckConstraint("version >= 1", name="version"),
        CheckConstraint("currency = 'INR'", name="currency"),
        CheckConstraint(
            "status IN ('locked','approved','rejected','settled','expired')",
            name="status",
        ),
        CheckConstraint("length(terms_hash) = 64", name="terms_hash"),
    )
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    task_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("tasks.id", ondelete="RESTRICT"), index=True
    )
    final_offer_id: Mapped[UUID] = mapped_column(Uuid, ForeignKey("offers.id", ondelete="RESTRICT"))
    buyer_principal_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("principals.id", ondelete="RESTRICT")
    )
    seller_principal_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("principals.id", ondelete="RESTRICT")
    )
    version: Mapped[int] = mapped_column(Integer, default=1)
    status: Mapped[str] = mapped_column(String(24), default="locked")
    amount: Mapped[Decimal] = mapped_column(Numeric(18, 2))
    currency: Mapped[str] = mapped_column(String(3), default="INR")
    snapshot: Mapped[dict[str, object]] = mapped_column(JSON)
    terms_hash: Mapped[str] = mapped_column(String(64))
    approved_hash: Mapped[str | None] = mapped_column(String(64))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, server_default=func.now()
    )


class Approval(Base):
    __tablename__ = "approvals"
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    deal_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("deals.id", ondelete="RESTRICT"), index=True
    )
    deal_version: Mapped[int] = mapped_column(Integer)
    user_id: Mapped[UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="RESTRICT"))
    nonce_hash: Mapped[str] = mapped_column(String(64))
    terms_hash: Mapped[str] = mapped_column(String(64))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class MockPayment(Base):
    __tablename__ = "mock_payments"
    __table_args__ = (
        UniqueConstraint("deal_id", name="uq_mock_payments_deal"),
        UniqueConstraint("idempotency_key", name="uq_mock_payments_idempotency"),
        CheckConstraint("amount >= 0", name="amount"),
        CheckConstraint("currency = 'INR'", name="currency"),
        CheckConstraint("status = 'succeeded'", name="status"),
    )
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    deal_id: Mapped[UUID] = mapped_column(Uuid, ForeignKey("deals.id", ondelete="RESTRICT"))
    amount: Mapped[Decimal] = mapped_column(Numeric(18, 2))
    currency: Mapped[str] = mapped_column(String(3), default="INR")
    status: Mapped[str] = mapped_column(String(16), default="succeeded")
    idempotency_key: Mapped[str] = mapped_column(String(128))
    reference: Mapped[str] = mapped_column(String(80))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, server_default=func.now()
    )


class Reservation(Base):
    __tablename__ = "inventory_reservations"
    __table_args__ = (
        UniqueConstraint("deal_id", "product_id", name="uq_reservations_deal_product"),
        ForeignKeyConstraint(
            ["principal_id", "agent_id"], ["agents.principal_id", "agents.id"], ondelete="RESTRICT"
        ),
        CheckConstraint("quantity > 0", name="quantity"),
    )
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    deal_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("deals.id", ondelete="RESTRICT"), index=True
    )
    principal_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("principals.id", ondelete="RESTRICT")
    )
    agent_id: Mapped[UUID] = mapped_column(Uuid, ForeignKey("agents.id", ondelete="RESTRICT"))
    product_id: Mapped[UUID] = mapped_column(Uuid, ForeignKey("products.id", ondelete="RESTRICT"))
    quantity: Mapped[Decimal] = mapped_column(Numeric(14, 3))
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class SupplierMemory(Base):
    __tablename__ = "supplier_memory"
    __table_args__ = (
        UniqueConstraint("event_id", name="uq_supplier_memory_event"),
        CheckConstraint("score >= 0 AND score <= 1", name="score"),
        CheckConstraint("confidence >= 0 AND confidence <= 1", name="confidence"),
        CheckConstraint("status IN ('verified','disputed','corrected')", name="status"),
    )
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    buyer_principal_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("principals.id", ondelete="RESTRICT"), index=True
    )
    seller_principal_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("principals.id", ondelete="RESTRICT")
    )
    event_id: Mapped[UUID] = mapped_column(Uuid, ForeignKey("events.id", ondelete="RESTRICT"))
    memory_type: Mapped[str] = mapped_column(String(40))
    score: Mapped[Decimal] = mapped_column(Numeric(5, 4))
    confidence: Mapped[Decimal] = mapped_column(Numeric(5, 4))
    evidence: Mapped[dict[str, object]] = mapped_column(JSON)
    status: Mapped[str] = mapped_column(String(16), default="verified")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, server_default=func.now()
    )


class Notification(Base):
    __tablename__ = "telegram_notifications"
    __table_args__ = (UniqueConstraint("user_id", "event_id", name="uq_notifications_user_event"),)
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="RESTRICT"), index=True
    )
    event_id: Mapped[UUID] = mapped_column(Uuid, ForeignKey("events.id", ondelete="RESTRICT"))
    text: Mapped[str] = mapped_column(String(4000))
    status: Mapped[str] = mapped_column(String(16), default="pending")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, server_default=func.now()
    )
    claimed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    delivered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class ProactiveTrigger(Base):
    __tablename__ = "proactive_triggers"
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    principal_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("principals.id", ondelete="RESTRICT")
    )
    due_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    reason: Mapped[str] = mapped_column(String(500))
