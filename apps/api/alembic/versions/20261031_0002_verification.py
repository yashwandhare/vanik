"""Add demo verification state.

Revision ID: 20261031_0002
Revises: 20261031_0001
"""

from collections.abc import Sequence
from importlib import import_module
from typing import Any

import sqlalchemy as sa

_alembic: Any = import_module("alembic")
op: Any = _alembic.op

revision: str = "20261031_0002"
down_revision: str | Sequence[str] | None = "20261031_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "principals",
        sa.Column("verification_updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.drop_index("ix_business_identifiers_principal_type", table_name="business_identifiers")
    op.create_index(
        "ix_business_identifiers_principal_type",
        "business_identifiers",
        ["principal_id", "identifier_type"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("ix_business_identifiers_principal_type", table_name="business_identifiers")
    op.create_index(
        "ix_business_identifiers_principal_type",
        "business_identifiers",
        ["principal_id", "identifier_type"],
    )
    op.drop_column("principals", "verification_updated_at")
