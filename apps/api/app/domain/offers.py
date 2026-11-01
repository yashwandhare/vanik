from datetime import date
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import AwareDatetime, Field

from app.domain.common import DomainModel
from app.domain.types import PaymentType


class PaymentTerms(DomainModel):
    type: PaymentType
    credit_days: int = Field(ge=0, le=90)
    upfront_pct: Decimal = Field(ge=0, le=100, max_digits=5, decimal_places=2)
    balance_due_days: int = Field(ge=0, le=90)


class OfferLine(DomainModel):
    sku: str = Field(min_length=1, max_length=40)
    quantity: Decimal = Field(gt=0, max_digits=14, decimal_places=3)
    unit: str = Field(min_length=1, max_length=32)
    unit_price: Decimal = Field(ge=0, max_digits=14, decimal_places=2)
    discount: Decimal = Field(ge=0, max_digits=14, decimal_places=2)
    claimed_original_unit_price: Decimal | None = Field(
        default=None, gt=0, max_digits=14, decimal_places=2
    )
    line_total: Decimal = Field(ge=0, max_digits=18, decimal_places=2)


class OfferDraft(DomainModel):
    offer_id: UUID
    negotiation_id: UUID
    seller_agent_id: UUID
    seller_principal_id: UUID
    round_index: int = Field(ge=1)
    currency: Literal["INR"] = "INR"
    lines: tuple[OfferLine, ...] = Field(min_length=1, max_length=100)
    delivery_date: date
    delivery_terms: str = Field(default="Delivered to buyer address", max_length=500)
    payment_terms: PaymentTerms
    expires_at: AwareDatetime
    seller_note: str = Field(default="", max_length=2000)
    total: Decimal = Field(ge=0, max_digits=18, decimal_places=2)
    synthetic: Literal[True] = True
