from pydantic import Field

from app.contracts.common import Contract
from app.contracts.passport import AgentPassportResponse


class Pagination(Contract):
    limit: int = Field(ge=1, le=100)
    offset: int = Field(ge=0)
    total: int = Field(ge=0)


class AgentListResponse(Contract):
    items: list[AgentPassportResponse]
    pagination: Pagination
