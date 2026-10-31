import json
from decimal import Decimal
from typing import Literal

import pytest  # type: ignore[import-not-found, unused-ignore]
from pydantic import ValidationError

from app.contracts.identity import PrincipalCreateRequest, RegisterRequest
from app.contracts.passport import AgentPassportResponse, MarketRating, PublicSigningKey
from scripts.export_schemas import MODELS, SCHEMA_DIRECTORY

FIXTURE_DIRECTORY = SCHEMA_DIRECTORY / "fixtures"


@pytest.mark.parametrize(  # type: ignore[untyped-decorator, unused-ignore]
    "name", sorted(MODELS)
)
def test_examples_validate_against_published_models(name: str) -> None:
    raw = json.loads((FIXTURE_DIRECTORY / f"{name}.json").read_text())
    parsed = MODELS[name].model_validate(raw)
    if not name.endswith("Request"):
        assert parsed.model_dump(mode="json") == raw


@pytest.mark.parametrize(  # type: ignore[untyped-decorator, unused-ignore]
    "name", sorted(MODELS)
)
def test_exported_schemas_match_their_source(name: str) -> None:
    mode: Literal["validation", "serialization"] = (
        "validation" if name.endswith("Request") else "serialization"
    )
    expected = MODELS[name].model_json_schema(mode=mode)
    expected["$schema"] = "https://json-schema.org/draft/2020-12/schema"
    expected["$id"] = f"https://vanik.invalid/schemas/v1/{name}.schema.json"
    actual = json.loads((SCHEMA_DIRECTORY / f"{name}.schema.json").read_text())
    assert actual == expected


def test_registration_does_not_allow_permission_escalation_fields() -> None:
    raw = json.loads((FIXTURE_DIRECTORY / "RegisterRequest.json").read_text())
    raw["membership_role"] = "owner"
    with pytest.raises(ValidationError, match="Extra inputs"):
        RegisterRequest.model_validate(raw)


def test_naive_timestamps_are_rejected() -> None:
    raw = json.loads((FIXTURE_DIRECTORY / "AgentPassportResponse.json").read_text())
    raw["created_at"] = "2026-10-31T10:00:00"
    with pytest.raises(ValidationError, match="timezone"):
        AgentPassportResponse.model_validate(raw)


def test_principal_roles_schema_publishes_uniqueness() -> None:
    schema = PrincipalCreateRequest.model_json_schema(mode="validation")
    assert schema["properties"]["roles"]["uniqueItems"] is True


def test_duplicate_business_roles_are_rejected() -> None:
    raw = json.loads((FIXTURE_DIRECTORY / "PrincipalCreateRequest.json").read_text())
    raw["roles"] = ["buyer", "buyer"]
    with pytest.raises(ValidationError, match="unique"):
        PrincipalCreateRequest.model_validate(raw)


def test_public_key_fingerprint_must_match() -> None:
    raw = json.loads((FIXTURE_DIRECTORY / "AgentPassportResponse.json").read_text())["signing_key"]
    raw["fingerprint"] = "sha256:" + "0" * 64
    with pytest.raises(ValidationError, match="does not match"):
        PublicSigningKey.model_validate(raw)


def test_market_rating_requires_outcomes() -> None:
    with pytest.raises(ValidationError, match="requires verified outcomes"):
        MarketRating(value=Decimal("4.5"), verified_outcome_count=0, evidence_is_simulated=True)
