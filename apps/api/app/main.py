from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session, sessionmaker
from starlette.middleware.base import RequestResponseEndpoint
from starlette.responses import Response

from app import __version__
from app.api.auth import router as auth_router
from app.api.health import router as health_router
from app.api.principals import router as principals_router
from app.api.verification import router as verification_router
from app.core.config import Settings
from app.core.errors import install_error_handlers, unexpected_error_response
from app.core.rate_limit import AuthAttemptLimiter
from app.db.session import create_database_engine


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        engine = create_database_engine(settings)
        app.state.session_factory = sessionmaker(engine, class_=Session)
        try:
            yield
        finally:
            engine.dispose()

    app = FastAPI(title="VANIK API", version=__version__, lifespan=lifespan)
    app.state.settings = settings
    app.state.auth_limiter = AuthAttemptLimiter(settings.auth_attempts_per_minute)

    @app.middleware("http")
    async def request_id(request: Request, call_next: RequestResponseEndpoint) -> Response:
        request.state.request_id = uuid4()
        try:
            response = await call_next(request)
        except Exception as exc:
            # Convert unexpected boundary failures without leaking a traceback to server logs.
            response = unexpected_error_response(request, exc)
        response.headers.update({"X-Request-ID": str(request.state.request_id)})
        if request.url.path.startswith("/v1/"):
            # Business responses can contain principal-scoped data and must not be shared.
            response.headers.update({"Cache-Control": "no-store"})
        return response

    # CORS wraps the error boundary so allowed browser clients can read errors too.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "X-CSRF-Token", "Idempotency-Key"],
        expose_headers=["X-Request-ID"],
    )

    install_error_handlers(app)
    app.include_router(health_router)
    app.include_router(auth_router)
    app.include_router(principals_router)
    app.include_router(verification_router)
    return app
