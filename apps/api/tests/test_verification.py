from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import BusinessIdentifier

ORIGIN = "http://localhost:3000"
PASSWORD = "demo-not-a-real-password"


def authenticated_principal(client: TestClient) -> tuple[str, str]:
    client.post(
        "/v1/auth/register",
        json={"email": "verify@example.com", "password": PASSWORD, "display_name": "Owner"},
        headers={"Origin": ORIGIN},
    )
    login = client.post(
        "/v1/auth/login",
        json={"email": "verify@example.com", "password": PASSWORD},
        headers={"Origin": ORIGIN},
    )
    csrf = login.json()["csrf_token"]
    principal = client.post(
        "/v1/principals",
        json={
            "legal_name": "Synthetic Verification Business",
            "trade_name": "Synthetic Verify",
            "business_type": "test",
            "address": "Synthetic address",
            "contact_email": "verify@example.com",
            "roles": ["buyer"],
        },
        headers={"Origin": ORIGIN, "X-CSRF-Token": csrf},
    )
    return principal.json()["id"], csrf


def test_identifier_is_hashed_masked_and_never_returned_raw(
    client: TestClient, db: Session
) -> None:
    principal_id, csrf = authenticated_principal(client)
    raw_value = "SYNTHETICGSTIN1234"
    response = client.post(
        f"/v1/principals/{principal_id}/identifiers",
        json={"identifier_type": "gstin", "value": raw_value, "is_synthetic": True},
        headers={"Origin": ORIGIN, "X-CSRF-Token": csrf},
    )
    assert response.status_code == 201
    assert raw_value not in response.text
    assert response.json()["masked_value"].endswith("1234")
    stored = db.scalar(select(BusinessIdentifier))
    assert stored is not None
    assert stored.value_digest != raw_value
    assert raw_value not in stored.masked_value


def test_identifier_requires_explicit_synthetic_declaration(client: TestClient) -> None:
    principal_id, csrf = authenticated_principal(client)
    response = client.post(
        f"/v1/principals/{principal_id}/identifiers",
        json={"identifier_type": "pan", "value": "NOTREAL1234", "is_synthetic": False},
        headers={"Origin": ORIGIN, "X-CSRF-Token": csrf},
    )
    assert response.status_code == 422


def test_one_identifier_per_type_is_enforced(client: TestClient) -> None:
    principal_id, csrf = authenticated_principal(client)
    headers = {"Origin": ORIGIN, "X-CSRF-Token": csrf}
    first = client.post(
        f"/v1/principals/{principal_id}/identifiers",
        json={"identifier_type": "pan", "value": "SYNTHPAN1234", "is_synthetic": True},
        headers=headers,
    )
    second = client.post(
        f"/v1/principals/{principal_id}/identifiers",
        json={"identifier_type": "pan", "value": "SYNTHPAN5678", "is_synthetic": True},
        headers=headers,
    )
    assert first.status_code == 201
    assert second.status_code == 409


def test_demo_verification_requires_identifier_and_updates_evidence(
    client: TestClient, db: Session
) -> None:
    principal_id, csrf = authenticated_principal(client)
    headers = {"Origin": ORIGIN, "X-CSRF-Token": csrf}
    not_ready = client.post(f"/v1/principals/{principal_id}/verification/demo", headers=headers)
    assert not_ready.status_code == 409
    client.post(
        f"/v1/principals/{principal_id}/identifiers",
        json={"identifier_type": "udyam", "value": "SYNTHUDYAM1234", "is_synthetic": True},
        headers=headers,
    )
    verified = client.post(f"/v1/principals/{principal_id}/verification/demo", headers=headers)
    assert verified.status_code == 200
    assert verified.json()["verification_status"] == "demo_verified"
    assert verified.json()["label"] == "SIMULATED / DEMO"
    stored = db.scalar(select(BusinessIdentifier))
    assert stored is not None and stored.status == "demo_verified"
    principal = client.get(f"/v1/principals/{principal_id}")
    assert principal.json()["verification_status"] == "demo_verified"
