from datetime import UTC, datetime, timedelta

from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.contracts.telegram import (
    TelegramLinkCompleteRequest,
    TelegramLinkResponse,
    TelegramLinkStartResponse,
)
from app.core.config import Settings
from app.core.security import digest_token, generate_opaque_token
from app.db.models import TelegramLink, TelegramLinkToken
from app.services.auth import AuthContext, as_utc


class InvalidTelegramLinkCodeError(Exception):
    pass


class TelegramAlreadyLinkedError(Exception):
    pass


def start_link(db: Session, context: AuthContext, settings: Settings) -> TelegramLinkStartResponse:
    now = datetime.now(UTC)
    db.execute(
        update(TelegramLinkToken)
        .where(
            TelegramLinkToken.user_id == context.user.id,
            TelegramLinkToken.used_at.is_(None),
        )
        .values(used_at=now)
    )
    code = generate_opaque_token()
    expires_at = now + timedelta(minutes=settings.telegram_link_ttl_minutes)
    db.add(
        TelegramLinkToken(
            user_id=context.user.id,
            token_hash=digest_token(code),
            expires_at=expires_at,
        )
    )
    db.commit()
    return TelegramLinkStartResponse(link_code=code, expires_at=expires_at)


def complete_link(db: Session, payload: TelegramLinkCompleteRequest) -> TelegramLinkResponse:
    now = datetime.now(UTC)
    token = db.scalar(
        select(TelegramLinkToken)
        .where(
            TelegramLinkToken.token_hash == digest_token(payload.link_code.get_secret_value()),
            TelegramLinkToken.used_at.is_(None),
            TelegramLinkToken.expires_at > now,
        )
        .with_for_update()
    )
    if token is None:
        raise InvalidTelegramLinkCodeError

    active_telegram = db.scalar(
        select(TelegramLink).where(
            TelegramLink.telegram_user_id == payload.telegram_user_id,
            TelegramLink.revoked_at.is_(None),
        )
    )
    if active_telegram is not None and active_telegram.user_id != token.user_id:
        raise TelegramAlreadyLinkedError

    db.execute(
        update(TelegramLink)
        .where(TelegramLink.user_id == token.user_id, TelegramLink.revoked_at.is_(None))
        .values(revoked_at=now)
    )
    link = TelegramLink(user_id=token.user_id, telegram_user_id=payload.telegram_user_id)
    token.used_at = now
    db.add(link)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise TelegramAlreadyLinkedError from exc
    db.refresh(link)
    return TelegramLinkResponse(
        id=link.id,
        user_id=link.user_id,
        telegram_user_id=link.telegram_user_id,
        linked_at=as_utc(link.linked_at),
    )


def unlink(db: Session, context: AuthContext) -> None:
    db.execute(
        update(TelegramLink)
        .where(TelegramLink.user_id == context.user.id, TelegramLink.revoked_at.is_(None))
        .values(revoked_at=datetime.now(UTC))
    )
    db.commit()
