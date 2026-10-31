"""Create Phase 1 identity and access tables.

Revision ID: 20261031_0001
Revises:
"""

from collections.abc import Sequence
from importlib import import_module
from typing import Any

import sqlalchemy as sa

# Alembic exposes this migration proxy dynamically at runtime.
_alembic: Any = import_module("alembic")
op: Any = _alembic.op

revision: str = "20261031_0001"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("display_name", sa.String(length=120), nullable=False),
        sa.Column("auth_provider", sa.String(length=32), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint("status IN ('active', 'disabled')", name=op.f("ck_users_status")),
        sa.PrimaryKeyConstraint("id", name="pk_users"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "principals",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("legal_name", sa.String(length=120), nullable=False),
        sa.Column("trade_name", sa.String(length=120), nullable=False),
        sa.Column("business_type", sa.String(length=80), nullable=False),
        sa.Column("address", sa.String(length=500), nullable=False),
        sa.Column("contact_email", sa.String(length=320), nullable=False),
        sa.Column("roles", sa.JSON(), nullable=False),
        sa.Column("verification_status", sa.String(length=32), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint("status IN ('active', 'suspended')", name=op.f("ck_principals_status")),
        sa.CheckConstraint(
            "verification_status IN ('not_submitted', 'pending', 'demo_verified', 'rejected')",
            name=op.f("ck_principals_verification_status"),
        ),
        sa.PrimaryKeyConstraint("id", name="pk_principals"),
    )

    op.create_table(
        "user_sessions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("csrf_hash", sa.String(length=64), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("expires_at > created_at", name=op.f("ck_user_sessions_valid_expiry")),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name="fk_user_sessions_user_id_users", ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name="pk_user_sessions"),
        sa.UniqueConstraint("token_hash", name="uq_user_sessions_token_hash"),
    )
    op.create_index("ix_user_sessions_expires_at", "user_sessions", ["expires_at"])
    op.create_index(
        "ix_user_sessions_user_active", "user_sessions", ["user_id", "revoked_at", "expires_at"]
    )
    op.create_index("ix_user_sessions_user_id", "user_sessions", ["user_id"])

    op.create_table(
        "principal_members",
        sa.Column("principal_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("role", sa.String(length=32), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "role IN ('owner', 'admin', 'operator', 'viewer')",
            name=op.f("ck_principal_members_role"),
        ),
        sa.CheckConstraint(
            "status IN ('active', 'revoked')", name=op.f("ck_principal_members_status")
        ),
        sa.ForeignKeyConstraint(
            ["principal_id"],
            ["principals.id"],
            name="fk_principal_members_principal_id_principals",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name="fk_principal_members_user_id_users", ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("principal_id", "user_id", name="pk_principal_members"),
    )
    op.create_index("ix_principal_members_user_status", "principal_members", ["user_id", "status"])

    op.create_table(
        "business_identifiers",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("principal_id", sa.Uuid(), nullable=False),
        sa.Column("identifier_type", sa.String(length=32), nullable=False),
        sa.Column("value_digest", sa.String(length=64), nullable=False),
        sa.Column("masked_value", sa.String(length=32), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "status IN ('pending', 'demo_verified', 'rejected')",
            name=op.f("ck_business_identifiers_status"),
        ),
        sa.ForeignKeyConstraint(
            ["principal_id"],
            ["principals.id"],
            name="fk_business_identifiers_principal_id_principals",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_business_identifiers"),
    )
    op.create_index(
        "ix_business_identifiers_principal_id", "business_identifiers", ["principal_id"]
    )
    op.create_index(
        "ix_business_identifiers_principal_type",
        "business_identifiers",
        ["principal_id", "identifier_type"],
    )


def downgrade() -> None:
    op.drop_index("ix_business_identifiers_principal_type", table_name="business_identifiers")
    op.drop_index("ix_business_identifiers_principal_id", table_name="business_identifiers")
    op.drop_table("business_identifiers")
    op.drop_index("ix_principal_members_user_status", table_name="principal_members")
    op.drop_table("principal_members")
    op.drop_index("ix_user_sessions_user_id", table_name="user_sessions")
    op.drop_index("ix_user_sessions_user_active", table_name="user_sessions")
    op.drop_index("ix_user_sessions_expires_at", table_name="user_sessions")
    op.drop_table("user_sessions")
    op.drop_table("principals")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
