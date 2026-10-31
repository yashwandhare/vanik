from datetime import UTC
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.contracts.identity import (
    BusinessRole,
    MembershipRole,
    PrincipalCreateRequest,
    PrincipalResponse,
    VerificationStatus,
)
from app.db.models import Principal, PrincipalMember
from app.services.auth import AuthContext, as_utc


class PrincipalNotFoundError(Exception):
    pass


def principal_response(principal: Principal, membership_role: str) -> PrincipalResponse:
    return PrincipalResponse(
        id=principal.id,
        legal_name=principal.legal_name,
        trade_name=principal.trade_name,
        business_type=principal.business_type,
        address=principal.address,
        contact_email=principal.contact_email,
        roles=[BusinessRole(role) for role in principal.roles],
        verification_status=VerificationStatus(principal.verification_status),
        membership_role=MembershipRole(membership_role),
        created_at=as_utc(principal.created_at).astimezone(UTC),
    )


def create_principal(
    db: Session, context: AuthContext, payload: PrincipalCreateRequest
) -> PrincipalResponse:
    principal = Principal(
        legal_name=payload.legal_name,
        trade_name=payload.trade_name,
        business_type=payload.business_type,
        address=payload.address,
        contact_email=str(payload.contact_email).casefold(),
        roles=[role.value for role in payload.roles],
    )
    db.add(principal)
    db.flush()
    membership = PrincipalMember(
        principal_id=principal.id,
        user_id=context.user.id,
        role=MembershipRole.OWNER.value,
    )
    db.add(membership)
    db.commit()
    db.refresh(principal)
    return principal_response(principal, membership.role)


def get_authorized_principal(
    db: Session, context: AuthContext, principal_id: UUID
) -> PrincipalResponse:
    row = db.execute(
        select(Principal, PrincipalMember)
        .join(PrincipalMember, PrincipalMember.principal_id == Principal.id)
        .where(
            Principal.id == principal_id,
            Principal.status == "active",
            PrincipalMember.user_id == context.user.id,
            PrincipalMember.status == "active",
        )
    ).one_or_none()
    if row is None:
        raise PrincipalNotFoundError
    principal, membership = row
    return principal_response(principal, membership.role)
