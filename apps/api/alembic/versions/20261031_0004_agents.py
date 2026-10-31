"""Persist agents, encrypted signing keys, principal ceilings and lifecycle events."""

import json
from collections.abc import Sequence
from importlib import import_module
from typing import Any

import sqlalchemy as sa

_alembic: Any = import_module("alembic")
op: Any = _alembic.op
revision: str = "20261031_0004"
down_revision: str | Sequence[str] | None = "20261031_0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

AUTHORITY = {
    "buyer": {
        "capabilities": ["evaluate_offers", "request_quote"],
        "allowed_tools": ["benchmark_compare", "marketplace_search"],
    },
    "seller": {
        "capabilities": ["generate_offer", "receive_rfq"],
        "allowed_tools": ["benchmark_compare", "marketplace_search"],
    },
}


def upgrade() -> None:
    op.add_column(
        "principals",
        sa.Column(
            "agent_authority",
            sa.JSON(),
            nullable=False,
            server_default=sa.literal(json.dumps(AUTHORITY, sort_keys=True)),
        ),
    )
    op.create_table(
        "agents",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("principal_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("role", sa.String(16), nullable=False),
        sa.Column("description", sa.String(1000), nullable=False),
        sa.Column("capabilities", sa.JSON(), nullable=False),
        sa.Column("allowed_tools", sa.JSON(), nullable=False),
        sa.Column("strategy_profile", sa.String(80), nullable=False),
        sa.Column("status", sa.String(16), nullable=False),
        sa.Column("passport_version", sa.Integer(), nullable=False),
        sa.Column("current_key_version", sa.Integer(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.CheckConstraint("role IN ('buyer', 'seller')", name=op.f("ck_agents_role")),
        sa.CheckConstraint(
            "status IN ('active', 'paused', 'revoked')", name=op.f("ck_agents_status")
        ),
        sa.CheckConstraint("passport_version >= 1", name=op.f("ck_agents_passport_version")),
        sa.CheckConstraint("current_key_version >= 1", name=op.f("ck_agents_current_key_version")),
        sa.ForeignKeyConstraint(["principal_id"], ["principals.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_agents_principal_created", "agents", ["principal_id", "created_at", "id"])
    op.create_table(
        "agent_keys",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("agent_id", sa.Uuid(), nullable=False),
        sa.Column("key_version", sa.Integer(), nullable=False),
        sa.Column("public_key", sa.String(44), nullable=False),
        sa.Column("fingerprint", sa.String(71), nullable=False),
        sa.Column("private_ciphertext", sa.LargeBinary(), nullable=False),
        sa.Column("private_nonce", sa.LargeBinary(), nullable=False),
        sa.Column("status", sa.String(16), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("key_version >= 1", name=op.f("ck_agent_keys_key_version")),
        sa.CheckConstraint("status IN ('active', 'revoked')", name=op.f("ck_agent_keys_status")),
        sa.CheckConstraint("length(private_nonce) = 12", name=op.f("ck_agent_keys_nonce_length")),
        sa.CheckConstraint(
            "length(private_ciphertext) = 48", name=op.f("ck_agent_keys_ciphertext_length")
        ),
        sa.ForeignKeyConstraint(["agent_id"], ["agents.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("agent_id", "key_version", name="uq_agent_keys_agent_version"),
        sa.UniqueConstraint("fingerprint", name="uq_agent_keys_fingerprint"),
    )
    op.create_index(
        "uq_agent_keys_active_agent",
        "agent_keys",
        ["agent_id"],
        unique=True,
        postgresql_where=sa.text("status = 'active'"),
    )
    op.create_table(
        "events",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("principal_id", sa.Uuid(), nullable=False),
        sa.Column("actor_type", sa.String(16), nullable=False),
        sa.Column("actor_id", sa.Uuid(), nullable=False),
        sa.Column("event_type", sa.String(80), nullable=False),
        sa.Column("entity_type", sa.String(32), nullable=False),
        sa.Column("entity_id", sa.Uuid(), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.CheckConstraint(
            "actor_type IN ('human', 'agent', 'system')", name=op.f("ck_events_actor_type")
        ),
        sa.ForeignKeyConstraint(["principal_id"], ["principals.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_events_principal_created", "events", ["principal_id", "created_at", "id"])
    op.create_index("ix_events_entity", "events", ["entity_type", "entity_id"])
    op.execute("""
        CREATE FUNCTION vanik_reject_event_mutation() RETURNS trigger AS $$
        BEGIN
            RAISE EXCEPTION 'Audit events are append-only';
        END;
        $$ LANGUAGE plpgsql
    """)
    op.execute("""
        CREATE TRIGGER events_append_only BEFORE UPDATE OR DELETE ON events
        FOR EACH ROW EXECUTE FUNCTION vanik_reject_event_mutation()
    """)


def downgrade() -> None:
    op.execute("DROP TRIGGER events_append_only ON events")
    op.execute("DROP FUNCTION vanik_reject_event_mutation()")
    op.drop_index("ix_events_entity", table_name="events")
    op.drop_index("ix_events_principal_created", table_name="events")
    op.drop_table("events")
    op.drop_index("uq_agent_keys_active_agent", table_name="agent_keys")
    op.drop_table("agent_keys")
    op.drop_index("ix_agents_principal_created", table_name="agents")
    op.drop_table("agents")
    op.drop_column("principals", "agent_authority")
