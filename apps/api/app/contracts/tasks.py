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
TaskAction = Literal["request_quote", "evaluate_offers"]
TaskTool = Literal["marketplace_search", "benchmark_compare"]
PriorityName = Literal["price", "reliability", "delivery", "credit", "availability"]

PERMITTED_TASK_ACTIONS: frozenset[str] = frozenset({"request_quote", "evaluate_offers"})
PERMITTED_TASK_TOOLS: frozenset[str] = frozenset({"marketplace_search", "benchmark_compare"})


def default_task_tools() -> list[TaskTool]:
    return ["marketplace_search"]


def default_task_actions() -> list[TaskAction]:
    return ["request_quote", "evaluate_offers"]


class ProcurementPolicyRequest(Contract):
    max_budget_inr: Decimal = Field(gt=0, le=1000000, max_digits=18, decimal_places=2)
    max_credit_days: int = Field(ge=0, le=30)
    max_rounds: int = Field(ge=1, le=5)


class ProcurementPolicyResponse(ProcurementPolicyRequest):
    principal_id: UUID
    credit_score: int
    label: Literal["SYNTHETIC PROCUREMENT AUTHORITY"] = "SYNTHETIC PROCUREMENT AUTHORITY"


class LineItemRequest(Contract):
    sku: str = Field(min_length=1, max_length=40, pattern=r".*\S.*")
    quantity: Decimal = Field(gt=0, max_digits=14, decimal_places=3)
    unit: str = Field(min_length=1, max_length=32, pattern=r".*\S.*")


class TaskLineSnapshot(Contract):
    product_id: UUID
    sku: str = Field(min_length=1, max_length=40)
    quantity: Decimal = Field(gt=0, max_digits=14, decimal_places=3)
    unit: str = Field(min_length=1, max_length=32)


class TaskCreateRequest(Contract):
    principal_id: UUID
    agent_id: UUID
    objective: str = Field(min_length=1, max_length=500, pattern=r".*\S.*")
    category: Literal["procurement"] = "procurement"
    lines: list[LineItemRequest] = Field(min_length=1, max_length=100)
    budget: Decimal = Field(gt=0, max_digits=18, decimal_places=2)
    currency: Literal["INR"] = "INR"
    delivery_deadline: AwareDatetime
    expires_at: AwareDatetime
    priorities: dict[PriorityName, Decimal] = Field(min_length=1, max_length=5)
    allowed_tools: list[TaskTool] = Field(
        default_factory=default_task_tools,
        max_length=2,
        json_schema_extra={"uniqueItems": True},
    )
    permitted_actions: list[TaskAction] = Field(
        default_factory=default_task_actions,
        max_length=2,
        json_schema_extra={"uniqueItems": True},
    )
    max_rounds: int = Field(default=3, ge=1, le=5)
    min_credit_days: int = Field(default=0, ge=0, le=90)
    max_upfront_pct: Decimal = Field(
        default=Decimal("100"), ge=0, le=100, max_digits=5, decimal_places=2
    )
    requires_human_approval: Literal[True] = True

    @field_validator("priorities")
    @classmethod
    def valid_weights(cls, values: dict[PriorityName, Decimal]) -> dict[PriorityName, Decimal]:
        if any(not value.is_finite() or not 0 <= value <= 1 for value in values.values()):
            raise ValueError("Priority weights must be finite values between zero and one")
        if sum(values.values(), Decimal(0)) != Decimal(1):
            raise ValueError("Priority weights must sum exactly to one")
        return values

    @field_validator("allowed_tools", "permitted_actions")
    @classmethod
    def distinct_permissions(cls, values: list[str]) -> list[str]:
        if len(set(values)) != len(values):
            raise ValueError("Mandate permissions must be distinct")
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
        return self


class TaskMandateResponse(Contract):
    objective: str = Field(min_length=1, max_length=500)
    category: Literal["procurement"]
    lines: list[TaskLineSnapshot]
    budget: Decimal = Field(gt=0)
    currency: Literal["INR"]
    delivery_deadline: AwareDatetime
    expires_at: AwareDatetime
    priorities: dict[PriorityName, Decimal]
    allowed_tools: list[TaskTool]
    permitted_actions: list[TaskAction]
    max_rounds: int = Field(ge=1, le=5)
    min_credit_days: int = Field(ge=0, le=90)
    max_upfront_pct: Decimal = Field(ge=0, le=100, max_digits=5, decimal_places=2)
    requires_human_approval: Literal[True]


class TaskResponse(Contract):
    id: UUID
    version: int = Field(ge=1)
    principal_id: UUID
    agent_id: UUID
    mandate: TaskMandateResponse
    status: TaskStatus
    created_at: AwareDatetime


class TaskListResponse(Contract):
    items: list[TaskResponse]
    pagination: Pagination
