import os
from uuid import uuid4

import pytest  # type: ignore[import-not-found, unused-ignore]
from fastapi.testclient import TestClient
from sqlalchemy import inspect, text

from app.core.config import Settings
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
        } <= tables
    finally:
        engine.dispose()


def test_identity_flow_with_real_postgres() -> None:
    email = f"ci-{uuid4()}@example.com"
    origin = "http://localhost:3000"
    with TestClient(create_app(Settings(app_env="test"))) as client:
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
        assert client.get(f"/v1/principals/{principal_id}").status_code == 200
        assert (
            client.post(
                "/v1/auth/logout",
                headers={"Origin": origin, "X-CSRF-Token": csrf},
            ).status_code
            == 204
        )
