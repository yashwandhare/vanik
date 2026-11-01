from decimal import Decimal
from typing import Annotated, Literal, Self
from uuid import UUID

from pydantic import AwareDatetime, Field, field_validator, model_validator

from app.domain.common import DomainModel
from app.domain.types import FailureKind, PaymentType, RiskTier


class RfqLine(DomainModel):
    sku: str = Field(min_length=1, max_length=40)
    quantity: Decimal = Field(gt=0, max_digits=14, decimal_places=3)
    unit: str = Field(min_length=1, max_length=32)


class Rfq(DomainModel):
    negotiation_id: UUID
    lines: tuple[RfqLine, ...] = Field(min_length=1, max_length=100)
    delivery_deadline: AwareDatetime
    expires_at: AwareDatetime
    currency: Literal["INR"] = "INR"

    @field_validator("lines")
    @classmethod
    def unique_skus(cls, lines: tuple[RfqLine, ...]) -> tuple[RfqLine, ...]:
        if len({line.sku for line in lines}) != len(lines):
            raise ValueError("RFQ SKUs must be distinct")
        return lines


class TrustedReferencePrice(DomainModel):
    sku: str = Field(min_length=1, max_length=40)
    unit: str = Field(min_length=1, max_length=32)
    benchmark_price: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    source_event_id: UUID | None = None
    source: Literal["seeded_benchmark"] = "seeded_benchmark"
    trusted: Literal[True] = True


class StockLine(DomainModel):
    sku: str = Field(min_length=1, max_length=40)
    unit: str = Field(min_length=1, max_length=32)
    available_qty: Decimal = Field(ge=0, max_digits=14, decimal_places=3)


class FloorPrice(DomainModel):
    sku: str = Field(min_length=1, max_length=40)
    unit: str = Field(min_length=1, max_length=32)
    min_unit_price: Decimal = Field(gt=0, max_digits=12, decimal_places=2)


class MarginConfig(DomainModel):
    kind: Literal["margin"] = "margin"
    target_margin_pct: Decimal = Field(ge=0, le=1, max_digits=6, decimal_places=4)
    max_concession_pct: Decimal = Field(ge=0, le=1, max_digits=6, decimal_places=4)


class ClearanceConfig(DomainModel):
    kind: Literal["clearance"] = "clearance"
    initial_discount_pct: Decimal = Field(ge=0, le=1, max_digits=6, decimal_places=4)
    max_concession_pct: Decimal = Field(ge=0, le=1, max_digits=6, decimal_places=4)


class PaymentRiskConfig(DomainModel):
    kind: Literal["payment_risk"] = "payment_risk"
    low_risk_margin_pct: Decimal = Field(ge=0, le=1, max_digits=6, decimal_places=4)
    medium_risk_surcharge_pct: Decimal = Field(ge=0, le=1, max_digits=6, decimal_places=4)
    high_risk_surcharge_pct: Decimal = Field(ge=0, le=1, max_digits=6, decimal_places=4)
    max_concession_pct: Decimal = Field(ge=0, le=1, max_digits=6, decimal_places=4)


class AdversarialConfig(DomainModel):
    kind: Literal["adversarial"] = "adversarial"
    fake_original_multiplier: Decimal = Field(ge=1, le=10, max_digits=6, decimal_places=4)
    injection_note: str = Field(min_length=1, max_length=2000)


SellerStrategyConfig = Annotated[
    MarginConfig | ClearanceConfig | PaymentRiskConfig | AdversarialConfig,
    Field(discriminator="kind"),
]


class SellerPolicy(DomainModel):
    seller_principal_id: UUID
    seller_agent_id: UUID
    delivery_days: int = Field(ge=1, le=90)
    allowed_payment_types: tuple[PaymentType, ...] = Field(min_length=1, max_length=5)
    max_credit_days: int = Field(ge=0, le=90)
    min_upfront_pct: Decimal = Field(ge=0, le=100, max_digits=5, decimal_places=2)
    offer_validity_minutes: int = Field(ge=1, le=1440)
    floor_prices: tuple[FloorPrice, ...] = Field(min_length=1, max_length=100)
    delivery_terms: str = Field(default="Delivered to buyer address", max_length=500)
    config: SellerStrategyConfig

    @field_validator("allowed_payment_types")
    @classmethod
    def unique_payment_types(cls, values: tuple[PaymentType, ...]) -> tuple[PaymentType, ...]:
        if len(set(values)) != len(values):
            raise ValueError("Payment types must be distinct")
        return values

    @field_validator("floor_prices")
    @classmethod
    def unique_floor_skus(cls, values: tuple[FloorPrice, ...]) -> tuple[FloorPrice, ...]:
        if len({value.sku for value in values}) != len(values):
            raise ValueError("Floor price SKUs must be distinct")
        return values

    @model_validator(mode="after")
    def credit_policy_is_consistent(self) -> Self:
        has_credit_type = any(
            payment_type.startswith("credit_net_") for payment_type in self.allowed_payment_types
        )
        if has_credit_type and self.max_credit_days == 0:
            raise ValueError("Credit payment types require a positive credit limit")
        return self


class BuyerRiskCredential(DomainModel):
    risk_tier: RiskTier
    max_credit_days: int = Field(ge=0, le=90)
    required_upfront_pct: Decimal = Field(ge=0, le=100, max_digits=5, decimal_places=2)
    synthetic: Literal[True] = True
    evidence_source: Literal["synthetic_demo"] = "synthetic_demo"
    label: str = Field(default="SYNTHETIC DEMO RISK CREDENTIAL", max_length=120)


class FailureSimulation(DomainModel):
    kind: FailureKind
    round_index: int | None = Field(default=None, ge=1)
    detail: str = Field(default="Simulated seller failure", max_length=500)


class SellerStrategyContext(DomainModel):
    rfq: Rfq
    reference_prices: tuple[TrustedReferencePrice, ...] = Field(min_length=1, max_length=100)
    stock: tuple[StockLine, ...] = Field(min_length=1, max_length=100)
    policy: SellerPolicy
    buyer_risk: BuyerRiskCredential
    round_index: int = Field(ge=1)
    max_rounds: int = Field(ge=1, le=20)
    now: AwareDatetime
    failure_simulation: FailureSimulation | None = None

    @field_validator("reference_prices")
    @classmethod
    def unique_reference_skus(
        cls, values: tuple[TrustedReferencePrice, ...]
    ) -> tuple[TrustedReferencePrice, ...]:
        if len({value.sku for value in values}) != len(values):
            raise ValueError("Reference price SKUs must be distinct")
        return values

    @field_validator("stock")
    @classmethod
    def unique_stock_skus(cls, values: tuple[StockLine, ...]) -> tuple[StockLine, ...]:
        if len({value.sku for value in values}) != len(values):
            raise ValueError("Stock SKUs must be distinct")
        return values


class SellerFailure(DomainModel):
    kind: FailureKind
    negotiation_id: UUID
    seller_agent_id: UUID
    seller_principal_id: UUID
    round_index: int = Field(ge=1)
    detail: str = Field(min_length=1, max_length=500)
    synthetic: Literal[True] = True
