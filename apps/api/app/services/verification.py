from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.contracts.identity import VerificationStatus
from app.contracts.verification import (
    BusinessIdentifierCreateRequest,
    BusinessIdentifierResponse,
    DemoVerificationResponse,
    IdentifierType,
)
from app.core.config import Settings
from app.core.security import digest_identifier, mask_identifier
from app.db.models import BusinessIdentifier, Principal, PrincipalMember
from app.services.auth import AuthContext, as_utc


class VerificationAccessError(Exception):
    pass


class IdentifierConflictError(Exception):
    pass


class VerificationNotReadyError(Exception):
    pass


def require_verification_manager(
    db: Session, context: AuthContext, principal_id: UUID
) -> Principal:
    membership = db.scalar(
        select(PrincipalMember).where(
            PrincipalMember.principal_id == principal_id,
            PrincipalMember.user_id == context.user.id,
            PrincipalMember.status == "active",
        )
    )
    principal = db.get(Principal, principal_id)
    if principal is None or principal.status != "active" or membership is None:
        raise VerificationAccessError
    if membership.role not in {"owner", "admin"}:
        raise VerificationAccessError
    return principal


def add_identifier(
    db: Session,
    context: AuthContext,
    principal_id: UUID,
    payload: BusinessIdentifierCreateRequest,
    settings: Settings,
) -> BusinessIdentifierResponse:
    require_verification_manager(db, context, principal_id)
    normalized = payload.value.get_secret_value().strip().upper()
    identifier = BusinessIdentifier(
        principal_id=principal_id,
        identifier_type=payload.identifier_type.value,
        value_digest=digest_identifier(normalized, settings.app_secret_key.get_secret_value()),
        masked_value=mask_identifier(normalized),
    )
    db.add(identifier)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        existing = db.scalar(
            select(BusinessIdentifier.id).where(
                BusinessIdentifier.principal_id == principal_id,
                BusinessIdentifier.identifier_type == payload.identifier_type.value,
            )
        )
        if existing is not None:
            raise IdentifierConflictError from exc
        raise
    db.refresh(identifier)
    return BusinessIdentifierResponse(
        id=identifier.id,
        principal_id=identifier.principal_id,
        identifier_type=IdentifierType(identifier.identifier_type),
        masked_value=identifier.masked_value,
        status=VerificationStatus(identifier.status),
        created_at=as_utc(identifier.created_at),
    )


def demo_verify(
    db: Session, context: AuthContext, principal_id: UUID, settings: Settings
) -> DemoVerificationResponse:
    if not settings.demo_verification_enabled:
        raise VerificationNotReadyError
    principal = require_verification_manager(db, context, principal_id)
    has_identifier = db.scalar(
        select(BusinessIdentifier.id)
        .where(BusinessIdentifier.principal_id == principal_id)
        .limit(1)
    )
    if has_identifier is None:
        raise VerificationNotReadyError
    verified_at = datetime.now(UTC)
    principal.verification_status = VerificationStatus.DEMO_VERIFIED.value
    principal.verification_updated_at = verified_at
    db.execute(
        update(BusinessIdentifier)
        .where(BusinessIdentifier.principal_id == principal_id)
        .values(status=VerificationStatus.DEMO_VERIFIED.value)
    )
    db.commit()
    return DemoVerificationResponse(
        principal_id=principal.id,
        verification_status=VerificationStatus.DEMO_VERIFIED,
        verified_at=verified_at,
    )
