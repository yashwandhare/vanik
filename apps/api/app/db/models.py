import json
from datetime import UTC, datetime
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import (
    JSON,
    CheckConstraint,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Integer,
    LargeBinary,
    Numeric,
    String,
    UniqueConstraint,
    Uuid,
    func,
    literal,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.agent_policy import default_agent_authority
from app.db.session import Base


def utc_now() -> datetime:
    return datetime.now(UTC)


class User(Base):
    __tablename__ = "users"
    __table_args__ = (CheckConstraint("status IN ('active', 'disabled')", name="status"),)

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    display_name: Mapped[str] = mapped_column(String(120))
    auth_provider: Mapped[str] = mapped_column(String(32), default="password")
    status: Mapped[str] = mapped_column(String(32), default="active")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, server_default=func.now()
    )


class UserSession(Base):
    __tablename__ = "user_sessions"
    __table_args__ = (
        CheckConstraint("expires_at > created_at", name="valid_expiry"),
        Index("ix_user_sessions_user_active", "user_id", "revoked_at", "expires_at"),
    )

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    csrf_hash: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, server_default=func.now()
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)


class TelegramLinkToken(Base):
    __tablename__ = "telegram_link_tokens"

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, server_default=func.now()
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class TelegramLink(Base):
    __tablename__ = "telegram_links"
    __table_args__ = (
        Index(
            "uq_telegram_links_active_user",
            "user_id",
            unique=True,
            postgresql_where=text("revoked_at IS NULL"),
            sqlite_where=text("revoked_at IS NULL"),
        ),
        Index(
            "uq_telegram_links_active_telegram",
            "telegram_user_id",
            unique=True,
            postgresql_where=text("revoked_at IS NULL"),
            sqlite_where=text("revoked_at IS NULL"),
        ),
    )

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    telegram_user_id: Mapped[str] = mapped_column(String(20), index=True)
    linked_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, server_default=func.now()
    )
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Principal(Base):
    __tablename__ = "principals"
    __table_args__ = (
        CheckConstraint(
            "verification_status IN ('not_submitted', 'pending', 'demo_verified', 'rejected')",
            name="verification_status",
        ),
        CheckConstraint("status IN ('active', 'suspended')", name="status"),
    )

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    legal_name: Mapped[str] = mapped_column(String(120))
    trade_name: Mapped[str] = mapped_column(String(120))
    business_type: Mapped[str] = mapped_column(String(80))
    address: Mapped[str] = mapped_column(String(500))
    contact_email: Mapped[str] = mapped_column(String(320))
    roles: Mapped[list[str]] = mapped_column(JSON)
    agent_authority: Mapped[dict[str, dict[str, list[str]]]] = mapped_column(
        JSON,
        default=default_agent_authority,
        server_default=literal(json.dumps(default_agent_authority(), sort_keys=True)),
    )
    verification_status: Mapped[str] = mapped_column(String(32), default="not_submitted")
    status: Mapped[str] = mapped_column(String(32), default="active")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, server_default=func.now()
    )
    verification_updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class PrincipalMember(Base):
    __tablename__ = "principal_members"
    __table_args__ = (
        CheckConstraint("role IN ('owner', 'admin', 'operator', 'viewer')", name="role"),
        CheckConstraint("status IN ('active', 'revoked')", name="status"),
        Index("ix_principal_members_user_status", "user_id", "status"),
    )

    principal_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("principals.id", ondelete="CASCADE"), primary_key=True
    )
    user_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    role: Mapped[str] = mapped_column(String(32))
    status: Mapped[str] = mapped_column(String(32), default="active")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, server_default=func.now()
    )


class Agent(Base):
    __tablename__ = "agents"
    __table_args__ = (
        UniqueConstraint("principal_id", "id", name="uq_agents_principal_id_id"),
        CheckConstraint("role IN ('buyer', 'seller')", name="role"),
        CheckConstraint("status IN ('active', 'paused', 'revoked')", name="status"),
        CheckConstraint("passport_version >= 1", name="passport_version"),
        CheckConstraint("current_key_version >= 1", name="current_key_version"),
        Index("ix_agents_principal_created", "principal_id", "created_at", "id"),
    )

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    principal_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("principals.id", ondelete="RESTRICT")
    )
    name: Mapped[str] = mapped_column(String(120))
    role: Mapped[str] = mapped_column(String(16))
    description: Mapped[str] = mapped_column(String(1000), default="")
    capabilities: Mapped[list[str]] = mapped_column(JSON)
    allowed_tools: Mapped[list[str]] = mapped_column(JSON)
    strategy_profile: Mapped[str] = mapped_column(String(80), default="default")
    status: Mapped[str] = mapped_column(String(16), default="active")
    passport_version: Mapped[int] = mapped_column(Integer, default=1)
    current_key_version: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, server_default=func.now()
    )


class AgentKey(Base):
    __tablename__ = "agent_keys"
    __table_args__ = (
        UniqueConstraint("agent_id", "key_version", name="uq_agent_keys_agent_version"),
        CheckConstraint("key_version >= 1", name="key_version"),
        CheckConstraint("status IN ('active', 'revoked')", name="status"),
        CheckConstraint("length(private_nonce) = 12", name="nonce_length"),
        CheckConstraint("length(private_ciphertext) = 48", name="ciphertext_length"),
        Index(
            "uq_agent_keys_active_agent",
            "agent_id",
            unique=True,
            postgresql_where=text("status = 'active'"),
            sqlite_where=text("status = 'active'"),
        ),
    )

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    agent_id: Mapped[UUID] = mapped_column(Uuid, ForeignKey("agents.id", ondelete="RESTRICT"))
    key_version: Mapped[int] = mapped_column(Integer)
    public_key: Mapped[str] = mapped_column(String(44))
    fingerprint: Mapped[str] = mapped_column(String(71), unique=True)
    private_ciphertext: Mapped[bytes] = mapped_column(LargeBinary)
    private_nonce: Mapped[bytes] = mapped_column(LargeBinary)
    status: Mapped[str] = mapped_column(String(16), default="active")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, server_default=func.now()
    )
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class AuditEvent(Base):
    __tablename__ = "events"
    __table_args__ = (
        CheckConstraint("actor_type IN ('human', 'agent', 'system')", name="actor_type"),
        Index("ix_events_principal_created", "principal_id", "created_at", "id"),
        Index("ix_events_entity", "entity_type", "entity_id"),
    )

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    principal_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("principals.id", ondelete="RESTRICT")
    )
    actor_type: Mapped[str] = mapped_column(String(16))
    actor_id: Mapped[UUID] = mapped_column(Uuid)
    event_type: Mapped[str] = mapped_column(String(80))
    entity_type: Mapped[str] = mapped_column(String(32))
    entity_id: Mapped[UUID] = mapped_column(Uuid)
    payload: Mapped[dict[str, object]] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, server_default=func.now()
    )


class Product(Base):
    __tablename__ = "products"
    __table_args__ = (
        CheckConstraint("benchmark_price > 0", name="benchmark_price"),
        Index("ix_products_category_active", "category", "active"),
    )

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    sku: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(160))
    category: Mapped[str] = mapped_column(String(40))
    unit: Mapped[str] = mapped_column(String(32))
    benchmark_price: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    attributes: Mapped[dict[str, object]] = mapped_column(JSON, default=dict)
    active: Mapped[bool] = mapped_column(default=True)


class SellerProfile(Base):
    __tablename__ = "seller_profiles"
    __table_args__ = (
        CheckConstraint("delivery_days >= 1", name="delivery_days"),
        CheckConstraint("reliability_evidence_count >= 0", name="reliability_evidence_count"),
        CheckConstraint(
            "reliability_score IS NULL OR reliability_evidence_count > 0", name="rating_evidence"
        ),
        CheckConstraint(
            "reliability_score IS NULL OR (reliability_score >= 0 AND reliability_score <= 1)",
            name="reliability_score",
        ),
    )

    principal_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("principals.id", ondelete="CASCADE"), primary_key=True
    )
    coverage: Mapped[list[str]] = mapped_column(JSON)
    delivery_days: Mapped[int] = mapped_column(Integer)
    credit_days: Mapped[list[int]] = mapped_column(JSON)
    public_policies: Mapped[dict[str, object]] = mapped_column(JSON, default=dict)
    reliability_score: Mapped[Decimal | None] = mapped_column(Numeric(5, 4))
    reliability_evidence_count: Mapped[int] = mapped_column(Integer, default=0)
    evidence_is_simulated: Mapped[bool] = mapped_column(default=True)


class Inventory(Base):
    __tablename__ = "inventory"
    __table_args__ = (
        ForeignKeyConstraint(
            ["principal_id", "agent_id"],
            ["agents.principal_id", "agents.id"],
            name="fk_inventory_principal_agent",
            ondelete="CASCADE",
        ),
        CheckConstraint("available_qty >= 0", name="available_qty"),
        CheckConstraint("reserved_qty >= 0", name="reserved_qty"),
        CheckConstraint("reserved_qty <= available_qty", name="reservation_capacity"),
        Index("ix_inventory_product_available", "product_id", "available_qty"),
    )

    principal_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("principals.id", ondelete="CASCADE"), primary_key=True
    )
    agent_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("agents.id", ondelete="CASCADE"), primary_key=True
    )
    product_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("products.id", ondelete="RESTRICT"), primary_key=True
    )
    available_qty: Mapped[Decimal] = mapped_column(Numeric(14, 3))
    reserved_qty: Mapped[Decimal] = mapped_column(Numeric(14, 3), default=Decimal("0"))
    last_updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, server_default=func.now()
    )


class BusinessIdentifier(Base):
    __tablename__ = "business_identifiers"
    __table_args__ = (
        CheckConstraint("status IN ('pending', 'demo_verified', 'rejected')", name="status"),
        Index(
            "ix_business_identifiers_principal_type",
            "principal_id",
            "identifier_type",
            unique=True,
        ),
    )

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    principal_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("principals.id", ondelete="CASCADE"), index=True
    )
    identifier_type: Mapped[str] = mapped_column(String(32))
    value_digest: Mapped[str] = mapped_column(String(64))
    masked_value: Mapped[str] = mapped_column(String(32))
    status: Mapped[str] = mapped_column(String(32), default="pending")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, server_default=func.now()
    )
