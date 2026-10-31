import os
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from uuid import UUID, uuid4

import pytest  # type: ignore[import-not-found, unused-ignore]
from fastapi.testclient import TestClient
from pydantic import SecretStr
from sqlalchemy import inspect, text, update
from sqlalchemy.exc import DBAPIError

from app.core.config import Settings
from app.db.models import AuditEvent
from app.db.session import create_database_engine
from app.main import create_app

pytestmark = pytest.mark.skipif(
    os.environ.get("RUN_POSTGRES_INTEGRATION") != "1",
    reason="Set RUN_POSTGRES_INTEGRATION=1 with the local PostgreSQL service running.",
)


def test_real_postgres_connection_and_schema() -> None:
    engine = create_database_engine(Settings())
    try:
        with engine.connect() as connection:
            assert connection.scalar(text("SELECT 1")) == 1
        tables = set(inspect(engine).get_table_names())
        assert {
            "alembic_version",
            "users",
            "user_sessions",
            "principals",
            "principal_members",
            "business_identifiers",
            "telegram_link_tokens",
            "telegram_links",
            "agents",
            "agent_keys",
            "events",
        } <= tables
    finally:
        engine.dispose()


def test_identity_flow_with_real_postgres() -> None:
    email = f"ci-{uuid4()}@example.com"
    origin = "http://localhost:3000"
    settings = Settings(
        app_env="test",
        telegram_bot_enabled=True,
        telegram_webhook_secret=SecretStr("synthetic-ci-telegram-secret-12345"),
        agent_key_encryption_secret=SecretStr("synthetic-ci-agent-encryption-secret-for-tests"),
    )
    with TestClient(create_app(settings)) as client:
        registered = client.post(
            "/v1/auth/register",
            json={"email": email, "password": "ci-not-a-real-password", "display_name": "CI"},
            headers={"Origin": origin},
        )
        assert registered.status_code == 201
        logged_in = client.post(
            "/v1/auth/login",
            json={"email": email, "password": "ci-not-a-real-password"},
            headers={"Origin": origin},
        )
        assert logged_in.status_code == 200
        csrf = logged_in.json()["csrf_token"]
        created = client.post(
            "/v1/principals",
            json={
                "legal_name": "Synthetic CI Business",
                "trade_name": "Synthetic CI",
                "business_type": "test",
                "address": "Synthetic CI address",
                "contact_email": email,
                "roles": ["buyer"],
            },
            headers={"Origin": origin, "X-CSRF-Token": csrf},
        )
        assert created.status_code == 201
        principal_id = created.json()["id"]
        headers = {"Origin": origin, "X-CSRF-Token": csrf}
        identifier = client.post(
            f"/v1/principals/{principal_id}/identifiers",
            json={"identifier_type": "gstin", "value": "SYNTHETICCI1234", "is_synthetic": True},
            headers=headers,
        )
        assert identifier.status_code == 201
        verified = client.post(f"/v1/principals/{principal_id}/verification/demo", headers=headers)
        assert verified.status_code == 200
        assert verified.json()["label"] == "SIMULATED / DEMO"
        principal = client.get(f"/v1/principals/{principal_id}")
        assert principal.json()["verification_status"] == "demo_verified"
        agent = client.post(
            f"/v1/principals/{principal_id}/agents",
            headers=headers,
            json={
                "name": "CI buyer",
                "role": "buyer",
                "capabilities": ["request_quote"],
                "allowed_tools": ["marketplace_search"],
            },
        )
        assert agent.status_code == 201
        agent_id = agent.json()["agent_id"]
        assert "private" not in agent.text
        assert client.get(f"/v1/agents/{agent_id}/passport").status_code == 200
        rotated = client.post(f"/v1/agents/{agent_id}/keys/rotate", headers=headers)
        assert rotated.status_code == 200
        assert rotated.json()["signing_key"]["key_version"] == 2
        session_token = client.cookies.get("vanik_session")
        assert session_token is not None
        rotation_barrier = Barrier(2)

        def rotate_concurrently() -> int:
            with TestClient(create_app(settings)) as parallel:
                rotation_barrier.wait(timeout=10)
                result = parallel.post(
                    f"/v1/agents/{agent_id}/keys/rotate",
                    headers={**headers, "Cookie": f"vanik_session={session_token}"},
                )
                assert result.status_code == 200
                return int(result.json()["signing_key"]["key_version"])

        with ThreadPoolExecutor(max_workers=2) as workers:
            versions = list(workers.map(lambda _: rotate_concurrently(), range(2)))
        assert sorted(versions) == [3, 4]
        assert client.post(f"/v1/agents/{agent_id}/revoke", headers=headers).status_code == 200
        engine = create_database_engine(settings)
        try:
            with engine.connect() as connection:
                with pytest.raises(DBAPIError):
                    with connection.begin_nested():
                        connection.execute(
                            update(AuditEvent)
                            .where(AuditEvent.entity_id == UUID(agent_id))
                            .values(event_type="tampered")
                        )
        finally:
            engine.dispose()
        link_start = client.post(
            "/v1/telegram/link/start", headers={"Origin": origin, "X-CSRF-Token": csrf}
        )
        assert link_start.status_code == 200
        linked = client.post(
            "/v1/telegram/link/complete",
            json={"link_code": link_start.json()["link_code"], "telegram_user_id": "987654321"},
            headers={"X-Telegram-Bot-Secret": "synthetic-ci-telegram-secret-12345"},
        )
        assert linked.status_code == 200
        assert (
            client.post(
                "/v1/auth/logout",
                headers={"Origin": origin, "X-CSRF-Token": csrf},
            ).status_code
            == 204
        )
