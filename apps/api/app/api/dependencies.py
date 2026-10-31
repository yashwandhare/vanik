from typing import Annotated, cast

from fastapi import Cookie, Depends, Header, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.rate_limit import AuthAttemptLimiter
from app.db.session import get_session
from app.services.auth import AuthContext, load_auth_context, verify_csrf_token


def get_settings(request: Request) -> Settings:
    return cast(Settings, request.app.state.settings)


def require_allowed_origin(request: Request) -> None:
    settings = get_settings(request)
    if request.headers.get("origin") not in settings.cors_allowed_origins:
        raise HTTPException(status_code=403)


def require_auth_attempt_allowed(
    request: Request,
    _origin: Annotated[None, Depends(require_allowed_origin)],
) -> None:
    limiter = cast(AuthAttemptLimiter, request.app.state.auth_limiter)
    client = request.client.host if request.client is not None else "unknown"
    if not limiter.allow(client):
        raise HTTPException(status_code=429, headers={"Retry-After": "60"})


def get_auth_context(
    db: Annotated[Session, Depends(get_session)],
    session_token: Annotated[str | None, Cookie(alias="vanik_session")] = None,
) -> AuthContext:
    context = load_auth_context(db, session_token)
    if context is None:
        raise HTTPException(status_code=401)
    return context


def require_csrf(
    context: Annotated[AuthContext, Depends(get_auth_context)],
    csrf_token: Annotated[str | None, Header(alias="X-CSRF-Token")] = None,
) -> AuthContext:
    if not verify_csrf_token(context, csrf_token):
        raise HTTPException(status_code=403)
    return context
