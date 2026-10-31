from datetime import UTC, datetime
from uuid import UUID, uuid4

from sqlalchemy import JSON, CheckConstraint, DateTime, ForeignKey, Index, String, Uuid, func, text
from sqlalchemy.orm import Mapped, mapped_column

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
