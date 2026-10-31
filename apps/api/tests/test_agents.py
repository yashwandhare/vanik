from copy import deepcopy
from uuid import UUID

import pytest  # type: ignore[import-not-found, unused-ignore]
from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import SecretStr
from sqlalchemy import event, func, select
from sqlalchemy.engine import Connection
from sqlalchemy.orm import Mapper, Session

from app.contracts.passport import AgentPassportResponse
from app.db.models import Agent, AgentKey, AuditEvent, Principal, PrincipalMember
from app.services.agents import AgentStateError, sign_agent_payload, verify_agent_payload

ORIGIN = "http://localhost:3000"
PASSWORD = "synthetic-agent-owner-password"
PAYLOAD = {
    "name": "Diwali buyer",
    "role": "buyer",
    "capabilities": ["request_quote"],
    "allowed_tools": ["marketplace_search"],
}


def setup_principal(client: TestClient, *, verified: bool = True) -> tuple[str, dict[str, str]]:
    assert (
        client.post(
            "/v1/auth/register",
            headers={"Origin": ORIGIN},
            json={
                "email": "agent@example.com",
                "password": PASSWORD,
                "display_name": "Agent owner",
            },
        ).status_code
        == 201
    )
    login = client.post(
        "/v1/auth/login",
        headers={"Origin": ORIGIN},
        json={"email": "agent@example.com", "password": PASSWORD},
    )
    headers = {"Origin": ORIGIN, "X-CSRF-Token": login.json()["csrf_token"]}
    response = client.post(
        "/v1/principals",
        headers=headers,
        json={
            "legal_name": "Synthetic Agent Business",
            "trade_name": "Demo",
            "business_type": "test",
            "address": "Synthetic address",
            "contact_email": "agent@example.com",
            "roles": ["buyer"],
        },
    )
    assert response.status_code == 201
    principal_id = response.json()["id"]
    if verified:
        assert (
            client.post(
                f"/v1/principals/{principal_id}/identifiers",
                headers=headers,
                json={"identifier_type": "pan", "value": "SYNTHETIC1234", "is_synthetic": True},
            ).status_code
            == 201
        )
        assert (
            client.post(
                f"/v1/principals/{principal_id}/verification/demo", headers=headers
            ).status_code
            == 200
        )
    return str(principal_id), headers


def test_agents_are_persistent_distinct_and_private_keys_stay_server_side(
    client: TestClient, db: Session
) -> None:
    principal_id, headers = setup_principal(client)
    path = f"/v1/principals/{principal_id}/agents"
    first = client.post(path, headers=headers, json=PAYLOAD)
    second = client.post(path, headers=headers, json=PAYLOAD)
    assert first.status_code == second.status_code == 201
    one = AgentPassportResponse.model_validate(first.json())
    two = AgentPassportResponse.model_validate(second.json())
    assert one.agent_id != two.agent_id
    assert one.signing_key.fingerprint != two.signing_key.fingerprint
    assert one.market_rating.value is None and one.market_rating.verified_outcome_count == 0
    assert one.trust_confidence.level == "limited"
    assert one.security.incident_count == 0
    assert "private" not in first.text and "ciphertext" not in first.text
    listed = client.get(path + "?limit=1&offset=1")
    assert listed.status_code == 200
    assert listed.json()["pagination"] == {"limit": 1, "offset": 1, "total": 2}
    assert len(listed.json()["items"]) == 1
    client.cookies.clear()
    public = client.get(f"/v1/agents/{one.agent_id}/passport")
    assert public.status_code == 200
    assert public.json() == first.json()
    assert db.scalar(select(func.count()).select_from(AuditEvent)) == 2


def test_creation_requires_verification_and_valid_principal_ceiling(
    client: TestClient, db: Session
) -> None:
    principal_id, headers = setup_principal(client, verified=False)
    path = f"/v1/principals/{principal_id}/agents"
    assert client.post(path, headers=headers, json=PAYLOAD).status_code == 409
    parent = db.get(Principal, UUID(principal_id))
    assert parent is not None
    parent.verification_status = "demo_verified"
    db.commit()
    for invalid in (
        {**PAYLOAD, "role": "seller"},
        {**PAYLOAD, "allowed_tools": ["execute_payment"]},
        {**PAYLOAD, "capabilities": ["approve_deal"]},
        {**PAYLOAD, "strategy_profile": "untrusted_strategy"},
    ):
        assert client.post(path, headers=headers, json=invalid).status_code == 422
    ceiling = deepcopy(parent.agent_authority)
    ceiling["buyer"]["capabilities"] = []
    parent.agent_authority = ceiling
    db.commit()
    assert client.post(path, headers=headers, json=PAYLOAD).status_code == 422
    assert db.scalar(select(func.count()).select_from(Agent)) == 0


def test_membership_and_csrf_cannot_be_bypassed(client: TestClient, db: Session) -> None:
    principal_id, headers = setup_principal(client)
    path = f"/v1/principals/{principal_id}/agents"
    assert client.post(path, headers={"Origin": ORIGIN}, json=PAYLOAD).status_code == 403
    membership = db.scalar(select(PrincipalMember))
    assert membership is not None
    membership.role = "viewer"
    db.commit()
    assert client.get(path).status_code == 200
    assert client.post(path, headers=headers, json=PAYLOAD).status_code == 403
    membership.status = "revoked"
    db.commit()
    assert client.get(path).status_code == 404


def test_pause_resume_rotation_and_revocation_enforce_current_identity(
    application: FastAPI, client: TestClient, db: Session
) -> None:
    principal_id, headers = setup_principal(client)
    created = client.post(f"/v1/principals/{principal_id}/agents", headers=headers, json=PAYLOAD)
    agent_id = UUID(created.json()["agent_id"])
    path = f"/v1/agents/{agent_id}"
    payload = b"test identity payload"
    settings = application.state.settings
    signature = sign_agent_payload(db, agent_id, payload, settings)
    assert verify_agent_payload(db, agent_id, 1, signature, payload)
    assert client.post(path + "/pause", headers=headers).json()["agent_status"] == "paused"
    with pytest.raises(AgentStateError):
        sign_agent_payload(db, agent_id, payload, settings)
    assert not verify_agent_payload(db, agent_id, 1, signature, payload)
    assert client.post(path + "/resume", headers=headers).status_code == 200
    rotated = client.post(path + "/keys/rotate", headers=headers)
    assert rotated.status_code == 200
    assert rotated.json()["signing_key"]["key_version"] == 2
    assert not verify_agent_payload(db, agent_id, 1, signature, payload)
    current = sign_agent_payload(db, agent_id, payload, settings)
    assert verify_agent_payload(db, agent_id, 2, current, payload)
    revoked = client.post(path + "/revoke", headers=headers)
    assert revoked.json()["agent_status"] == "revoked"
    assert revoked.json()["security"]["status"] == "restricted"
    assert not verify_agent_payload(db, agent_id, 2, current, payload)
    assert client.post(path + "/resume", headers=headers).status_code == 409
    assert client.post(path + "/keys/rotate", headers=headers).status_code == 409
    again = client.post(path + "/revoke", headers=headers)
    assert again.json()["passport_version"] == revoked.json()["passport_version"]
    keys = list(db.scalars(select(AgentKey).where(AgentKey.agent_id == agent_id)))
    assert len(keys) == 2 and all(key.status == "revoked" for key in keys)
    assert db.scalar(select(func.count()).select_from(AuditEvent)) == 5


def test_key_failure_rolls_back_agent_and_audit_records(
    application: FastAPI, client: TestClient, db: Session
) -> None:
    principal_id, headers = setup_principal(client)
    path = f"/v1/principals/{principal_id}/agents"
    application.state.settings.agent_key_encryption_secret = SecretStr("replace-me")
    assert client.post(path, headers=headers, json=PAYLOAD).status_code == 503
    application.state.settings.agent_key_encryption_secret = SecretStr(
        "synthetic-encryption-secret-for-test-only"
    )

    def reject_key(_mapper: Mapper[AgentKey], _connection: Connection, _target: AgentKey) -> None:
        raise RuntimeError("synthetic key persistence failure")

    event.listen(AgentKey, "before_insert", reject_key)
    try:
        assert client.post(path, headers=headers, json=PAYLOAD).status_code == 500
    finally:
        event.remove(AgentKey, "before_insert", reject_key)
    for model in (Agent, AgentKey, AuditEvent):
        assert db.scalar(select(func.count()).select_from(model)) == 0


def test_failed_rotation_keeps_old_identity_and_audit_unchanged(
    application: FastAPI, client: TestClient, db: Session
) -> None:
    principal_id, headers = setup_principal(client)
    response = client.post(f"/v1/principals/{principal_id}/agents", headers=headers, json=PAYLOAD)
    agent_id = UUID(response.json()["agent_id"])

    def reject_key(_mapper: Mapper[AgentKey], _connection: Connection, _target: AgentKey) -> None:
        raise RuntimeError("synthetic rotation failure")

    event.listen(AgentKey, "before_insert", reject_key)
    try:
        assert client.post(f"/v1/agents/{agent_id}/keys/rotate", headers=headers).status_code == 500
    finally:
        event.remove(AgentKey, "before_insert", reject_key)
    agent = db.get(Agent, agent_id)
    assert agent is not None and agent.current_key_version == agent.passport_version == 1
    assert db.scalar(select(func.count()).select_from(AgentKey)) == 1
    assert db.scalar(select(func.count()).select_from(AuditEvent)) == 1
    signature = sign_agent_payload(db, agent_id, b"still valid", application.state.settings)
    assert verify_agent_payload(db, agent_id, 1, signature, b"still valid")


def test_narrowing_principal_authority_invalidates_existing_agent(
    application: FastAPI, client: TestClient, db: Session
) -> None:
    principal_id, headers = setup_principal(client)
    created = client.post(f"/v1/principals/{principal_id}/agents", headers=headers, json=PAYLOAD)
    agent_id = UUID(created.json()["agent_id"])
    sign_agent_payload(db, agent_id, b"before policy change", application.state.settings)
    principal = db.get(Principal, UUID(principal_id))
    assert principal is not None
    ceiling = deepcopy(principal.agent_authority)
    ceiling["buyer"]["allowed_tools"] = []
    principal.agent_authority = ceiling
    db.commit()
    with pytest.raises(AgentStateError):
        sign_agent_payload(db, agent_id, b"after policy change", application.state.settings)
    passport = client.get(f"/v1/agents/{agent_id}/passport")
    assert passport.json()["security"]["status"] == "restricted"
    assert client.post(f"/v1/agents/{agent_id}/revoke", headers=headers).status_code == 200
