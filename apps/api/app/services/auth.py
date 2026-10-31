from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.contracts.identity import LoginRequest, RegisterRequest
from app.core.config import Settings
from app.core.security import (
    DUMMY_PASSWORD_HASH,
    derive_csrf_token,
    digest_token,
    generate_opaque_token,
    hash_password,
    normalize_email,
    password_needs_rehash,
    token_matches,
    verify_password,
)
from app.db.models import User, UserSession


class EmailAlreadyRegisteredError(Exception):
    pass


class AuthenticationFailedError(Exception):
    pass


@dataclass(frozen=True)
class AuthContext:
    user: User
    session: UserSession
    csrf_token: str = field(repr=False)


@dataclass(frozen=True)
class IssuedSession:
    context: AuthContext
    session_token: str = field(repr=False)


def as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def register_user(db: Session, payload: RegisterRequest) -> User:
    email = normalize_email(str(payload.email))
    user = User(
        email=email,
        password_hash=hash_password(payload.password.get_secret_value()),
        display_name=payload.display_name,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        if db.scalar(select(User.id).where(User.email == email)) is not None:
            raise EmailAlreadyRegisteredError from exc
        raise
    db.refresh(user)
    return user


def authenticate_user(db: Session, payload: LoginRequest, settings: Settings) -> IssuedSession:
    email = normalize_email(str(payload.email))
    user = db.scalar(select(User).where(User.email == email))
    password_hash = user.password_hash if user is not None else DUMMY_PASSWORD_HASH
    password = payload.password.get_secret_value()
    password_is_valid = verify_password(password_hash, password)
    if user is None or not password_is_valid or user.status != "active":
        raise AuthenticationFailedError

    if password_needs_rehash(user.password_hash):
        user.password_hash = hash_password(password)

    now = datetime.now(UTC)
    session_token = generate_opaque_token()
    csrf_token = derive_csrf_token(session_token)
    user_session = UserSession(
        user_id=user.id,
        token_hash=digest_token(session_token),
        csrf_hash=digest_token(csrf_token),
        expires_at=now + timedelta(hours=settings.session_duration_hours),
    )
    db.add(user_session)
    db.commit()
    db.refresh(user_session)
    return IssuedSession(AuthContext(user, user_session, csrf_token), session_token)


def load_auth_context(db: Session, session_token: str | None) -> AuthContext | None:
    if not session_token or len(session_token) != 43:
        return None
    now = datetime.now(UTC)
    row = db.execute(
        select(UserSession, User)
        .join(User, User.id == UserSession.user_id)
        .where(
            UserSession.token_hash == digest_token(session_token),
            UserSession.revoked_at.is_(None),
            UserSession.expires_at > now,
            User.status == "active",
        )
    ).one_or_none()
    if row is None:
        return None
    user_session, user = row
    return AuthContext(user, user_session, derive_csrf_token(session_token))


def verify_csrf_token(context: AuthContext, csrf_token: str | None) -> bool:
    return bool(
        csrf_token
        and len(csrf_token) <= 128
        and token_matches(csrf_token, context.session.csrf_hash)
    )


def revoke_session(db: Session, context: AuthContext) -> None:
    context.session.revoked_at = datetime.now(UTC)
    db.commit()


def user_created_at(user: User) -> datetime:
    return as_utc(user.created_at)


def session_expires_at(context: AuthContext) -> datetime:
    return as_utc(context.session.expires_at)
