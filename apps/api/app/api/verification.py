"""Synthetic business-identifier and verification routes."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_settings, require_allowed_origin, require_csrf
from app.contracts.common import ErrorResponse
from app.contracts.verification import (
    BusinessIdentifierCreateRequest,
    BusinessIdentifierResponse,
    DemoVerificationResponse,
)
from app.db.session import get_session
from app.services.auth import AuthContext
from app.services.verification import (
    IdentifierConflictError,
    VerificationAccessError,
    VerificationNotReadyError,
    add_identifier,
    demo_verify,
)

router = APIRouter(prefix="/v1/principals/{principal_id}", tags=["verification"])


@router.post(
    "/identifiers",
    status_code=status.HTTP_201_CREATED,
    response_model=BusinessIdentifierResponse,
    responses={403: {"model": ErrorResponse}, 409: {"model": ErrorResponse}},
)
def create_identifier(
    request: Request,
    principal_id: UUID,
    payload: BusinessIdentifierCreateRequest,
    context: Annotated[AuthContext, Depends(require_csrf)],
    db: Annotated[Session, Depends(get_session)],
    _origin: Annotated[None, Depends(require_allowed_origin)],
) -> BusinessIdentifierResponse:
    try:
        return add_identifier(db, context, principal_id, payload, get_settings(request))
    except VerificationAccessError as exc:
        raise HTTPException(status_code=403) from exc
    except IdentifierConflictError as exc:
        raise HTTPException(status_code=409) from exc


@router.post(
    "/verification/demo",
    response_model=DemoVerificationResponse,
    responses={403: {"model": ErrorResponse}, 409: {"model": ErrorResponse}},
)
def verify_demo(
    request: Request,
    principal_id: UUID,
    context: Annotated[AuthContext, Depends(require_csrf)],
    db: Annotated[Session, Depends(get_session)],
    _origin: Annotated[None, Depends(require_allowed_origin)],
) -> DemoVerificationResponse:
    try:
        return demo_verify(db, context, principal_id, get_settings(request))
    except VerificationAccessError as exc:
        raise HTTPException(status_code=403) from exc
    except VerificationNotReadyError as exc:
        raise HTTPException(status_code=409) from exc
