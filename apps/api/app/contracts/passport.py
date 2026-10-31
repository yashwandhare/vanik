import base64
import binascii
import hashlib
from decimal import Decimal
from typing import Literal, Self
from uuid import UUID

from pydantic import AwareDatetime, Field, model_validator

from app.contracts.common import Contract
from app.contracts.identity import AgentCreateRequest, AgentStatus, VerificationStatus


class PublicSigningKey(Contract):
    algorithm: Literal["Ed25519"] = "Ed25519"
    public_key: str
    fingerprint: str = Field(pattern=r"^sha256:[0-9a-f]{64}$")
    key_version: int = Field(ge=1)

    @model_validator(mode="after")
    def validate_public_key(self) -> Self:
        try:
            raw = base64.b64decode(self.public_key, validate=True)
        except (binascii.Error, ValueError) as exc:
            raise ValueError("Public signing key must be valid base64") from exc
        if len(raw) != 32:
            raise ValueError("Ed25519 public signing key must contain 32 bytes")
        expected = "sha256:" + hashlib.sha256(raw).hexdigest()
        if self.fingerprint != expected:
            raise ValueError("Public key fingerprint does not match the public key")
        return self


class MarketRating(Contract):
    value: Decimal | None = Field(default=None, ge=0, le=5)
    verified_outcome_count: int = Field(ge=0)
    evidence_is_simulated: bool

    @model_validator(mode="after")
    def require_rating_evidence(self) -> Self:
        if self.value is not None and self.verified_outcome_count == 0:
            raise ValueError("A market rating requires verified outcomes")
        return self


class TrustConfidence(Contract):
    level: Literal["limited", "medium", "high"]
    evidence_count: int = Field(ge=0)
    summary: str = Field(max_length=1000)
    evidence_is_simulated: bool


class SecuritySummary(Contract):
    status: Literal["no_incidents_recorded", "review_needed", "restricted"]
    incident_count: int = Field(ge=0)


class AgentPassportResponse(AgentCreateRequest):
    agent_id: UUID
    principal_id: UUID
    passport_version: int = Field(ge=1)
    agent_status: AgentStatus
    verification_status: VerificationStatus
    signing_key: PublicSigningKey
    market_rating: MarketRating
    trust_confidence: TrustConfidence
    security: SecuritySummary
    created_at: AwareDatetime
    updated_at: AwareDatetime
