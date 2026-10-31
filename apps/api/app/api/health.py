from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app import __version__
from app.contracts.common import ErrorResponse, HealthResponse, ReadinessResponse
from app.db.session import get_session

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(version=__version__)


@router.get(
    "/health/ready",
    response_model=ReadinessResponse,
    responses={503: {"model": ErrorResponse}},
)
def readiness(session: Annotated[Session, Depends(get_session)]) -> ReadinessResponse:
    try:
        session.execute(text("SELECT 1"))
    except SQLAlchemyError as exc:
        raise HTTPException(status_code=503) from exc
    return ReadinessResponse()
