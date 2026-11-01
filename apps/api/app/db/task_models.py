from datetime import UTC, datetime
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


def utc_now() -> datetime:
    return datetime.now(UTC)


class PrincipalProcurementPolicy(Base):
    __tablename__ = "principal_procurement_policies"
    __table_args__ = (
        CheckConstraint("max_budget_inr > 0", name="budget"),
        CheckConstraint("max_credit_days >= 0 AND max_credit_days <= 90", name="credit"),
        CheckConstraint("credit_score >= 0 AND credit_score <= 100", name="credit_score"),
        CheckConstraint("max_rounds >= 1 AND max_rounds <= 5", name="rounds"),
    )
    principal_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("principals.id", ondelete="CASCADE"), primary_key=True
    )
    max_budget_inr: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("1000000.00"))
    max_credit_days: Mapped[int] = mapped_column(Integer, default=30)
    max_rounds: Mapped[int] = mapped_column(Integer, default=5)
    credit_score: Mapped[int] = mapped_column(Integer, default=65)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, server_default=func.now()
    )


class Task(Base):
    __tablename__ = "tasks"
    __table_args__ = (
        ForeignKeyConstraint(
            ["principal_id", "agent_id"],
            ["agents.principal_id", "agents.id"],
            name="fk_tasks_principal_agent",
            ondelete="RESTRICT",
        ),
        CheckConstraint("budget_inr > 0", name="budget"),
        CheckConstraint("version >= 1", name="version"),
        CheckConstraint("category = 'procurement'", name="category"),
        CheckConstraint("max_rounds >= 1 AND max_rounds <= 5", name="rounds"),
        CheckConstraint("min_credit_days >= 0 AND min_credit_days <= 90", name="credit"),
        CheckConstraint("max_upfront_pct >= 0 AND max_upfront_pct <= 100", name="upfront"),
        CheckConstraint("requires_human_approval", name="human_approval"),
        CheckConstraint("currency = 'INR'", name="currency"),
        CheckConstraint("expires_at <= delivery_deadline", name="expiry"),
        CheckConstraint(
            "status IN ('created','running','awaiting_approval','completed',"
            "'cancelled','expired','failed')",
            name="status",
        ),
        Index("ix_tasks_principal_created", "principal_id", "created_at", "id"),
        Index("ix_tasks_agent_id", "agent_id"),
    )
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    version: Mapped[int] = mapped_column(Integer, default=1)
    principal_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("principals.id", ondelete="RESTRICT")
    )
    agent_id: Mapped[UUID] = mapped_column(Uuid, ForeignKey("agents.id", ondelete="RESTRICT"))
    objective: Mapped[str] = mapped_column(String(500))
    category: Mapped[str] = mapped_column(String(40), default="procurement")
    lines: Mapped[list[dict[str, object]]] = mapped_column(JSON)
    budget_inr: Mapped[Decimal] = mapped_column(Numeric(18, 2))
    currency: Mapped[str] = mapped_column(String(3), default="INR")
    delivery_deadline: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    priorities: Mapped[dict[str, str]] = mapped_column(JSON)
    allowed_tools: Mapped[list[str]] = mapped_column(JSON)
    permitted_actions: Mapped[list[str]] = mapped_column(JSON)
    max_rounds: Mapped[int] = mapped_column(Integer, default=3)
    min_credit_days: Mapped[int] = mapped_column(Integer, default=0)
    max_upfront_pct: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal("100"))
    requires_human_approval: Mapped[bool] = mapped_column(Boolean, default=True)
    status: Mapped[str] = mapped_column(String(32), default="created")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, server_default=func.now()
    )


class TaskLine(Base):
    __tablename__ = "task_lines"
    __table_args__ = (
        UniqueConstraint("task_id", "product_id", name="uq_task_lines_product"),
        UniqueConstraint("task_id", "sku", name="uq_task_lines_sku"),
        CheckConstraint("quantity > 0", name="quantity"),
        Index("ix_task_lines_task_id", "task_id"),
        Index("ix_task_lines_product_id", "product_id"),
    )
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    task_id: Mapped[UUID] = mapped_column(Uuid, ForeignKey("tasks.id", ondelete="CASCADE"))
    product_id: Mapped[UUID] = mapped_column(Uuid, ForeignKey("products.id", ondelete="RESTRICT"))
    sku: Mapped[str] = mapped_column(String(40))
    quantity: Mapped[Decimal] = mapped_column(Numeric(14, 3))
    unit: Mapped[str] = mapped_column(String(32))
