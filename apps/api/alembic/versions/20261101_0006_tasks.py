"""Persist procurement mandate tasks and principal procurement policies.

Revision ID: 20261101_0006
Revises: 20261031_0005
"""

from collections.abc import Sequence
from importlib import import_module
from typing import Any

import sqlalchemy as sa

_alembic: Any = import_module("alembic")
op: Any = _alembic.op
revision: str = "20261101_0006"
down_revision: str | Sequence[str] | None = "20261031_0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "principal_procurement_policies",
        sa.Column("principal_id", sa.Uuid(), nullable=False),
        sa.Column("max_budget_inr", sa.Numeric(18, 2), nullable=False),
        sa.Column("max_credit_days", sa.Integer(), nullable=False),
        sa.Column("max_rounds", sa.Integer(), nullable=False),
        sa.Column("credit_score", sa.Integer(), nullable=False),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.CheckConstraint(
            "max_budget_inr > 0", name=op.f("ck_principal_procurement_policies_budget")
        ),
        sa.CheckConstraint(
            "max_credit_days >= 0 AND max_credit_days <= 90",
            name=op.f("ck_principal_procurement_policies_credit"),
        ),
        sa.CheckConstraint(
            "credit_score >= 0 AND credit_score <= 100",
            name=op.f("ck_principal_procurement_policies_credit_score"),
        ),
        sa.CheckConstraint(
            "max_rounds >= 1 AND max_rounds <= 5",
            name=op.f("ck_principal_procurement_policies_rounds"),
        ),
        sa.ForeignKeyConstraint(["principal_id"], ["principals.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("principal_id"),
    )
    op.create_table(
        "tasks",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("principal_id", sa.Uuid(), nullable=False),
        sa.Column("agent_id", sa.Uuid(), nullable=False),
        sa.Column("objective", sa.String(500), nullable=False),
        sa.Column("category", sa.String(40), nullable=False),
        sa.Column("lines", sa.JSON(), nullable=False),
        sa.Column("budget_inr", sa.Numeric(18, 2), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False),
        sa.Column("delivery_deadline", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("priorities", sa.JSON(), nullable=False),
        sa.Column("allowed_tools", sa.JSON(), nullable=False),
        sa.Column("permitted_actions", sa.JSON(), nullable=False),
        sa.Column("max_rounds", sa.Integer(), nullable=False),
        sa.Column("min_credit_days", sa.Integer(), nullable=False),
        sa.Column("max_upfront_pct", sa.Numeric(5, 2), nullable=False),
        sa.Column("requires_human_approval", sa.Boolean(), nullable=False),
        sa.Column("status", sa.String(32), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.CheckConstraint("budget_inr > 0", name=op.f("ck_tasks_budget")),
        sa.CheckConstraint("version >= 1", name=op.f("ck_tasks_version")),
        sa.CheckConstraint("category = 'procurement'", name=op.f("ck_tasks_category")),
        sa.CheckConstraint("max_rounds >= 1 AND max_rounds <= 5", name=op.f("ck_tasks_rounds")),
        sa.CheckConstraint(
            "min_credit_days >= 0 AND min_credit_days <= 90",
            name=op.f("ck_tasks_credit"),
        ),
        sa.CheckConstraint(
            "max_upfront_pct >= 0 AND max_upfront_pct <= 100",
            name=op.f("ck_tasks_upfront"),
        ),
        sa.CheckConstraint("requires_human_approval", name=op.f("ck_tasks_human_approval")),
        sa.CheckConstraint("currency = 'INR'", name=op.f("ck_tasks_currency")),
        sa.CheckConstraint("expires_at <= delivery_deadline", name=op.f("ck_tasks_expiry")),
        sa.CheckConstraint(
            "status IN ('created','running','awaiting_approval','completed',"
            "'cancelled','expired','failed')",
            name=op.f("ck_tasks_status"),
        ),
        sa.ForeignKeyConstraint(["principal_id"], ["principals.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["agent_id"], ["agents.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(
            ["principal_id", "agent_id"],
            ["agents.principal_id", "agents.id"],
            name="fk_tasks_principal_agent",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_tasks_principal_created", "tasks", ["principal_id", "created_at", "id"])
    op.create_index("ix_tasks_agent_id", "tasks", ["agent_id"])
    op.create_table(
        "task_lines",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("task_id", sa.Uuid(), nullable=False),
        sa.Column("product_id", sa.Uuid(), nullable=False),
        sa.Column("sku", sa.String(40), nullable=False),
        sa.Column("quantity", sa.Numeric(14, 3), nullable=False),
        sa.Column("unit", sa.String(32), nullable=False),
        sa.CheckConstraint("quantity > 0", name=op.f("ck_task_lines_quantity")),
        sa.ForeignKeyConstraint(["task_id"], ["tasks.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("task_id", "product_id", name="uq_task_lines_product"),
        sa.UniqueConstraint("task_id", "sku", name="uq_task_lines_sku"),
    )
    op.create_index("ix_task_lines_task_id", "task_lines", ["task_id"])
    op.create_index("ix_task_lines_product_id", "task_lines", ["product_id"])


def downgrade() -> None:
    op.drop_index("ix_task_lines_product_id", table_name="task_lines")
    op.drop_index("ix_task_lines_task_id", table_name="task_lines")
    op.drop_table("task_lines")
    op.drop_index("ix_tasks_agent_id", table_name="tasks")
    op.drop_index("ix_tasks_principal_created", table_name="tasks")
    op.drop_table("tasks")
    op.drop_table("principal_procurement_policies")
