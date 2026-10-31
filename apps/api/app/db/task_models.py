from datetime import UTC, datetime
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Uuid,
    func,
    literal,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base

DEFAULT_MAX_BUDGET_INR = Decimal("1000000.00")
DEFAULT_MAX_CREDIT_DAYS = 30
DEFAULT_MAX_ROUNDS = 5


def utc_now() -> datetime:
    return datetime.now(UTC)


class PrincipalProcurementPolicy(Base):
    """Persisted procurement ceilings for each principal. Never widened by tasks."""

    __tablename__ = "principal_procurement_policies"

    principal_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("principals.id", ondelete="CASCADE"), primary_key=True
    )
    max_budget_inr: Mapped[Decimal] = mapped_column(
        Numeric(18, 2), nullable=False, default=lambda: DEFAULT_MAX_BUDGET_INR
    )
    max_credit_days: Mapped[int] = mapped_column(
        Integer, nullable=False, default=lambda: DEFAULT_MAX_CREDIT_DAYS
    )
    max_rounds: Mapped[int] = mapped_column(
        Integer, nullable=False, default=lambda: DEFAULT_MAX_ROUNDS
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, server_default=func.now(), onupdate=utc_now
    )


class Task(Base):
    """
    Procurement task (mandate). Immutable objective/lines/budget snapshot stored
    at creation; the running state, negotiated rounds and decisions live on this row.
    """

    __tablename__ = "tasks"

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    version: Mapped[int] = mapped_column(
        Integer, nullable=False, default=1, server_default=literal("1")
    )
    principal_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("principals.id", ondelete="RESTRICT"), index=True
    )
    agent_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("agents.id", ondelete="RESTRICT"), index=True
    )
    # --- immutable mandate snapshot (created at task creation) ---
    objective: Mapped[str] = mapped_column(String(500), nullable=False)
    category: Mapped[str] = mapped_column(String(40), nullable=False, default="procurement")
    lines: Mapped[list[dict[str, object]]] = mapped_column(JSON, nullable=False, default=list)
    budget_inr: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="INR")
    delivery_deadline: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    priorities: Mapped[dict[str, str]] = mapped_column(JSON, nullable=False, default=dict)
    allowed_tools: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    permitted_actions: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    max_rounds: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    requires_human_approval: Mapped[bool] = mapped_column(
        "requires_human_approval", Boolean, nullable=False, default=True
    )
    # --- mutable state ---
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="created")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, server_default=func.now(), onupdate=utc_now
    )


class TaskLine(Base):
    """
    Independent per-line storage with FK to the product so every line is
    validated against a live SKU at creation and at offer comparison time.
    """

    __tablename__ = "task_lines"

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    task_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("tasks.id", ondelete="CASCADE"), primary_key=True
    )
    product_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("products.id", ondelete="RESTRICT"), nullable=False
    )
    sku: Mapped[str] = mapped_column(String(40), nullable=False)
    quantity: Mapped[Decimal] = mapped_column(Numeric(14, 3), nullable=False)
    unit: Mapped[str] = mapped_column(String(32), nullable=False)
