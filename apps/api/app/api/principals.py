from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_auth_context, require_allowed_origin, require_csrf
from app.contracts.common import ErrorResponse
from app.contracts.identity import PrincipalCreateRequest, PrincipalResponse
from app.db.session import get_session
from app.services.auth import AuthContext
from app.services.principals import (
    PrincipalNotFoundError,
    create_principal,
    get_authorized_principal,
)

router = APIRouter(prefix="/v1/principals", tags=["principals"])


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=PrincipalResponse,
    responses={401: {"model": ErrorResponse}, 403: {"model": ErrorResponse}},
)
def create(
    payload: PrincipalCreateRequest,
    context: Annotated[AuthContext, Depends(require_csrf)],
    db: Annotated[Session, Depends(get_session)],
    _origin: Annotated[None, Depends(require_allowed_origin)],
) -> PrincipalResponse:
    return create_principal(db, context, payload)


@router.get(
    "/{principal_id}",
    response_model=PrincipalResponse,
    responses={401: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
)
def get(
    principal_id: UUID,
    context: Annotated[AuthContext, Depends(get_auth_context)],
    db: Annotated[Session, Depends(get_session)],
) -> PrincipalResponse:
    try:
        return get_authorized_principal(db, context, principal_id)
    except PrincipalNotFoundError as exc:
        # Do not reveal whether a principal exists outside this user's memberships.
        raise HTTPException(status_code=404) from exc
