from uuid import UUID

from pydantic import AwareDatetime, Field, SecretStr

from app.contracts.common import Contract


class TelegramLinkStartResponse(Contract):
    link_code: str = Field(min_length=20, max_length=64)
    expires_at: AwareDatetime


class TelegramLinkCompleteRequest(Contract):
    link_code: SecretStr = Field(min_length=20, max_length=64)
    telegram_user_id: str = Field(pattern=r"^[1-9][0-9]{0,19}$")


class TelegramLinkResponse(Contract):
    id: UUID
    user_id: UUID
    telegram_user_id: str
    linked_at: AwareDatetime
