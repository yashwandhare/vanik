from decimal import Decimal
from typing import Any
from uuid import UUID

from pydantic import Field, field_validator

from app.contracts.common import Contract
from app.contracts.identity import VerificationStatus
from app.contracts.pagination import Pagination


class ProductResponse(Contract):
    id: UUID
    sku: str
    name: str
    category: str
    unit: str
    benchmark_price: Decimal = Field(gt=0)
    attributes: dict[str, Any]
    active: bool


class ProductListResponse(Contract):
    items: list[ProductResponse]
    pagination: Pagination


class InventoryLineResponse(Contract):
    product: ProductResponse
    available_qty: Decimal = Field(ge=0)


class InventoryUpdateRequest(Contract):
    product_id: UUID
    stock_qty: Decimal = Field(ge=0, max_digits=14, decimal_places=3)


class InventoryResponse(Contract):
    principal_id: UUID
    agent_id: UUID
    items: list[InventoryLineResponse]
    pagination: Pagination


class SellerAgentSummary(Contract):
    agent_id: UUID
    name: str
    strategy_profile: str
    status: str


class SellerSummary(Contract):
    principal_id: UUID
    trade_name: str
    verification_status: VerificationStatus
    coverage: list[str]
    delivery_days: int = Field(ge=1)
    credit_days: list[int]
    available_sku_count: int = Field(ge=0)
    reliability_score: Decimal | None = Field(default=None, ge=0, le=1)
    reliability_evidence_count: int = Field(ge=0)
    evidence_is_simulated: bool
    agents: list[SellerAgentSummary]


class SellerListResponse(Contract):
    items: list[SellerSummary]
    pagination: Pagination


class SellerProfileRequest(Contract):
    coverage: list[str] = Field(
        min_length=1,
        max_length=30,
        json_schema_extra={
            "uniqueItems": True,
            "items": {"type": "string", "minLength": 1, "maxLength": 80, "pattern": r"\S"},
        },
    )
    delivery_days: int = Field(ge=1, le=30)
    credit_days: list[int] = Field(
        min_length=1,
        max_length=4,
        json_schema_extra={
            "uniqueItems": True,
            "items": {"type": "integer", "enum": [0, 7, 15, 30]},
        },
    )
    delivery_terms: str = Field(default="", max_length=500)
    payment_note: str = Field(default="", max_length=500)

    @field_validator("coverage")
    @classmethod
    def valid_coverage(cls, values: list[str]) -> list[str]:
        if len(set(values)) != len(values) or any(
            not value.strip() or len(value) > 80 for value in values
        ):
            raise ValueError("Coverage labels must be distinct nonempty values")
        return values

    @field_validator("credit_days")
    @classmethod
    def valid_credit(cls, values: list[int]) -> list[int]:
        if len(set(values)) != len(values) or not set(values) <= {0, 7, 15, 30}:
            raise ValueError("Credit terms must be distinct supported periods")
        return values


class SellerProfileResponse(Contract):
    seller: SellerSummary
    legal_name: str
    business_type: str
    address: str
    public_policies: dict[str, Any]
