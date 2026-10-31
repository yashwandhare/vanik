import logging
from collections.abc import Mapping
from http import HTTPStatus
from uuid import UUID, uuid4

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException

from app.contracts.common import ErrorBody, ErrorDetail, ErrorResponse

logger = logging.getLogger(__name__)


def error_response(
    request: Request,
    status_code: int,
    code: str,
    message: str,
    details: list[ErrorDetail] | None = None,
    headers: Mapping[str, str] | None = None,
) -> JSONResponse:
    request_id: UUID = getattr(request.state, "request_id", uuid4())
    content = ErrorResponse(
        error=ErrorBody(
            code=code,
            message=message,
            details=details or [],
            request_id=request_id,
        )
    )
    return JSONResponse(
        status_code=status_code,
        content=content.model_dump(mode="json"),
        headers={**(headers or {}), "X-Request-ID": str(request_id)},
    )


def unexpected_error_response(request: Request, exc: Exception) -> JSONResponse:
    # Exception text and traceback may contain credentials or request values.
    logger.error(
        "Unhandled request failure request_id=%s exception_type=%s",
        getattr(request.state, "request_id", "unknown"),
        type(exc).__name__,
    )
    return error_response(request, 500, "internal_error", "An unexpected error occurred.")


def install_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(RequestValidationError)
    async def validation_error(request: Request, exc: RequestValidationError) -> JSONResponse:
        # Do not echo rejected values or validator messages that could contain secrets.
        details = [
            ErrorDetail(
                field=".".join(str(part) for part in error["loc"]),
                code=error["type"],
                message="Invalid or missing value.",
            )
            for error in exc.errors()
        ]
        return error_response(
            request, 422, "validation_error", "Request validation failed.", details
        )

    @app.exception_handler(HTTPException)
    async def http_error(request: Request, exc: HTTPException) -> JSONResponse:
        code = {
            400: "invalid_request",
            401: "unauthenticated",
            403: "forbidden",
            404: "not_found",
            405: "method_not_allowed",
            409: "conflict",
            429: "rate_limited",
            503: "service_unavailable",
        }.get(exc.status_code, "http_error")
        return error_response(
            request,
            exc.status_code,
            code,
            HTTPStatus(exc.status_code).phrase,
            headers=exc.headers,
        )
