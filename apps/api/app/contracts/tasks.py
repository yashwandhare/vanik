from datetime import UTC, datetime
from decimal import Decimal
from typing import Literal, Self
from uuid import UUID

from pydantic import AwareDatetime, Field, field_validator, model_validator

from app.contracts.common import Contract
from app.contracts.pagination import Pagination

TaskStatus = Literal[
    "created", "cancelled", "expired", "running", "awaiting_approval", "completed", "failed"
]
PERMITTED_TASK_ACTIONS = frozenset({"request_quote", "evaluate_offers"})
PERMITTED_TASK_TOOLS = frozenset({"marketplace_search", "benchmark_compare"})


class LineItemRequest(Contract):
    sku: str = Field(min_length=1, max_length=40)
    quantity: Decimal = Field(gt=0, max_digits=14, decimal_places=3)
    unit: str = Field(min_length=1, max_length=32)


class TaskCreateRequest(Contract):
    principal_id: UUID
    agent_id: UUID
    objective: str = Field(min_length=1, max_length=500)
    category: Literal["procurement"] = "procurement"
    lines: list[LineItemRequest] = Field(min_length=1, max_length=100)
    budget: Decimal = Field(gt=0, max_digits=18, decimal_places=2)
    currency: Literal["INR"] = "INR"
    delivery_deadline: AwareDatetime
    expires_at: AwareDatetime
    priorities: dict[str, Decimal] = Field(min_length=1, max_length=5)
    allowed_tools: list[str] = Field(
        default_factory=lambda: ["marketplace_search"],
        max_length=30,
        json_schema_extra={"uniqueItems": True},
    )
    permitted_actions: list[str] = Field(
        default_factory=lambda: ["request_quote", "evaluate_offers"],
        max_length=30,
        json_schema_extra={"uniqueItems": True},
    )
    max_rounds: int = Field(default=3, ge=1, le=5)
    requires_human_approval: Literal[True] = True

    @field_validator("priorities")
    @classmethod
    def valid_weights(cls, values: dict[str, Decimal]) -> dict[str, Decimal]:
        if set(values) - {"price", "reliability", "delivery", "credit", "availability"}:
            raise ValueError("Unknown priority factor")
        if any(not value.is_finite() or not 0 <= value <= 1 for value in values.values()):
            raise ValueError("Priority weights must be finite values between zero and one")
        if sum(values.values(), Decimal(0)) != Decimal(1):
            raise ValueError("Priority weights must sum exactly to one")
        return values

    @model_validator(mode="after")
    def validate_mandate(self) -> Self:
        now = datetime.now(UTC)
        if self.expires_at <= now or self.delivery_deadline <= now:
            raise ValueError("Mandate expiry and deadline must be in the future")
        if self.expires_at > self.delivery_deadline:
            raise ValueError("Mandate expiry cannot exceed delivery deadline")
        if len({line.sku for line in self.lines}) != len(self.lines):
            raise ValueError("Mandate SKUs must be distinct")
        for values, permitted in (
            (self.allowed_tools, PERMITTED_TASK_TOOLS),
            (self.permitted_actions, PERMITTED_TASK_ACTIONS),
        ):
            if len(set(values)) != len(values) or not set(values) <= permitted:
                raise ValueError("Mandate permissions must be distinct allowed values")
        return self


class TaskResponse(Contract):
    id: UUID
    version: int
    principal_id: UUID
    agent_id: UUID
    mandate: dict[str, object]
    status: TaskStatus
    created_at: AwareDatetime


class TaskListResponse(Contract):
    items: list[TaskResponse]
    pagination: Pagination
