import json
from pathlib import Path
from typing import Literal

from pydantic import BaseModel

from app.contracts.common import ErrorResponse, HealthResponse, ReadinessResponse
from app.contracts.identity import (
    AgentCreateRequest,
    LoginRequest,
    PrincipalCreateRequest,
    PrincipalResponse,
    RegisterRequest,
    SessionResponse,
    UserResponse,
)
from app.contracts.pagination import AgentListResponse
from app.contracts.passport import AgentPassportResponse
from app.contracts.verification import (
    BusinessIdentifierCreateRequest,
    BusinessIdentifierResponse,
    DemoVerificationResponse,
)

MODELS: dict[str, type[BaseModel]] = {
    model.__name__: model
    for model in (
        ErrorResponse,
        HealthResponse,
        ReadinessResponse,
        RegisterRequest,
        LoginRequest,
        UserResponse,
        SessionResponse,
        PrincipalCreateRequest,
        PrincipalResponse,
        AgentCreateRequest,
        AgentPassportResponse,
        AgentListResponse,
        BusinessIdentifierCreateRequest,
        BusinessIdentifierResponse,
        DemoVerificationResponse,
    )
}
SCHEMA_DIRECTORY = Path(__file__).resolve().parents[3] / "packages/shared-schemas/v1"


def export_schemas() -> None:
    SCHEMA_DIRECTORY.mkdir(parents=True, exist_ok=True)
    for name, model in MODELS.items():
        # Serialization schemas describe response JSON (including decimal strings).
        mode: Literal["validation", "serialization"] = (
            "validation" if name.endswith("Request") else "serialization"
        )
        schema = model.model_json_schema(mode=mode)
        schema["$schema"] = "https://json-schema.org/draft/2020-12/schema"
        schema["$id"] = f"https://vanik.invalid/schemas/v1/{name}.schema.json"
        (SCHEMA_DIRECTORY / f"{name}.schema.json").write_text(
            json.dumps(schema, indent=2, sort_keys=True) + "\n", encoding="utf-8"
        )


if __name__ == "__main__":
    export_schemas()
