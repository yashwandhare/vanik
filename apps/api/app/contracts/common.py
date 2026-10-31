from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class Contract(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ErrorDetail(Contract):
    field: str
    code: str
    message: str


class ErrorBody(Contract):
    code: str
    message: str
    details: list[ErrorDetail] = Field(default_factory=list)
    request_id: UUID


class ErrorResponse(Contract):
    error: ErrorBody


class HealthResponse(Contract):
    status: Literal["ok"] = "ok"
    service: Literal["VANIK API"] = "VANIK API"
    version: str


class ReadinessResponse(Contract):
    status: Literal["ready"] = "ready"
    database: Literal["ok"] = "ok"
