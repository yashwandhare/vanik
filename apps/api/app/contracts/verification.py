from enum import StrEnum
from typing import Literal
from uuid import UUID

from pydantic import AwareDatetime, Field, SecretStr

from app.contracts.common import Contract
from app.contracts.identity import VerificationStatus


class IdentifierType(StrEnum):
    PAN = "pan"
    GSTIN = "gstin"
    UDYAM = "udyam"
    CIN = "cin"
    LLPIN = "llpin"


class BusinessIdentifierCreateRequest(Contract):
    identifier_type: IdentifierType
    value: SecretStr = Field(min_length=4, max_length=64)
    is_synthetic: Literal[True]


class BusinessIdentifierResponse(Contract):
    id: UUID
    principal_id: UUID
    identifier_type: IdentifierType
    masked_value: str
    status: VerificationStatus
    is_synthetic: Literal[True] = True
    created_at: AwareDatetime


class DemoVerificationResponse(Contract):
    principal_id: UUID
    verification_status: Literal[VerificationStatus.DEMO_VERIFIED]
    label: Literal["SIMULATED / DEMO"] = "SIMULATED / DEMO"
    verified_at: AwareDatetime
