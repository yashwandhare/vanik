from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.api.dependencies import (
    get_settings,
    require_allowed_origin,
    require_csrf,
    require_telegram_bot,
)
from app.contracts.common import ErrorResponse
from app.contracts.telegram import (
    TelegramLinkCompleteRequest,
    TelegramLinkResponse,
    TelegramLinkStartResponse,
)
from app.db.session import get_session
from app.services.auth import AuthContext
from app.services.telegram import (
    InvalidTelegramLinkCodeError,
    TelegramAlreadyLinkedError,
    complete_link,
    start_link,
    unlink,
)

router = APIRouter(prefix="/v1/telegram/link", tags=["telegram"])


@router.post("/start", response_model=TelegramLinkStartResponse)
def start(
    request: Request,
    context: Annotated[AuthContext, Depends(require_csrf)],
    db: Annotated[Session, Depends(get_session)],
    _origin: Annotated[None, Depends(require_allowed_origin)],
) -> TelegramLinkStartResponse:
    return start_link(db, context, get_settings(request))


@router.post(
    "/complete",
    response_model=TelegramLinkResponse,
    responses={
        400: {"model": ErrorResponse},
        401: {"model": ErrorResponse},
        409: {"model": ErrorResponse},
    },
)
def complete(
    payload: TelegramLinkCompleteRequest,
    db: Annotated[Session, Depends(get_session)],
    _bot: Annotated[None, Depends(require_telegram_bot)],
) -> TelegramLinkResponse:
    try:
        return complete_link(db, payload)
    except InvalidTelegramLinkCodeError as exc:
        raise HTTPException(status_code=400) from exc
    except TelegramAlreadyLinkedError as exc:
        raise HTTPException(status_code=409) from exc


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
def revoke(
    context: Annotated[AuthContext, Depends(require_csrf)],
    db: Annotated[Session, Depends(get_session)],
    _origin: Annotated[None, Depends(require_allowed_origin)],
) -> None:
    unlink(db, context)
