from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import AwareDatetime, Field

from app.contracts.common import Contract


class PaymentTerms(Contract):
    type: Literal[
        "advance_upi", "partial_advance", "credit_net_7", "credit_net_15", "credit_net_30"
    ]
    credit_days: int = Field(ge=0, le=30)
    upfront_pct: Decimal = Field(ge=0, le=100)
    balance_due_days: int = Field(ge=0, le=30)


class OfferLine(Contract):
    product_id: UUID
    sku: str
    quantity: Decimal = Field(gt=0, max_digits=14, decimal_places=3)
    unit: str
    unit_price: Decimal = Field(gt=0, max_digits=14, decimal_places=2)
    claimed_original_price: Decimal = Field(gt=0)
    claimed_discount_pct: Decimal = Field(ge=0, le=100)
    line_total: Decimal = Field(gt=0)


class OfferTerms(Contract):
    currency: Literal["INR"] = "INR"
    lines: list[OfferLine] = Field(min_length=1, max_length=100)
    total: Decimal = Field(gt=0)
    delivery_at: AwareDatetime
    payment_terms: PaymentTerms
    expires_at: AwareDatetime
    seller_note: str = Field(default="", max_length=2000)
    tax_representation: Literal["not_modeled"] = "not_modeled"


class AgentEnvelope(Contract):
    message_id: UUID
    protocol_version: Literal["vanik.a2a.v1"] = "vanik.a2a.v1"
    message_type: Literal[
        "REQUEST_FOR_QUOTE",
        "OFFER",
        "COUNTER_OFFER",
        "ACCEPT",
        "REJECT",
        "WITHDRAW",
        "FINAL_OFFER",
        "EXPIRE",
        "SECURITY_REPORT",
    ]
    sender_agent_id: UUID
    recipient_agent_id: UUID
    sender_principal_id: UUID
    negotiation_id: UUID
    task_id: UUID
    created_at: AwareDatetime
    nonce: str = Field(min_length=20, max_length=64)
    key_version: int = Field(ge=1)
    payload: dict[str, object]
    payload_hash: str = Field(pattern=r"^[a-f0-9]{64}$")
    signature: str


class OfferResponse(Contract):
    id: UUID
    negotiation_id: UUID
    seller_principal_id: UUID
    seller_agent_id: UUID
    version: int
    terms: OfferTerms
    terms_hash: str
    valid: bool
    validation: dict[str, object]
    ranking: dict[str, object]


class NegotiationResponse(Contract):
    id: UUID
    task_id: UUID
    seller_principal_id: UUID
    seller_agent_id: UUID
    state: str
    round_no: int
    offers: list[OfferResponse]
    messages: list[AgentEnvelope]


class NegotiationListResponse(Contract):
    task_id: UUID
    items: list[NegotiationResponse]
    recommendation_offer_id: UUID | None


class AcceptOfferRequest(Contract):
    offer_id: UUID


class SellerRFQListResponse(Contract):
    items: list[NegotiationResponse]


class DealResponse(Contract):
    id: UUID
    task_id: UUID
    version: int
    status: str
    buyer_principal_id: UUID
    seller_principal_id: UUID
    amount: Decimal
    currency: Literal["INR"] = "INR"
    snapshot: dict[str, object]
    terms_hash: str
    expires_at: AwareDatetime
    label: Literal["SIMULATED / NO REAL PAYMENT"] = "SIMULATED / NO REAL PAYMENT"


class DealListResponse(Contract):
    items: list[DealResponse]


class ApprovalChallengeResponse(Contract):
    challenge_id: UUID
    deal_id: UUID
    deal_version: int
    terms_hash: str
    nonce: str
    expires_at: AwareDatetime


class ApproveRequest(Contract):
    challenge_id: UUID
    deal_version: int = Field(ge=1)
    terms_hash: str
    nonce: str = Field(min_length=20, max_length=64)


class ReceiptResponse(Contract):
    id: UUID
    deal_id: UUID
    amount: Decimal
    contracted_total: Decimal
    balance_due: Decimal
    currency: Literal["INR"] = "INR"
    status: Literal["succeeded"] = "succeeded"
    reference: str
    created_at: AwareDatetime
    label: Literal["MOCK UPI / NO FUNDS MOVED"] = "MOCK UPI / NO FUNDS MOVED"


class EventResponse(Contract):
    id: UUID
    event_type: str
    actor_type: str
    entity_type: str
    entity_id: UUID
    payload: dict[str, object]
    created_at: AwareDatetime


class ReplayResponse(Contract):
    task_id: UUID
    events: list[EventResponse]


class SecurityIncidentResponse(Contract):
    id: UUID
    incident_type: str
    agent_id: UUID
    principal_id: UUID
    evidence: dict[str, object]
    action: str
    status: str
    created_at: AwareDatetime


class SecurityIncidentListResponse(Contract):
    items: list[SecurityIncidentResponse]


class SupplierMemoryResponse(Contract):
    id: UUID
    seller_principal_id: UUID
    event_id: UUID
    memory_type: str
    score: Decimal
    confidence: Decimal
    evidence: dict[str, object]
    status: str
    created_at: AwareDatetime


class SupplierMemoryListResponse(Contract):
    items: list[SupplierMemoryResponse]


class NotificationResponse(Contract):
    id: UUID
    text: str
    status: str
    created_at: AwareDatetime


class NotificationListResponse(Contract):
    items: list[NotificationResponse]


class MemoryDisputeRequest(Contract):
    reason: str = Field(min_length=1, max_length=500)


class MemoryCorrectionRequest(Contract):
    score: Decimal = Field(ge=0, le=1)
    confidence: Decimal = Field(ge=0, le=1)
    reason: str = Field(min_length=1, max_length=500)


class NotificationAckRequest(Contract):
    delivered: bool


class TelegramNaturalTaskRequest(Contract):
    telegram_user_id: str = Field(pattern=r"^[1-9][0-9]{0,19}$")
    text: str = Field(min_length=1, max_length=2000)


class NaturalTaskRequest(Contract):
    principal_id: UUID
    agent_id: UUID
    text: str = Field(min_length=1, max_length=2000)
