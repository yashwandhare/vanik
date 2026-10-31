"""Add catalogue, seller profiles and inventory.

Revision ID: 20261031_0005
Revises: 20261031_0004
"""

from collections.abc import Sequence
from importlib import import_module
from typing import Any

import sqlalchemy as sa

_alembic: Any = import_module("alembic")
op: Any = _alembic.op
revision: str = "20261031_0005"
down_revision: str | Sequence[str] | None = "20261031_0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_unique_constraint("uq_agents_principal_id_id", "agents", ["principal_id", "id"])
    op.create_table(
        "products",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("sku", sa.String(40), nullable=False),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("category", sa.String(40), nullable=False),
        sa.Column("unit", sa.String(32), nullable=False),
        sa.Column("benchmark_price", sa.Numeric(12, 2), nullable=False),
        sa.Column("attributes", sa.JSON(), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.CheckConstraint("benchmark_price > 0", name=op.f("ck_products_benchmark_price")),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_products_sku", "products", ["sku"], unique=True)
    op.create_index("ix_products_category_active", "products", ["category", "active"])
    op.create_table(
        "seller_profiles",
        sa.Column("principal_id", sa.Uuid(), nullable=False),
        sa.Column("coverage", sa.JSON(), nullable=False),
        sa.Column("delivery_days", sa.Integer(), nullable=False),
        sa.Column("credit_days", sa.JSON(), nullable=False),
        sa.Column("public_policies", sa.JSON(), nullable=False),
        sa.Column("reliability_score", sa.Numeric(5, 4), nullable=True),
        sa.Column("reliability_evidence_count", sa.Integer(), nullable=False),
        sa.Column("evidence_is_simulated", sa.Boolean(), nullable=False),
        sa.CheckConstraint("delivery_days >= 1", name=op.f("ck_seller_profiles_delivery_days")),
        sa.CheckConstraint(
            "reliability_evidence_count >= 0",
            name=op.f("ck_seller_profiles_reliability_evidence_count"),
        ),
        sa.CheckConstraint(
            "reliability_score IS NULL OR reliability_evidence_count > 0",
            name=op.f("ck_seller_profiles_rating_evidence"),
        ),
        sa.CheckConstraint(
            "reliability_score IS NULL OR (reliability_score >= 0 AND reliability_score <= 1)",
            name=op.f("ck_seller_profiles_reliability_score"),
        ),
        sa.ForeignKeyConstraint(["principal_id"], ["principals.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("principal_id"),
    )
    op.create_table(
        "inventory",
        sa.Column("principal_id", sa.Uuid(), nullable=False),
        sa.Column("agent_id", sa.Uuid(), nullable=False),
        sa.Column("product_id", sa.Uuid(), nullable=False),
        sa.Column("available_qty", sa.Numeric(14, 3), nullable=False),
        sa.Column("reserved_qty", sa.Numeric(14, 3), nullable=False),
        sa.Column(
            "last_updated", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.CheckConstraint("available_qty >= 0", name=op.f("ck_inventory_available_qty")),
        sa.CheckConstraint("reserved_qty >= 0", name=op.f("ck_inventory_reserved_qty")),
        sa.CheckConstraint(
            "reserved_qty <= available_qty", name=op.f("ck_inventory_reservation_capacity")
        ),
        sa.ForeignKeyConstraint(
            ["principal_id", "agent_id"],
            ["agents.principal_id", "agents.id"],
            name="fk_inventory_principal_agent",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(["principal_id"], ["principals.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["agent_id"], ["agents.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("principal_id", "agent_id", "product_id"),
    )
    op.create_index("ix_inventory_product_available", "inventory", ["product_id", "available_qty"])


def downgrade() -> None:
    op.drop_index("ix_inventory_product_available", table_name="inventory")
    op.drop_table("inventory")
    op.drop_table("seller_profiles")
    op.drop_index("ix_products_category_active", table_name="products")
    op.drop_index("ix_products_sku", table_name="products")
    op.drop_table("products")
    op.drop_constraint("uq_agents_principal_id_id", "agents", type_="unique")
