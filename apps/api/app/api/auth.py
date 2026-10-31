from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.api.dependencies import (
    get_auth_context,
    get_settings,
    require_allowed_origin,
    require_auth_attempt_allowed,
    require_csrf,
)
from app.contracts.common import ErrorResponse
from app.contracts.identity import LoginRequest, RegisterRequest, SessionResponse, UserResponse
from app.db.models import User
from app.db.session import get_session
from app.services.auth import (
    AuthContext,
    AuthenticationFailedError,
    EmailAlreadyRegisteredError,
    authenticate_user,
    register_user,
    revoke_session,
    session_expires_at,
    user_created_at,
)

router = APIRouter(prefix="/v1/auth", tags=["authentication"])


def user_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        email=user.email,
        display_name=user.display_name,
        created_at=user_created_at(user),
    )


def session_response(context: AuthContext) -> SessionResponse:
    return SessionResponse(
        user=user_response(context.user),
        expires_at=session_expires_at(context),
        csrf_token=context.csrf_token,
    )


@router.post(
    "/register",
    status_code=status.HTTP_201_CREATED,
    response_model=UserResponse,
    responses={409: {"model": ErrorResponse}},
)
def register(
    payload: RegisterRequest,
    db: Annotated[Session, Depends(get_session)],
    _access: Annotated[None, Depends(require_auth_attempt_allowed)],
) -> UserResponse:
    try:
        user = register_user(db, payload)
    except EmailAlreadyRegisteredError as exc:
        raise HTTPException(status_code=409) from exc
    return user_response(user)


@router.post(
    "/login",
    response_model=SessionResponse,
    responses={401: {"model": ErrorResponse}},
)
def login(
    request: Request,
    response: Response,
    payload: LoginRequest,
    db: Annotated[Session, Depends(get_session)],
    _access: Annotated[None, Depends(require_auth_attempt_allowed)],
) -> SessionResponse:
    settings = get_settings(request)
    try:
        issued = authenticate_user(db, payload, settings)
    except AuthenticationFailedError as exc:
        raise HTTPException(status_code=401) from exc
    response.set_cookie(
        settings.session_cookie_name,
        issued.session_token,
        max_age=settings.session_duration_hours * 3600,
        expires=session_expires_at(issued.context),
        path="/",
        secure=settings.app_env == "production",
        httponly=True,
        samesite="lax",
    )
    return session_response(issued.context)


@router.get("/session", response_model=SessionResponse, responses={401: {"model": ErrorResponse}})
def get_current_session(
    context: Annotated[AuthContext, Depends(get_auth_context)],
) -> SessionResponse:
    return session_response(context)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    request: Request,
    response: Response,
    context: Annotated[AuthContext, Depends(require_csrf)],
    db: Annotated[Session, Depends(get_session)],
    _origin: Annotated[None, Depends(require_allowed_origin)],
) -> None:
    settings = get_settings(request)
    revoke_session(db, context)
    response.delete_cookie(
        settings.session_cookie_name,
        path="/",
        secure=settings.app_env == "production",
        httponly=True,
        samesite="lax",
    )
