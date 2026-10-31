from enum import StrEnum
from typing import Annotated
from uuid import UUID

from pydantic import AwareDatetime, EmailStr, Field, SecretStr, field_validator

from app.contracts.common import Contract

DisplayName = Annotated[str, Field(min_length=1, max_length=120)]


class BusinessRole(StrEnum):
    BUYER = "buyer"
    SELLER = "seller"


class MembershipRole(StrEnum):
    OWNER = "owner"
    ADMIN = "admin"
    OPERATOR = "operator"
    VIEWER = "viewer"


class VerificationStatus(StrEnum):
    NOT_SUBMITTED = "not_submitted"
    PENDING = "pending"
    DEMO_VERIFIED = "demo_verified"
    REJECTED = "rejected"


class AgentStatus(StrEnum):
    ACTIVE = "active"
    PAUSED = "paused"
    REVOKED = "revoked"


class RegisterRequest(Contract):
    email: EmailStr
    password: SecretStr = Field(min_length=12, max_length=128)
    display_name: DisplayName


class LoginRequest(Contract):
    email: EmailStr
    password: SecretStr = Field(min_length=1, max_length=128)


class UserResponse(Contract):
    id: UUID
    email: EmailStr
    display_name: DisplayName
    created_at: AwareDatetime


class SessionResponse(Contract):
    user: UserResponse
    expires_at: AwareDatetime
    csrf_token: str = Field(min_length=32, max_length=128)


class PrincipalCreateRequest(Contract):
    legal_name: DisplayName
    trade_name: DisplayName
    business_type: str = Field(min_length=1, max_length=80)
    address: str = Field(min_length=1, max_length=500)
    contact_email: EmailStr
    roles: list[BusinessRole] = Field(min_length=1, max_length=2)

    @field_validator("roles")
    @classmethod
    def unique_roles(cls, roles: list[BusinessRole]) -> list[BusinessRole]:
        if len(set(roles)) != len(roles):
            raise ValueError("Business roles must be unique")
        return roles


class PrincipalResponse(PrincipalCreateRequest):
    id: UUID
    verification_status: VerificationStatus
    membership_role: MembershipRole
    created_at: AwareDatetime


class AgentCreateRequest(Contract):
    name: DisplayName
    role: BusinessRole
    description: str = Field(default="", max_length=1000)
    capabilities: list[str] = Field(default_factory=list, max_length=30)
    allowed_tools: list[str] = Field(default_factory=list, max_length=30)
    strategy_profile: str = Field(default="default", min_length=1, max_length=80)
